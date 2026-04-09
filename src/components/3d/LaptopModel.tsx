"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const VIDEO_EXTENSIONS = [".mp4", ".webm"];

function isVideoSrc(src: string) {
  return VIDEO_EXTENSIONS.some((ext) => src.toLowerCase().endsWith(ext));
}

interface LaptopModelProps {
  screenTexture: string;
  rotationY: number;
  tiltX: number;
  tiltY: number;
  visible?: boolean;
}

export function LaptopModel({
  screenTexture,
  rotationY,
  tiltX,
  tiltY,
  visible = true,
}: LaptopModelProps) {
  const { scene } = useGLTF("/models/macbook.glb");
  // Clone so multiple instances don't fight over the same Three.js object
  const clonedScene = useMemo(() => scene.clone(true), [scene]);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Load texture — image or video
  useEffect(() => {
    let cancelled = false;
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
        if (mat.name === "sfCQkHOWyrsLmor") {
          mat.emissiveMap = texture;
          mat.emissive = new THREE.Color(1, 1, 1);
          mat.emissiveIntensity = texture ? 1 : 0;
          mat.needsUpdate = true;
        }
      }
    });
  }, [clonedScene, texture]);

  return (
    <group rotation={[tiltX, rotationY, 0]}>
      <group scale={0.04} position={[0, -0.3, 0]}>
        <primitive object={clonedScene} />
      </group>
    </group>
  );
}

useGLTF.preload("/models/macbook.glb");
