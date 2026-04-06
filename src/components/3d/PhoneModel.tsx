"use client";

import { useEffect } from "react";
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

  useEffect(() => {
    texture.flipY = false;
    texture.colorSpace = THREE.SRGBColorSpace;

    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material as THREE.MeshStandardMaterial;
        if (mat.name === "screen.001") {
          mat.map = texture;
          mat.needsUpdate = true;
        }
      }
    });
  }, [scene, texture]);

  // Phone screen faces -X by default, rotate +90° Y to face camera (+Z).
  // Scale down slightly so it doesn't fill the entire panel height.
  return (
    <group rotation={[tiltX, rotationY, 0]}>
      <group rotation={[0, Math.PI / 2, 0]} scale={0.85}>
        <primitive object={scene} />
      </group>
    </group>
  );
}

useGLTF.preload("/models/iphone.glb");
