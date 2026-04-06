"use client";

import { useRef, useEffect } from "react";
import { useGLTF, useTexture } from "@react-three/drei";
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
  const texture = useTexture(screenTexture);
  const groupRef = useRef<THREE.Group>(null);

  // Apply screenshot texture to the screen mesh
  useEffect(() => {
    texture.flipY = false;
    texture.colorSpace = THREE.SRGBColorSpace;

    scene.traverse((child) => {
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
  }, [scene, texture]);

  return (
    <group ref={groupRef} rotation={[tiltX, rotationY, 0]}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload("/models/macbook.glb");
