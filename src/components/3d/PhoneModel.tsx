"use client";

import { useState, useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

interface PhoneModelProps {
  screenTexture: string;
  rotationY: number;
  tiltX: number;
  tiltY: number;
}

export function PhoneModel({
  screenTexture,
  rotationY,
  tiltX,
  tiltY,
}: PhoneModelProps) {
  const { scene } = useGLTF("/models/iphone.glb");
  // Clone so multiple instances don't fight over the same Three.js object
  const clonedScene = useMemo(() => scene.clone(true), [scene]);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  // Load texture manually — no Suspense, model appears immediately
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load(screenTexture, (tex) => {
      tex.flipY = false;
      tex.colorSpace = THREE.SRGBColorSpace;
      setTexture(tex);
    });
  }, [screenTexture]);

  // Apply texture to screen mesh when ready
  useEffect(() => {
    if (!texture) return;
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
