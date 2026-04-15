"use client";

import { Suspense, useRef, useState, useCallback, useEffect } from "react";
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
  screenBgColor?: string;
  screenTextureScale?: number;
}

/** Ring of point lights arranged in a circle on the XY plane, centered at `center`.
 *  `center[2]` is the ring's Z depth (positive = in front of the device). */
function RingLight({
  count,
  radius,
  center,
  intensity,
  distance,
}: {
  count: number;
  radius: number;
  center: [number, number, number];
  intensity: number;
  distance: number;
}) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2;
        return (
          <pointLight
            key={i}
            position={[
              center[0] + Math.cos(angle) * radius,
              center[1] + Math.sin(angle) * radius,
              center[2],
            ]}
            intensity={intensity}
            distance={distance}
            decay={2}
          />
        );
      })}
    </>
  );
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
  screenBgColor,
  screenTextureScale,
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

  // Always keep both device textures in sync with the current screen
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

  // Keep departing device's texture intact — it fades out with opacity

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
      groupRef.current.scale.setScalar(modelScale);
      if (phoneGroupRef.current) phoneGroupRef.current.visible = deviceType === "phone";
      if (laptopGroupRef.current) laptopGroupRef.current.visible = deviceType === "laptop";
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

    // Scale entrance: lerp 0.75 → 1.0 (applied as scaleRef * modelScale)
    scaleRef.current += (1.0 - scaleRef.current) * delta * 4;
    groupRef.current.scale.setScalar(scaleRef.current * modelScale);

    // Apply scroll-driven Y rotation + smoothed hover tilt
    // Phone gets dramatic tilt (~17°), laptop gets a moderate bump (~7°)
    const tiltIntensity = deviceType === "phone" ? 0.7 : 0.20;
    groupRef.current.rotation.set(
      smoothTiltX.current * tiltIntensity,
      rotationRef.current + smoothTiltY.current * tiltIntensity,
      0
    );

    // Subtle idle float when active
    if (isActive) {
      floatRef.current += delta * 0.8;
      groupRef.current.position.y = Math.sin(floatRef.current) * 0.02;
    } else {
      groupRef.current.position.y = 0;
    }

    // Instant device swap — CSS opacity on the container handles the fade
    if (phoneGroupRef.current) phoneGroupRef.current.visible = deviceType === "phone";
    if (laptopGroupRef.current) laptopGroupRef.current.visible = deviceType === "laptop";

    // Re-render while animating, tilt is settling, or active (for float)
    const isRotating = Math.abs(rotationRef.current - prevRotation) > 0.0001;
    const isTiltSettling =
      Math.abs(smoothTiltX.current - tiltTargetX.current) > 0.001 ||
      Math.abs(smoothTiltY.current - tiltTargetY.current) > 0.001;
    const isScaling = Math.abs(scaleRef.current - 1.0) > 0.001;
    if (isRotating || isTiltSettling || isScaling || isActive) {
      invalidate();
    }
  });

  return (
    <group ref={groupRef}>
      <group ref={phoneGroupRef}>
        {phoneTexture && (
          <PhoneModel screenTexture={phoneTexture} rotationY={0} tiltX={0} tiltY={0} visible={deviceType === "phone"} />
        )}
      </group>
      <group ref={laptopGroupRef}>
        {laptopTexture && (
          <LaptopModel screenTexture={laptopTexture} rotationY={0} tiltX={0} tiltY={0} visible={deviceType === "laptop"} screenBgColor={screenBgColor} screenTextureScale={screenTextureScale} />
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
  screenBgColor,
  screenTextureScale,
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
        {/* Device-specific lighting — phone gets a tighter, brighter ring
         *  since its face is narrower than the laptop and was reading too dark */}
        {deviceType === "phone" ? (
          <>
            <ambientLight intensity={0.9} />
            <RingLight
              count={14}
              radius={1.0}
              center={[0, 0.2, 1.8]}
              intensity={0.55}
              distance={6}
            />
            {/* Front key light to lift the phone face */}
            <directionalLight position={[0, 1, 4]} intensity={0.5} />
            {/* Warm accent kiss on one side (brand orange) */}
            <pointLight position={[1.2, 0.6, 1.5]} intensity={0.3} distance={4} color="#FF6B35" />
          </>
        ) : (
          <>
            <ambientLight intensity={0.6} />
            <RingLight
              count={12}
              radius={1.8}
              center={[0, 0.4, 2.5]}
              intensity={0.35}
              distance={8}
            />
          </>
        )}
        {/* Subtle rim from behind to separate device from background */}
        <directionalLight position={[0, 2, -3]} intensity={0.4} />
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
            screenBgColor={screenBgColor}
            screenTextureScale={screenTextureScale}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
