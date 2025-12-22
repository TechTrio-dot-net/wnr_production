"use client";

import { useRef, useMemo, useLayoutEffect } from "react";
import { Mesh, Texture } from "three";
import { useFrame } from "@react-three/fiber";
import { useTexture, Edges } from "@react-three/drei";

export type BoxFaces = {
  front: string;
  back?: string;
  left?: string;
  right?: string;
  top?: string;
  bottom?: string;
};

export type BoxStyle = {
  // kept in type for API compatibility, but not used with meshBasicMaterial
  metalness?: number;
  roughness?: number;
  envMapIntensity?: number;
  color?: string;
  edgeColor?: string | null; // null → hide outline
  edgeThickness?: number;    // Drei's Edges doesn't support true line width, kept for API
};

// Strong tuple type for rotations
type Vec3 = readonly [number, number, number];

export default function ProductBox3D({
  size = [2.4, 1.6, 2.1],
  faces,
  style = {},
  autoRotate = false,
  autoRotateSpeed = 0.25,
  castShadow = true,
  receiveShadow = true,
  initialRotation = [-0.28, 0.55, 0.12] as const, // used ONLY on first mount
  scale = 1,
}: {
  size?: [number, number, number];
  faces: BoxFaces;
  style?: BoxStyle;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
  initialRotation?: Vec3;
  scale?: number;
}) {
  const meshRef = useRef<Mesh>(null!);
  const didInit = useRef(false);
  const initRotRef = useRef<Vec3>(initialRotation); // avoids effect deps warning

  // ---- load textures with safe fallbacks ----
  const maps = useTexture({
    front: faces.front,
    back: faces.back ?? faces.front,
    left: faces.left ?? faces.front,
    right: faces.right ?? faces.left ?? faces.front,
    top: faces.top ?? faces.front,
    bottom: faces.bottom ?? faces.top ?? faces.front,
  }) as Record<string, Texture>;

  // quality tweaks
  useMemo(() => {
    Object.values(maps).forEach((t) => {
      t.anisotropy = 8;
      t.generateMipmaps = true;
      t.needsUpdate = true;
    });
  }, [maps]);

  // set initial rotation ONLY on first mount
  useLayoutEffect(() => {
    if (didInit.current || !meshRef.current) return;
    const [rx, ry, rz] = initRotRef.current;
    meshRef.current.rotation.set(rx, ry, rz);
    didInit.current = true;
  }, []);

  // continuous gentle autorotate
  useFrame((_, d) => {
    if (!autoRotate || !meshRef.current) return;
    meshRef.current.rotation.y += d * autoRotateSpeed;
  });

  // Only read the style prop we actually use
  const { edgeColor = null } = style || {};

  // Three’s box material order:
  // 0: right, 1: left, 2: top, 3: bottom, 4: front, 5: back
  const materials = useMemo(
    () => [
      { map: maps.right },
      { map: maps.left },
      { map: maps.top },
      { map: maps.bottom },
      { map: maps.front },
      { map: maps.back },
    ],
    [maps]
  );

  return (
    <mesh
      ref={meshRef}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
      scale={scale}
    >
      <boxGeometry args={size} />

      {/* Basic material = no lighting influence (shows raw texture color) */}
      {materials.map((m, i) => (
        <meshBasicMaterial
          key={i}
          attach={`material-${i}`}
          map={m.map}
          transparent
          alphaTest={0.01}  // trims tiny PNG halos
        />
      ))}

      {/* Optional outline (hidden by default when edgeColor is null) */}
      {edgeColor && (
        <Edges threshold={15} color={edgeColor} />
      )}
    </mesh>
  );
}
