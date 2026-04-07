"use client";

import { Suspense, useRef, useCallback, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import type { DeviceType } from "@/data/projects";
import { PhoneModel } from "./PhoneModel";
import { LaptopModel } from "./LaptopModel";
import * as THREE from "three";

interface DeviceSceneProps {
  deviceType: DeviceType;
  screenTexture: string;
  scrollProgress: number;
  isActive: boolean;
  projectSlug: string;
}

/** Inner component that drives animation via useFrame */
function AnimatedDevice({
  deviceType,
  screenTexture,
  scrollProgress,
  isActive,
  projectSlug,
  tiltTargetX,
  tiltTargetY,
}: DeviceSceneProps & { tiltTargetX: React.RefObject<number>; tiltTargetY: React.RefObject<number> }) {
  const prefersReduced = useReducedMotion();
  const rotationRef = useRef(0.785); // Start at ~45°
  const floatRef = useRef(0);
  const smoothTiltX = useRef(0);
  const smoothTiltY = useRef(0);
  const groupRef = useRef<THREE.Group>(null);
  const prevSlugRef = useRef(projectSlug);
  const prevDeviceTypeRef = useRef(deviceType);
  const { invalidate } = useThree();

  // Kick the first frame after Suspense resolves and the model mounts
  useEffect(() => {
    invalidate();
  }, [invalidate]);

  // Reset rotation only when device type changes (phone ↔ laptop).
  // Same device type: just swap texture, keep current rotation.
  useEffect(() => {
    if (prevSlugRef.current !== projectSlug) {
      if (prevDeviceTypeRef.current !== deviceType) {
        rotationRef.current = 0.785; // Reset to ~45° for entrance
      }
      prevSlugRef.current = projectSlug;
      prevDeviceTypeRef.current = deviceType;
      invalidate();
    }
  }, [projectSlug, deviceType, invalidate]);

  useFrame((_, rawDelta) => {
    if (!groupRef.current) return;

    if (prefersReduced) {
      groupRef.current.rotation.set(0, 0, 0);
      groupRef.current.position.y = 0;
      return;
    }

    // Cap delta to prevent instant snap after Suspense or tab-switch
    const delta = Math.min(rawDelta, 0.033);

    // Smoothly lerp tilt toward target (6 = responsiveness factor)
    const lerpSpeed = delta * 6;
    smoothTiltX.current += (tiltTargetX.current - smoothTiltX.current) * lerpSpeed;
    smoothTiltY.current += (tiltTargetY.current - smoothTiltY.current) * lerpSpeed;

    // Scroll-driven rotation: ~45° → ~5° when active
    const targetRotation = isActive ? 0.09 : 0.785;
    const prevRotation = rotationRef.current;
    rotationRef.current +=
      (targetRotation - rotationRef.current) * delta * 4;

    // Apply scroll-driven Y rotation + smoothed hover tilt
    groupRef.current.rotation.set(
      smoothTiltX.current * 0.05,
      rotationRef.current + smoothTiltY.current * 0.05,
      0
    );

    // Subtle idle float when active
    if (isActive) {
      floatRef.current += delta * 0.8;
      groupRef.current.position.y = Math.sin(floatRef.current) * 0.02;
    } else {
      groupRef.current.position.y = 0;
    }

    // Re-render while animating, tilt is settling, or active (for float)
    const isRotating = Math.abs(rotationRef.current - prevRotation) > 0.0001;
    const isTiltSettling =
      Math.abs(smoothTiltX.current - tiltTargetX.current) > 0.001 ||
      Math.abs(smoothTiltY.current - tiltTargetY.current) > 0.001;
    if (isRotating || isTiltSettling || isActive) {
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
  projectSlug,
}: DeviceSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tiltTargetX = useRef(0);
  const tiltTargetY = useRef(0);
  const canvasRef = useRef<{ invalidate: () => void } | null>(null);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      tiltTargetX.current = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      tiltTargetY.current = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      // Kick a frame so useFrame picks up the new target
      canvasRef.current?.invalidate();
    },
    []
  );

  const handlePointerLeave = useCallback(() => {
    tiltTargetX.current = 0;
    tiltTargetY.current = 0;
    canvasRef.current?.invalidate();
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
        onCreated={(state) => {
          canvasRef.current = { invalidate: state.invalidate };
        }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 3, 5]} intensity={0.8} />

        <Suspense fallback={null}>
          <AnimatedDevice
            deviceType={deviceType}
            screenTexture={screenTexture}
            scrollProgress={scrollProgress}
            isActive={isActive}
            projectSlug={projectSlug}
            tiltTargetX={tiltTargetX}
            tiltTargetY={tiltTargetY}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
