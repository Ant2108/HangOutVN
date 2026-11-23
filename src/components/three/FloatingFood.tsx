"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";
import { FoodModel, type FoodKind } from "./FoodModel";

interface FloatingFoodProps {
  kind: FoodKind;
  position: [number, number, number];
  scale?: number;
  floatSpeed?: number;
  floatAmplitude?: number;
  rotationSpeed?: [number, number, number];
  orbitRadius?: number;
  orbitSpeed?: number;
  orbitPhase?: number;
  scrollProgressRef: React.MutableRefObject<number>;
  expandDirection?: [number, number, number];
}

export function FloatingFood({
  kind,
  position,
  scale = 1,
  floatSpeed = 1.1,
  floatAmplitude = 0.22,
  rotationSpeed = [0.18, 0.38, 0.1],
  orbitRadius = 0,
  orbitSpeed = 0.25,
  orbitPhase = 0,
  scrollProgressRef,
  expandDirection = [0, 0, 0],
}: FloatingFoodProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const t = state.clock.getElapsedTime();
    const scroll = scrollProgressRef.current;

    // Scene 03 ("Find your vibe") moves food objects outward gracefully
    const expand = Math.max(0, Math.min(1, (scroll - 0.35) * 1.9));

    const orbitX = orbitRadius > 0 ? Math.cos(t * orbitSpeed + orbitPhase) * orbitRadius : 0;
    const orbitZ = orbitRadius > 0 ? Math.sin(t * orbitSpeed + orbitPhase) * orbitRadius : 0;

    group.position.x = position[0] + orbitX + expandDirection[0] * expand;
    group.position.y =
      position[1] + Math.sin(t * floatSpeed + orbitPhase) * floatAmplitude + expandDirection[1] * expand;
    group.position.z = position[2] + orbitZ + expandDirection[2] * expand;

    group.rotation.x += rotationSpeed[0] * delta;
    group.rotation.y += rotationSpeed[1] * delta;
    group.rotation.z += rotationSpeed[2] * delta;
  });

  return (
    <group ref={groupRef} position={position}>
      <FoodModel kind={kind} scale={scale} />
    </group>
  );
}
