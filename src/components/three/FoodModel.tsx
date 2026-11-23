"use client";

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";

export type FoodKind =
  | "banh-mi"
  | "bubble-tea"
  | "donut"
  | "burger"
  | "fries"
  | "vietnamese-snack";

export const FOOD_MODEL_PATHS: Record<FoodKind, string> = {
  "banh-mi": "/models/food/banh-mi.glb",
  "bubble-tea": "/models/food/bubble-tea.glb",
  donut: "/models/food/donut.glb",
  burger: "/models/food/burger.glb",
  fries: "/models/food/fries.glb",
  "vietnamese-snack": "/models/food/vietnamese-snack.glb",
};

const DRACO_DECODER_PATH = "/draco/";

interface FoodModelProps {
  kind: FoodKind;
  scale?: number;
}

/**
 * Reusable React Three Fiber component that loads Draco-compressed PBR GLB
 * street-food assets exported from Blender 5.1 under /public/models/food/.
 */
export function FoodModel({ kind, scale = 1 }: FoodModelProps) {
  const modelPath = FOOD_MODEL_PATHS[kind];
  const { scene } = useGLTF(modelPath, DRACO_DECODER_PATH);

  // Clone scene so multiple instances of the same food model can be mounted safely
  const clonedScene = useMemo(() => scene.clone(true), [scene]);

  return <primitive object={clonedScene} scale={scale} />;
}

// Preload all 6 compressed GLB models using the local Draco decoder
(Object.values(FOOD_MODEL_PATHS) as string[]).forEach((path) => {
  useGLTF.preload(path, DRACO_DECODER_PATH);
});
