"use client";

import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

interface CameraControllerProps {
  scrollProgressRef: React.MutableRefObject<number>;
}

const targetPos = new THREE.Vector3();

export function CameraController({ scrollProgressRef }: CameraControllerProps) {
  const { camera, pointer } = useThree();

  useFrame((_, delta) => {
    const scroll = scrollProgressRef.current;

    // Smoothly zoom in slightly during Scene 02, then widen for Scene 03/04
    const zoomOffset =
      scroll < 0.45
        ? -scroll * 2.2
        : -0.99 + (scroll - 0.45) * 2.8;

    const desiredX = pointer.x * 0.65;
    const desiredY = 0.25 + pointer.y * 0.42 - scroll * 0.65;
    const desiredZ = 7.4 + zoomOffset;

    targetPos.set(desiredX, desiredY, desiredZ);
    camera.position.lerp(targetPos, Math.min(1, delta * 3.5));
    camera.lookAt(0, -scroll * 0.25, 0);
  });

  return null;
}
