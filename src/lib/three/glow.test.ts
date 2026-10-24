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
