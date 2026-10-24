import { Vector2, type Camera, type Scene, type WebGLRenderer } from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

const VERTEX = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";
const CLIP = "uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb; gl_FragColor = vec4(max(c - 0.04, 0.0) / 0.96, 1.0); }";
// fading out toward the canvas edges keeps a streak that leaves the canvas from ending in a hard line
const CLIP_EDGE_FADE = "uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb; vec2 e = smoothstep(0.0, 0.16, vUv) * smoothstep(1.0, 0.84, vUv); gl_FragColor = vec4(max(c - 0.04, 0.0) / 0.96 * e.x * e.y, 1.0); }";

/**
 * The shared particle glow: a tight bloom, then the faintest light clipped to black.
 * Canvases are screen-blended over coloured pages, where even a 2% tail shows as a grey box.
 * Defaults are the projects sky's values. dispose() also frees every pass.
 */
export function createGlowComposer(
  renderer: WebGLRenderer,
  scene: Scene,
  camera: Camera,
  { strength = 0.6, radius = 0.18, threshold = 0.32, edgeFade = false }: { strength?: number; radius?: number; threshold?: number; edgeFade?: boolean } = {},
): EffectComposer {
  const composer = new EffectComposer(renderer);
  const bloom = new UnrealBloomPass(new Vector2(256, 256), strength, radius, threshold);
  // only the tight glow layers: the widest ones leave a faint grey box on a coloured page
  bloom.compositeMaterial.uniforms.bloomFactors.value = [1.0, 0.75, 0.4, 0.0, 0.0];
  // the mockups were tuned on three r0.160, whose bloom added strength x its unclamped alpha (strength x the
  // summed mip factors); r0.180+ adds 3 x strength, about twice as bright here, and the grey box comes back
  const factors = [0, 1, 2, 3, 4].map((i) => `lerpBloomFactor( bloomFactors[ ${i} ] )`).join(" + ");
  bloom.compositeMaterial.fragmentShader = bloom.compositeMaterial.fragmentShader.replace(
    "3.0 * bloomStrength *",
    `bloomStrength * bloomStrength * ( ${factors} ) *`,
  );
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  composer.addPass(
    new ShaderPass({ uniforms: { tDiffuse: { value: null } }, vertexShader: VERTEX, fragmentShader: edgeFade ? CLIP_EDGE_FADE : CLIP }),
  );

  // EffectComposer.dispose() frees only its own targets; the bloom targets and materials live on the passes
  const disposeTargets = composer.dispose.bind(composer);
  composer.dispose = () => {
    for (const pass of composer.passes) pass.dispose();
    disposeTargets();
  };
  return composer;
}
