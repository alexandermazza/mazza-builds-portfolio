"use client";

import { useRef, useEffect } from "react";
import { useGLTF, useTexture } from "@react-three/drei";
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
  const texture = useTexture(screenTexture);
  const groupRef = useRef<THREE.Group>(null);

  // Apply screenshot texture to the screen mesh
  useEffect(() => {
    texture.flipY = false;
    texture.colorSpace = THREE.SRGBColorSpace;

    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material as THREE.MeshStandardMaterial;
        // Match by material name since Three.js may sanitize mesh names
        if (mat.name === "screen.001") {
          mat.map = texture;
          mat.needsUpdate = true;
        }
      }
    });
  }, [scene, texture]);

  return (
    <group ref={groupRef} rotation={[tiltX, rotationY, 0]}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload("/models/iphone.glb");
