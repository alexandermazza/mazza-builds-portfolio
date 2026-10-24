import { test } from "node:test";
import assert from "node:assert/strict";
import { PerspectiveCamera, Scene, Vector2, type WebGLRenderer } from "three";
import { createGlowComposer } from "./glow.ts";

// the composer only reads size and pixel ratio until it renders, so no GL context is needed
const renderer = {
  getPixelRatio: () => 1,
  getSize: (v: Vector2) => v.set(300, 150),
} as unknown as WebGLRenderer;

test("chains render, bloom, output and clip passes with the projects defaults", () => {
  const composer = createGlowComposer(renderer, new Scene(), new PerspectiveCamera());
  const names = composer.passes.map((p) => p.constructor.name);
  assert.deepEqual(names, ["RenderPass", "UnrealBloomPass", "OutputPass", "ShaderPass"]);
  const bloom = composer.passes[1] as unknown as { strength: number; radius: number; threshold: number; compositeMaterial: { uniforms: { bloomFactors: { value: number[] } } } };
  assert.deepEqual([bloom.strength, bloom.radius, bloom.threshold], [0.6, 0.18, 0.32]);
  assert.deepEqual(bloom.compositeMaterial.uniforms.bloomFactors.value, [1, 0.75, 0.4, 0, 0]);
  const clip = composer.passes[3] as unknown as { material: { fragmentShader: string } };
  assert.match(clip.material.fragmentShader, /max\(c - 0\.04, 0\.0\) \/ 0\.96/);
  assert.doesNotMatch(clip.material.fragmentShader, /smoothstep/);
});

test("the composite still adds 3 x strength, which the tint scale divides out", () => {
  const composer = createGlowComposer(renderer, new Scene(), new PerspectiveCamera());
  const bloom = composer.passes[1] as unknown as { compositeMaterial: { fragmentShader: string } };
  // a three upgrade that changes this formula would silently skew the 0.160 gain
  assert.match(bloom.compositeMaterial.fragmentShader, /vec3 bloom = 3\.0 \* bloomStrength \* \(/);
});

test("edgeFade fades the clip pass toward the edges and options override the bloom", () => {
  const composer = createGlowComposer(renderer, new Scene(), new PerspectiveCamera(), {
    strength: 0.45,
    radius: 0.18,
    threshold: 0.34,
    edgeFade: true,
  });
  const bloom = composer.passes[1] as unknown as { strength: number; threshold: number };
  assert.deepEqual([bloom.strength, bloom.threshold], [0.45, 0.34]);
  const clip = composer.passes[3] as unknown as { material: { fragmentShader: string } };
  assert.match(clip.material.fragmentShader, /smoothstep\(0\.0, 0\.16, vUv\) \* smoothstep\(1\.0, 0\.84, vUv\)/);
});

test("glows like three 0.160, which the mockups were tuned on", () => {
  const composer = createGlowComposer(renderer, new Scene(), new PerspectiveCamera(), { strength: 0.45, radius: 0.18 });
  const bloom = composer.passes[1] as unknown as {
    separableBlurMaterials: { defines: { KERNEL_RADIUS: number }; uniforms: { gaussianCoefficients: { value: number[] } } }[];
    bloomTintColors: { x: number; y: number; z: number }[];
  };
  // 0.160 blurred with kernels 3 to 11 at sigma = radius and divided by the weights it sampled
  assert.deepEqual(bloom.separableBlurMaterials.map((m) => m.defines.KERNEL_RADIUS), [3, 5, 7, 9, 11]);
  for (const m of bloom.separableBlurMaterials) {
    const r = m.defines.KERNEL_RADIUS;
    const w = m.uniforms.gaussianCoefficients.value;
    assert.equal(w.length, r);
    assert.ok(Math.abs(w[0] + 2 * w.slice(1).reduce((s, v) => s + v, 0) - 1) < 1e-9, `kernel ${r} sums to 1`);
    assert.ok(Math.abs(w[1] / w[0] - Math.exp(-0.5 / (r * r))) < 1e-9, `kernel ${r} has sigma ${r}`);
  }
  // and added the composite weighted by its own alpha, strength * the lerped factors, where 0.183 adds 3 * strength
  const lerped = [1, 0.75, 0.4, 0, 0].reduce((s, f) => s + f + (1.2 - 2 * f) * 0.18, 0);
  for (const c of bloom.bloomTintColors) {
    for (const v of [c.x, c.y, c.z]) assert.ok(Math.abs(v - (0.45 * lerped) / 3) < 1e-9);
  }
});

test("dispose frees every pass as well as the composer's targets", () => {
  const composer = createGlowComposer(renderer, new Scene(), new PerspectiveCamera());
  let freed = 0;
  for (const pass of composer.passes) {
    const own = pass.dispose.bind(pass);
    pass.dispose = () => {
      freed++;
      own();
    };
  }
  composer.dispose();
  assert.equal(freed, 4);
});
