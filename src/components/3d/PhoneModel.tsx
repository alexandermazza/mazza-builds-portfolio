"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const VIDEO_EXTENSIONS = [".mp4", ".webm"];

function isVideoSrc(src: string) {
  return VIDEO_EXTENSIONS.some((ext) => src.toLowerCase().endsWith(ext));
}

interface PhoneModelProps {
  screenTexture: string;
  rotationY: number;
  tiltX: number;
  tiltY: number;
  visible?: boolean;
}

export function PhoneModel({
  screenTexture,
  rotationY,
  tiltX,
  tiltY,
  visible = true,
}: PhoneModelProps) {
  const { scene } = useGLTF("/models/iphone.glb");
  // Clone so multiple instances don't fight over the same Three.js object.
  // Also center the scene at origin — the GLB pivot may not be at the phone's
  // geometric center, which would make it render off-center in the canvas.
  const clonedScene = useMemo(() => {
    const cloned = scene.clone(true);
    const box = new THREE.Box3().setFromObject(cloned);
    const center = box.getCenter(new THREE.Vector3());
    cloned.position.sub(center);
    return cloned;
  }, [scene]);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Load texture — image or video
  useEffect(() => {
    let cancelled = false;
    // Clear old texture immediately so stale screens don't persist
    setTexture(null);

    if (isVideoSrc(screenTexture)) {
      const video = document.createElement("video");
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.setAttribute("playsinline", "");
      video.setAttribute("muted", "");
      videoRef.current = video;

      const onReady = () => {
        if (cancelled) return;
        const tex = new THREE.VideoTexture(video);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.generateMipmaps = false;
        setTexture(tex);
        video.play().catch(() => {});
      };

      video.addEventListener("canplay", onReady, { once: true });
      video.src = screenTexture;
      video.load();

      return () => {
        cancelled = true;
        video.removeEventListener("canplay", onReady);
        video.pause();
        video.removeAttribute("src");
        video.load();
        videoRef.current = null;
        // Dispose the texture to free GPU memory
        setTexture((prev) => { prev?.dispose(); return null; });
      };
    } else {
      videoRef.current = null;
      const loader = new THREE.TextureLoader();
      loader.load(screenTexture, (tex) => {
        if (cancelled) return;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        setTexture(tex);
      });
      return () => {
        cancelled = true;
        // Dispose the texture to free GPU memory
        setTexture((prev) => { prev?.dispose(); return null; });
      };
    }
  }, [screenTexture]);

  // Keep video texture updating every frame
  useFrame((state) => {
    if (visible && videoRef.current && texture) {
      texture.needsUpdate = true;
      state.invalidate();
    }
  });

  // Apply texture to screen mesh (or clear it)
  useEffect(() => {
    clonedScene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material as THREE.MeshStandardMaterial;
        if (mat.name === "screen.001") {
          mat.map = texture;
          mat.needsUpdate = true;
        }
      }
    });
  }, [clonedScene, texture]);

  return (
    <group rotation={[tiltX, rotationY, 0]}>
      <group rotation={[0, Math.PI / 2, 0]} scale={0.85}>
        <primitive object={clonedScene} />
      </group>
    </group>
  );
}

useGLTF.preload("/models/iphone.glb");
