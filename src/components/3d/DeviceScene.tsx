"use client";

import { Suspense, useRef, useState, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import type { DeviceType } from "@/data/projects";
import { PhoneModel } from "./PhoneModel";
import { LaptopModel } from "./LaptopModel";
import * as THREE from "three";

interface DeviceSceneProps {
  deviceType: DeviceType;
  screenTexture: string;
  scrollProgress: number; // 0-1 within this project's scroll slot
  isActive: boolean;
}

/** Inner component that drives animation via useFrame */
function AnimatedDevice({
  deviceType,
  screenTexture,
  scrollProgress,
  isActive,
  tiltX,
  tiltY,
}: DeviceSceneProps & { tiltX: number; tiltY: number }) {
  const prefersReduced = useReducedMotion();
  const rotationRef = useRef(0.785); // Start at ~45°
  const floatRef = useRef(0);
  const groupRef = useRef<THREE.Group>(null);
  const { invalidate } = useThree();

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    if (prefersReduced) {
      groupRef.current.rotation.set(0, 0, 0);
      groupRef.current.position.y = 0;
      return;
    }

    // Scroll-driven rotation: ~45° → ~5° as project becomes active
    const targetRotation = isActive ? 0.09 : 0.785; // ~5° and ~45°
    const prev = rotationRef.current;
    rotationRef.current +=
      (targetRotation - rotationRef.current) * Math.min(delta * 4, 1);

    // Apply scroll-driven Y rotation + hover tilt imperatively
    groupRef.current.rotation.set(
      tiltX * 0.05,
      rotationRef.current + tiltY * 0.05,
      0
    );

    // Subtle idle float when active
    if (isActive) {
      floatRef.current += delta * 0.8;
      groupRef.current.position.y = Math.sin(floatRef.current) * 0.02;
    } else {
      groupRef.current.position.y = 0;
    }

    // Only request re-render when animating
    const isAnimating = Math.abs(rotationRef.current - prev) > 0.0001;
    if (isAnimating || isActive) {
      invalidate();
    }
  });

  const ModelComponent = deviceType === "phone" ? PhoneModel : LaptopModel;

  return (
    <group ref={groupRef}>
      <ModelComponent
        screenTexture={screenTexture}
        rotationY={0}
        tiltX={0}
        tiltY={0}
      />
    </group>
  );
}

export function DeviceScene({
  deviceType,
  screenTexture,
  scrollProgress,
  isActive,
}: DeviceSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientY - rect.top) / rect.height - 0.5) * 2; // -1 to 1
      const y = ((e.clientX - rect.left) / rect.width - 0.5) * 2; // -1 to 1
      setTilt({ x, y });
    },
    []
  );

  const handlePointerLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
  }, []);

  // Camera distance — phone is taller/narrower, laptop is wider
  const cameraZ = deviceType === "phone" ? 3 : 3.5;
  const cameraFov = deviceType === "phone" ? 40 : 35;

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <Canvas
        frameloop="demand"
        camera={{ position: [0, 0, cameraZ], fov: cameraFov }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: "transparent" }}
      >
        {/* Minimal flat lighting — matches Nothing aesthetic */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 3, 5]} intensity={0.8} />

        <Suspense fallback={null}>
          <AnimatedDevice
            deviceType={deviceType}
            screenTexture={screenTexture}
            scrollProgress={scrollProgress}
            isActive={isActive}
            tiltX={tilt.x}
            tiltY={tilt.y}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
