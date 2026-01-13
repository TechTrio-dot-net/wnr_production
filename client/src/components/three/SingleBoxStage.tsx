"use client";

import React, { Suspense, useMemo, useRef, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, OrbitControls, Preload, useTexture, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import ProductBox3D, { BoxFaces, BoxStyle } from "./ProductBox3D";

/* ---------- utils ---------- */
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const isString = (u: unknown): u is string => typeof u === "string" && u.length > 0;
const remap = (n: number, a1: number, a2: number, b1: number, b2: number) =>
  Math.min(b2, Math.max(b1, b1 + ((n - a1) * (b2 - b1)) / (a2 - a1)));

/* Warm textures in THIS canvas */
function TextureWarmup({ urls }: { urls: string[] }) {
  useTexture(urls);
  return null;
}

/* One-time intro animator with restart trigger */
function IntroAnimator({
  children,
  duration = 1.6,
  from = { scale: 0.76, y: 0.35, z: -1.2, rot: [-0.6, 0.12, -0.18] as [number, number, number] },
  to   = { scale: 1.0, y: 0,    z: 0,    rot: [-0.22, Math.PI / 6, 0.1] as [number, number, number] },
  trigger,
}: {
  children: React.ReactNode;
  duration?: number;
  from?: { scale?: number; y?: number; z?: number; rot?: [number, number, number] };
  to?:   { scale?: number; y?: number; z?: number; rot?: [number, number, number] };
  trigger?: number | string;
}) {
  const g = useRef<THREE.Group>(null!);
  const tRef = useRef(0);

  useEffect(() => {
    tRef.current = 0;
    const s0 = from.scale ?? 1;
    const y0 = from.y ?? 0;
    const z0 = from.z ?? 0;
    const [rx0, ry0, rz0] = from.rot ?? [0, 0, 0];
    if (g.current) {
      g.current.scale.setScalar(s0);
      g.current.position.set(0, y0, z0);
      g.current.rotation.set(rx0, ry0, rz0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(1 / 30, (now - last) / 1000);
      last = now;
      if (tRef.current < duration && g.current) {
        tRef.current = clamp(tRef.current + dt, 0, duration);
        const k = easeOutCubic(tRef.current / duration);

        const s0 = from.scale ?? 1, s1 = to.scale ?? 1;
        const y0 = from.y ?? 0,     y1 = to.y ?? 0;
        const z0 = from.z ?? 0,     z1 = to.z ?? 0;

        const rx0 = from.rot?.[0] ?? 0, ry0 = from.rot?.[1] ?? 0, rz0 = from.rot?.[2] ?? 0;
        const rx1 = to.rot?.[0] ?? 0,   ry1 = to.rot?.[1] ?? 0,   rz1 = to.rot?.[2] ?? 0;

        const grp = g.current;
        grp.scale.setScalar(s0 + (s1 - s0) * k);
        grp.position.y = y0 + (y1 - y0) * k;
        grp.position.z = z0 + (z1 - z0) * k;
        grp.rotation.set(
          rx0 + (rx1 - rx0) * k,
          ry0 + (ry1 - ry0) * k,
          rz0 + (rz1 - rz0) * k
        );
        raf = requestAnimationFrame(loop);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [duration, from, to]);

  return <group ref={g}>{children}</group>;
}

/* Soft blob under product */
function ShadowBlob({ y = -0.02, size = 6, opacity = 0.22 }: { y?: number; size?: number; opacity?: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} receiveShadow>
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial color="#000" transparent opacity={opacity} roughness={1} metalness={0} />
    </mesh>
  );
}

/* Viewport hook (vw + vh) */
function useViewport() {
  const [v, setV] = useState<{ vw: number; vh: number }>(() => ({
    vw: typeof window === "undefined" ? 1200 : window.innerWidth,
    vh: typeof window === "undefined" ? 800 : window.innerHeight,
  }));
  useEffect(() => {
    const onResize = () => setV({ vw: window.innerWidth, vh: window.innerHeight });
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);
  return v;
}

export default function SingleBoxStage({
  faces,
  size = [2.8, 2.0, 1.15],
  style,
  camera = { position: [4.1, 2.8, 4.6], fov: 38 as number },

  /* base scale from parent; we adjust responsively */
  scale = 1.15,

  /* interaction */
  controlsRotate = true,
  autoRotate = true,
  rotateSpeed = 0.82,

  /* zoom (mobile-only) – disabled currently */
  minDistance = 3.2,
  maxDistance = 9.0,

  /* base sizing */
  basePx = 480,
  baseBoxH = 2.0,

  /* fallbacks (used when forceResponsive=false) */
  minHeight = 320,
  maxHeight = 640,
  minWidth = 260,
  maxWidth = 900,

  /* margins so rotation never clips */
  safeMargin = { x: 1.65, y: 1.55 },

  /* intro animation config */
  intro = {
    enabled: true,
    duration: 1.6,
    from: { scale: 0.76, y: 0.35, z: -1.2, rot: [-0.6, 0.12, -0.18] as [number, number, number] },
    to:   { scale: 1.0, y: 0,    z: 0,    rot: [-0.22, Math.PI / 6, 0.1] as [number, number, number] },
  },

  introTrigger,

  preloadFaces = [],

  theme = "studio" as "studio" | "hero",

  /* self-responsiveness */
  forceResponsive = true,

  /* NEW: real-world units */
  realCm,
  unitPerCm = 0.01,   // 1 cm = 0.01 world units
  autoFrame = true,

  /* NEW: shadow toggles (default off as requested) */
  showContactShadow = true,
  showBlobShadow = true,
}: {
  faces: BoxFaces;
  size?: [number, number, number];
  style?: BoxStyle;
  camera?: { position: [number, number, number]; fov: number };
  scale?: number;
  controlsRotate?: boolean;
  autoRotate?: boolean;
  rotateSpeed?: number;
  minDistance?: number;
  maxDistance?: number;
  zoomSpeed?: number;
  basePx?: number;
  baseBoxH?: number;
  minHeight?: number;
  maxHeight?: number;
  minWidth?: number;
  maxWidth?: number;
  safeMargin?: { x: number; y: number };
  intro?: {
    enabled?: boolean;
    duration?: number;
    from?: { scale?: number; y?: number; z?: number; rot?: [number, number, number] };
    to?:   { scale?: number; y?: number; z?: number; rot?: [number, number, number] };
  };
  introTrigger?: number | string;
  preloadFaces?: string[];
  theme?: "studio" | "hero";
  forceResponsive?: boolean;

  /* NEW props */
  realCm?: { w: number; h: number; d: number };
  unitPerCm?: number;
  autoFrame?: boolean;
  showContactShadow?: boolean;
  showBlobShadow?: boolean;
}) {
  /* viewport + breakpoints */
  const { vw, vh } = useViewport();
  const isMobile = vw < 640;
  const isTablet = vw >= 640 && vw < 1024;
  const bpKey = isMobile ? "m" : isTablet ? "t" : "d";

  /* --- hydration guard: first client render matches SSR --- */
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  /* --- responsive tuning (smaller on phones) --- */
  const scaleFactor = forceResponsive ? (isMobile ? 0.99 : isTablet ? 0.82 : 0.86) : 1;

  /** desktop height scales with viewport height so it isn't tiny on 27"+ */
  const maxHRespRaw = forceResponsive
    ? (isMobile
        ? 320
        : isTablet
          ? Math.min(vh * 0.72, 720)
          : Math.min(vh * 0.82, 980))
    : (maxHeight ?? 640);

  const minHResp = forceResponsive
    ? (isMobile ? 200 : isTablet ? 360 : 520)
    : (minHeight ?? 320);

  /** Gutters grow with viewport; allow canvas to widen on big screens */
  const gutter = isMobile ? 24 : isTablet ? 56 : 120;
  const maxWResp = forceResponsive ? (vw - gutter) : (maxWidth ?? 1600);

  // Slightly bigger safe margins to avoid clipping while rotating
  const safeX = (safeMargin?.x ?? 5.55) * (isMobile ? 1.1 : 1.15);
  const safeY = (safeMargin?.y ?? 1.45) * (isMobile ? 1.05 : 1.08);

  /** Gentle growth on wide desktops */
  const desktopGrow = !isMobile && !isTablet ? remap(vw, 1280, 2560, 1.0, 1.22) : 1.0;

  /* effective scale */
  const effectiveScale = scale * scaleFactor * desktopGrow;

  /* ========== REAL CM → WORLD UNITS (or use given size) ========== */
  const sizeUnits: [number, number, number] = useMemo(() => {
    if (realCm) {
      return [realCm.w * unitPerCm, realCm.h * unitPerCm, realCm.d * unitPerCm];
    }
    return size;
  }, [realCm, unitPerCm, size]);

  /* container math derived from the *unit* size */
  const boxW = sizeUnits[0];
  const boxH = sizeUnits[1];
  const aspect = boxW / boxH || 1;

  const rawH = basePx * (boxH / baseBoxH) * effectiveScale;
  const safeH = rawH * safeY;

  // Extra bottom room so shadow isn’t cut off
  const shadowPad = isMobile ? 1.22 : 1.18;
  const containerHeightCalc = Math.round(
    clamp(safeH * shadowPad, minHResp, maxHRespRaw * 1.25)
  );

  const rawW = containerHeightCalc * aspect;
  const safeW = rawW * safeX;
  const containerWidthCalc = Math.round(clamp(safeW * 1.1, minWidth, maxWResp));

  // SSR-stable first render, then upgrade after mount
  const containerHeight = hydrated ? containerHeightCalc : minHeight;
  const containerMaxWidth = hydrated ? containerWidthCalc : 480;

  /* current faces */
  const currentFaceUrls = useMemo(
    () =>
      Array.from(
        new Set(
          [faces.front, faces.back, faces.left, faces.right, faces.top, faces.bottom].filter(isString)
        )
      ),
    [faces]
  );

  /* tilt target from intro.to.rot if provided */
  const tilt = (intro?.to?.rot as [number, number, number]) ?? [-0.22, Math.PI / 6, 0.1];

  /* contact shadow just under box base */
  const contactY = -(sizeUnits[1] * 0.5) - 0.45;

  /* ===== Pause autorotate while interacting (drag / touch) ===== */
  const [interacting, setInteracting] = useState(false);
  const autoRotateEffective = autoRotate && !interacting;

  useEffect(() => {
    const off = () => setInteracting(false);
    window.addEventListener("pointerup", off);
    window.addEventListener("pointercancel", off);
    return () => {
      window.removeEventListener("pointerup", off);
      window.removeEventListener("pointercancel", off);
    };
  }, []);

  /* ==== camera/controls reset on breakpoint changes ==== */
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const initialCamRef = useRef<{ pos: [number, number, number]; fov: number } | null>(null);

  useEffect(() => {
    const cam = cameraRef.current;
    if (!cam || !initialCamRef.current) return;

    const { pos, fov } = initialCamRef.current;
    cam.position.set(pos[0], pos[1], pos[2]);
    cam.zoom = 1;
    cam.fov = fov;
    cam.updateProjectionMatrix();

    if (controlsRef.current) {
      controlsRef.current.minDistance = minDistance;
      controlsRef.current.maxDistance = maxDistance;
      controlsRef.current.update();
      controlsRef.current.reset();
    }
  }, [bpKey, minDistance, maxDistance]);

  /* ====== compute a comfy camera Z based on FOV & box size ====== */
  const fitDistance = useMemo(() => {
    const fov = (camera?.fov ?? 38) * (Math.PI / 180);
    const halfSize = Math.max(boxH, boxW) * 0.5;
    const margin = 1.35; // breathing room
    return (halfSize / Math.tan(fov / 2)) * margin;
  }, [boxH, boxW, camera?.fov]);

  return (
    <div
      style={{
        height: containerHeight,
        width: "100%",
        maxWidth: containerMaxWidth,
        overflow: "hidden",
        position: "relative",
        margin: "0 auto",
        background:
          theme === "hero"
            ? "radial-gradient(1200px circle at 50% 30%, rgba(0,0,0,0.16), rgba(0,0,0,0.6))"
            : "transparent",
        borderRadius: 18,
      }}
    >
      <Canvas
        camera={camera}
        dpr={isMobile ? [1, 1.25] : [1, 1.75]}
        shadows
        style={{
          background: "transparent",
          display: "block",
          touchAction: "none",
          cursor: controlsRotate ? "grab" : "default",
        }}
        onPointerDown={() => setInteracting(true)}
        onPointerUp={() => setInteracting(false)}
        onPointerCancel={() => setInteracting(false)}
        onCreated={({ scene, gl, camera: cam }) => {
          // preserve a copy of the initial camera for resets
          if (cam instanceof THREE.PerspectiveCamera) {
            cameraRef.current = cam;
            if (!initialCamRef.current) {
              const cp = camera?.position ?? [4.1, 2.8, 4.6];
              initialCamRef.current = { pos: [cp[0], cp[1], cp[2]], fov: camera?.fov ?? 38 };
            }
            if (autoFrame) {
              const [cx, cy] = camera?.position ? [camera.position[0], camera.position[1]] : [4.1, 2.8];
              cam.position.set(cx, cy, fitDistance);
              cam.updateProjectionMatrix();
            }
          }

          scene.background = null;
          gl.toneMapping = THREE.NoToneMapping;
          const gr = gl as THREE.WebGLRenderer & { outputColorSpace?: THREE.ColorSpace };
          if (typeof gr.outputColorSpace !== "undefined") {
            gr.outputColorSpace = THREE.SRGBColorSpace;
          }
        }}
      >
        <Suspense fallback={null}>
          {preloadFaces.length > 0 && <TextureWarmup urls={preloadFaces.filter(isString)} />}
          <TextureWarmup urls={currentFaceUrls} />

          {intro?.enabled ? (
            <IntroAnimator duration={intro.duration} from={intro.from} to={intro.to} trigger={introTrigger}>
              <group scale={effectiveScale}>
                <ProductBox3D
                  size={sizeUnits}            // <-- use cm-converted size
                  faces={faces}
                  style={style}
                  autoRotate={autoRotateEffective}
                  autoRotateSpeed={rotateSpeed}
                  initialRotation={tilt}
                />
              </group>
            </IntroAnimator>
          ) : (
            <group scale={effectiveScale}>
              <ProductBox3D
                size={sizeUnits}              // <-- use cm-converted size
                faces={faces}
                style={style}
                autoRotate={autoRotateEffective}
                autoRotateSpeed={rotateSpeed}
                initialRotation={tilt}
              />
            </group>
          )}

          <Preload all />
        </Suspense>

        <Environment preset={theme === "studio" ? "warehouse" : "city"} />

        {showContactShadow && (
          <ContactShadows
            position={[0, contactY, 0]}
            opacity={isMobile ? (theme === "studio" ? 0.15 : 0.18) : (theme === "studio" ? 0.35 : 0.45)}
            scale={theme === "studio" ? (isMobile ? 16 : 20) : (isMobile ? 18 : 22)}
            blur={theme === "studio" ? 2.6 : 3.0}
            far={8}
            frames={1}
            resolution={isMobile ? 768 : 1024}
          />
        )}

        {showBlobShadow && theme === "hero" && <ShadowBlob y={contactY + 0.18} size={isMobile ? 6 : 7} opacity={0.12} />}

        {/* OrbitControls (zoom disabled) */}
        <OrbitControls
          key={bpKey}
          ref={controlsRef as unknown as React.RefObject<OrbitControlsImpl>}
          makeDefault
          enableRotate={controlsRotate}
          enableZoom={false}
          enablePan={false}
          zoomSpeed={0}
          minDistance={minDistance}
          maxDistance={maxDistance}
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={0.9}
          minPolarAngle={Math.PI * 0.22}
          maxPolarAngle={Math.PI * 0.78}
          touches={{
            ONE: THREE.TOUCH.ROTATE,
            TWO: THREE.TOUCH.DOLLY_PAN,
          }}
          mouseButtons={{
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.ROTATE,
            RIGHT: THREE.MOUSE.ROTATE,
          }}
          onStart={() => setInteracting(true)}
          onEnd={() => setInteracting(false)}
        />
      </Canvas>
    </div>
  );
}
