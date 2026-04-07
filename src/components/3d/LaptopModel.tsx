"use client";

import { useState, useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

interface LaptopModelProps {
  screenTexture: string;
  rotationY: number;
  tiltX: number;
  tiltY: number;
}

export function LaptopModel({
  screenTexture,
  rotationY,
  tiltX,
  tiltY,
}: LaptopModelProps) {
  const { scene } = useGLTF("/models/macbook.glb");
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
        if (mat.name === "sfCQkHOWyrsLmor") {
          mat.emissiveMap = texture;
          mat.emissive = new THREE.Color(1, 1, 1);
          mat.emissiveIntensity = 1;
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
