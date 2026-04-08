"use client";

import { Suspense, useRef, useState, useCallback, useEffect, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import type { DeviceType } from "@/data/projects";
import { useTransitionContext } from "@/transitions";
import { PhoneModel } from "./PhoneModel";
import { LaptopModel } from "./LaptopModel";
import * as THREE from "three";

const VIDEO_EXTENSIONS = [".mp4", ".webm"];

function isVideoSrc(src: string) {
  return VIDEO_EXTENSIONS.some((ext) => src.toLowerCase().endsWith(ext));
}

interface DeviceSceneProps {
  deviceType: DeviceType;
  screenTexture: string;
  scrollProgress: number;
  isActive: boolean;
  projectSlug: string;
  modelScale?: number;
}

/** Smoothly lerps camera position and FOV when device type changes */
function CameraAnimator({ deviceType }: { deviceType: DeviceType }) {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const { invalidate } = useThree();

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.033);
    const targetZ = deviceType === "phone" ? 3 : 3.5;
    const targetFov = deviceType === "phone" ? 40 : 35;
    const speed = delta * 4;

    const prevZ = camera.position.z;
    const prevFov = camera.fov;

    camera.position.z += (targetZ - camera.position.z) * speed;
    camera.fov += (targetFov - camera.fov) * speed;

    if (
      Math.abs(camera.position.z - prevZ) > 0.0001 ||
      Math.abs(camera.fov - prevFov) > 0.001
    ) {
      camera.updateProjectionMatrix();
      invalidate();
    }
  });

  return null;
}

/** Inner component that drives animation via useFrame — renders both device
 *  models and cross-fades between them so device type transitions are smooth */
function AnimatedDevice({
  deviceType,
  screenTexture,
  scrollProgress,
  isActive,
  projectSlug,
  tiltTargetX,
  tiltTargetY,
  modelScale = 1,
  isTransitioningRef,
}: DeviceSceneProps & { tiltTargetX: React.RefObject<number>; tiltTargetY: React.RefObject<number>; modelScale?: number; isTransitioningRef: React.RefObject<boolean> }) {
  const prefersReduced = useReducedMotion();
  const rotationRef = useRef(Math.PI / 2); // Start edge-on at 90°
  const scaleRef = useRef(0.75); // Scale entrance 0.75 → 1.0
  const floatRef = useRef(0);
  const smoothTiltX = useRef(0);
  const smoothTiltY = useRef(0);
  const groupRef = useRef<THREE.Group>(null);
  const phoneGroupRef = useRef<THREE.Group>(null);
  const laptopGroupRef = useRef<THREE.Group>(null);
  const { invalidate } = useThree();

  // Transition progress: 1 = visible at y=0, 0 = off-screen
  const phoneProgressRef = useRef(deviceType === "phone" ? 1 : 0);
  const laptopProgressRef = useRef(deviceType === "laptop" ? 1 : 0);

  // Always keep both device textures in sync with the current screen —
  // prevents the departing device from flashing a stale texture
  const [phoneTexture, setPhoneTexture] = useState(
    deviceType === "phone" ? screenTexture : ""
  );
  const [laptopTexture, setLaptopTexture] = useState(
    deviceType === "laptop" ? screenTexture : ""
  );

  useEffect(() => {
    if (deviceType === "phone") setPhoneTexture(screenTexture);
    else setLaptopTexture(screenTexture);
  }, [deviceType, screenTexture]);

  // When device type switches, clear the departing device's texture
  // so it doesn't flash stale content during the slide-out
  const prevDeviceType = useRef(deviceType);
  useEffect(() => {
    if (prevDeviceType.current !== deviceType) {
      if (prevDeviceType.current === "phone") setPhoneTexture("");
      else setLaptopTexture("");
      prevDeviceType.current = deviceType;
    }
  }, [deviceType]);

  // Kick the first frame after Suspense resolves and the model mounts
  useEffect(() => {
    invalidate();
  }, [invalidate]);

  useFrame((_, rawDelta) => {
    if (!groupRef.current) return;
    if (isTransitioningRef.current) return;

    if (prefersReduced) {
      groupRef.current.rotation.set(0, 0, 0);
      groupRef.current.position.y = 0;
      groupRef.current.scale.setScalar(modelScale); // ensure full scale instantly
      // Instant swap for reduced-motion
      if (phoneGroupRef.current) {
        phoneGroupRef.current.position.y = deviceType === "phone" ? 0 : -2;
        phoneGroupRef.current.visible = deviceType === "phone";
      }
      if (laptopGroupRef.current) {
        laptopGroupRef.current.position.y = deviceType === "laptop" ? 0 : 2;
        laptopGroupRef.current.visible = deviceType === "laptop";
      }
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

    // Scale entrance: lerp 0.75 → modelScale
    scaleRef.current += (1.0 - scaleRef.current) * delta * 4;
    groupRef.current.scale.setScalar(scaleRef.current * modelScale);

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

    // Vertical slide transition — old device exits up, new enters from below
    const phoneTarget = deviceType === "phone" ? 1 : 0;
    const laptopTarget = deviceType === "laptop" ? 1 : 0;
    const slideSpeed = delta * 12;

    phoneProgressRef.current += (phoneTarget - phoneProgressRef.current) * slideSpeed;
    laptopProgressRef.current += (laptopTarget - laptopProgressRef.current) * slideSpeed;

    // Snap to target when close enough to avoid lingering visibility
    if (Math.abs(phoneProgressRef.current - phoneTarget) < 0.05) phoneProgressRef.current = phoneTarget;
    if (Math.abs(laptopProgressRef.current - laptopTarget) < 0.05) laptopProgressRef.current = laptopTarget;

    if (phoneGroupRef.current) {
      const p = phoneProgressRef.current;
      phoneGroupRef.current.position.y = (1 - p) * 2;
      phoneGroupRef.current.visible = p > 0.05;
    }
    if (laptopGroupRef.current) {
      const p = laptopProgressRef.current;
      laptopGroupRef.current.position.y = (1 - p) * -2;
      laptopGroupRef.current.visible = p > 0.05;
    }

    // Re-render while animating, tilt is settling, or active (for float)
    const isRotating = Math.abs(rotationRef.current - prevRotation) > 0.0001;
    const isTiltSettling =
      Math.abs(smoothTiltX.current - tiltTargetX.current) > 0.001 ||
      Math.abs(smoothTiltY.current - tiltTargetY.current) > 0.001;
    const isSliding =
      Math.abs(phoneProgressRef.current - phoneTarget) > 0.01 ||
      Math.abs(laptopProgressRef.current - laptopTarget) > 0.01;
    if (isRotating || isTiltSettling || isSliding || isActive) {
      invalidate();
    }
  });

  return (
    <group ref={groupRef}>
      <group ref={phoneGroupRef}>
        {phoneTexture && (
          <PhoneModel screenTexture={phoneTexture} rotationY={0} tiltX={0} tiltY={0} />
        )}
      </group>
      <group ref={laptopGroupRef}>
        {laptopTexture && (
          <LaptopModel screenTexture={laptopTexture} rotationY={0} tiltX={0} tiltY={0} />
        )}
      </group>
    </group>
  );
}

export function DeviceScene({
  deviceType,
  screenTexture,
  scrollProgress,
  isActive,
  projectSlug,
  modelScale = 1,
}: DeviceSceneProps) {
  const { isTransitioning } = useTransitionContext();
  const isTransitioningRef = useRef(isTransitioning);
  isTransitioningRef.current = isTransitioning;

  const containerRef = useRef<HTMLDivElement>(null);
  const tiltTargetX = useRef(0);
  const tiltTargetY = useRef(0);
  const canvasRef = useRef<{ invalidate: () => void } | null>(null);
  const initialDeviceType = useRef(deviceType);

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

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <Canvas
        frameloop={isVideoSrc(screenTexture) ? "always" : "demand"}
        camera={{
          position: [0, 0, initialDeviceType.current === "phone" ? 3 : 3.5],
          fov: initialDeviceType.current === "phone" ? 40 : 35,
        }}
        gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
        style={{ background: "transparent" }}
        onCreated={(state) => {
          canvasRef.current = { invalidate: state.invalidate };
        }}
      >
        {/* 3-point lighting: key, fill, rim */}
        <ambientLight intensity={0.8} />
        <directionalLight position={[2, 3, 5]} intensity={1.0} />
        <directionalLight position={[-3, 1, 2]} intensity={0.4} />
        <directionalLight position={[0, 2, -3]} intensity={0.6} />
        <CameraAnimator deviceType={deviceType} />

        <Suspense fallback={null}>
          <AnimatedDevice
            deviceType={deviceType}
            screenTexture={screenTexture}
            scrollProgress={scrollProgress}
            isActive={isActive}
            projectSlug={projectSlug}
            tiltTargetX={tiltTargetX}
            tiltTargetY={tiltTargetY}
            modelScale={modelScale}
            isTransitioningRef={isTransitioningRef}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
