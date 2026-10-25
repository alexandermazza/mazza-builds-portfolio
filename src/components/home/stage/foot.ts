import { AdditiveBlending, DoubleSide, Mesh, PerspectiveCamera, PlaneGeometry, Scene, ShaderMaterial } from "three";
import { AMBER, INK, type Ctx, type Piece } from "./gpgpu";

/* FOOTER: contour lines over a slowly rolling field */
export function footPiece(ctx: Ctx): Piece {
  const scene = new Scene(), camera = new PerspectiveCamera(40, 1, 0.5, 2000);
  const geo = new PlaneGeometry(760, 440, ctx.small ? 190 : 320, ctx.small ? 110 : 190).rotateX(-Math.PI / 2);
  const u = { uTime: { value: 0 }, uAmber: { value: AMBER }, uInk: { value: INK } };
  const mat = new ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide,
    vertexShader: `uniform float uTime; varying float vH; varying float vZ;
      float hgt(vec2 p, float t){ return 15.0 * sin(p.x * 0.011 + t * 0.07) * cos(p.y * 0.016 - t * 0.05) + 8.0 * sin(p.x * 0.029 - p.y * 0.021 + t * 0.11) + 4.0 * sin(length(p) * 0.037 - t * 0.2); }
      void main(){ vec3 p = position; p.y = hgt(p.xz, uTime); vH = p.y; vec4 mv = modelViewMatrix * vec4(p, 1.0); vZ = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uAmber, uInk; varying float vH; varying float vZ;
      void main(){ float s = vH / 2.1; float f = fract(s); float w = fwidth(s) * 1.25;
        float line = 1.0 - smoothstep(0.0, w, min(f, 1.0 - f)); float major = 1.0 - step(0.5, mod(floor(s + 0.5), 5.0));
        vec3 c = mix(uInk * 0.5, uAmber * 1.7, major); float fog = 1.0 - smoothstep(140.0, 430.0, vZ);
        gl_FragColor = vec4(c * line * fog, 1.0); }`,
  });
  const mesh = new Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.position.z = -120;
  scene.add(mesh);
  return {
    scene, camera, bloom: [0.45, 0.3, 1.0],
    resize() {
      camera.aspect = ctx.size.w / ctx.size.h;
      camera.fov = ctx.narrow() ? 56 : 40;
      camera.clearViewOffset();
      camera.updateProjectionMatrix();
    },
    update(t) {
      u.uTime.value = t;
      camera.position.set(Math.sin(t * 0.03) * 30, 46, 80);
      camera.lookAt(0, 0, -110);
    },
    dispose() {
      geo.dispose();
      mat.dispose();
    },
  };
}
