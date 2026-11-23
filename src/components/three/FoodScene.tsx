"use client";

import { ContactShadows } from "@react-three/drei";
import { CameraController } from "./CameraController";
import { FloatingFood } from "./FloatingFood";

interface FoodSceneProps {
  scrollProgressRef: React.MutableRefObject<number>;
}

export function FoodScene({ scrollProgressRef }: FoodSceneProps) {
  return (
    <>
      <color attach="background" args={["#FFF8ED"]} />

      {/* Warm studio lighting rig — zero external HDRI downloads */}
      <ambientLight intensity={1.05} color="#FFF4E4" />
      <hemisphereLight args={["#FFF8ED", "#F0D9B5", 0.85]} />
      <directionalLight position={[6, 8, 6]} intensity={1.65} color="#FFEBD2" />
      <directionalLight position={[-6, 3, -4]} intensity={0.75} color="#FFB4C2" />
      <pointLight position={[0, -3, 4]} intensity={0.65} color="#B7E4C7" />

      <CameraController scrollProgressRef={scrollProgressRef} />

      {/* Central Hero Piece: Vietnamese Bánh Mì */}
      <FloatingFood
        kind="banh-mi"
        position={[0.15, 0.1, 0.4]}
        scale={1.15}
        floatSpeed={1.0}
        floatAmplitude={0.2}
        rotationSpeed={[0.12, 0.36, 0.08]}
        scrollProgressRef={scrollProgressRef}
        expandDirection={[0, 0.6, -0.5]}
      />

      {/* Orbiting & Surrounding Vietnamese Street Food & Hangout Icons */}
      <FloatingFood
        kind="bubble-tea"
        position={[2.75, 0.75, -0.4]}
        scale={0.95}
        floatSpeed={1.25}
        floatAmplitude={0.24}
        rotationSpeed={[0.08, 0.42, 0.05]}
        orbitRadius={0.22}
        orbitSpeed={0.35}
        orbitPhase={0.8}
        scrollProgressRef={scrollProgressRef}
        expandDirection={[2.2, 0.8, 0.4]}
      />

      <FloatingFood
        kind="donut"
        position={[-2.7, 0.85, -0.3]}
        scale={0.88}
        floatSpeed={1.15}
        floatAmplitude={0.26}
        rotationSpeed={[0.25, 0.35, 0.16]}
        orbitRadius={0.25}
        orbitSpeed={0.3}
        orbitPhase={2.1}
        scrollProgressRef={scrollProgressRef}
        expandDirection={[-2.3, 0.9, 0.3]}
      />

      <FloatingFood
        kind="burger"
        position={[-2.45, -1.25, 0.2]}
        scale={0.82}
        floatSpeed={0.95}
        floatAmplitude={0.2}
        rotationSpeed={[0.12, -0.34, 0.08]}
        orbitRadius={0.18}
        orbitSpeed={0.28}
        orbitPhase={3.7}
        scrollProgressRef={scrollProgressRef}
        expandDirection={[-2.1, -1.0, 0.5]}
      />

      <FloatingFood
        kind="fries"
        position={[2.55, -1.15, 0.25]}
        scale={0.86}
        floatSpeed={1.3}
        floatAmplitude={0.22}
        rotationSpeed={[0.14, -0.4, 0.1]}
        orbitRadius={0.2}
        orbitSpeed={0.32}
        orbitPhase={5.0}
        scrollProgressRef={scrollProgressRef}
        expandDirection={[2.0, -1.0, 0.4]}
      />

      <FloatingFood
        kind="vietnamese-snack"
        position={[0.0, -1.75, -0.8]}
        scale={0.85}
        floatSpeed={1.05}
        floatAmplitude={0.18}
        rotationSpeed={[0.1, 0.3, 0.06]}
        orbitRadius={0.28}
        orbitSpeed={0.25}
        orbitPhase={1.4}
        scrollProgressRef={scrollProgressRef}
        expandDirection={[0, -1.5, 0.6]}
      />

      <ContactShadows
        position={[0, -2.65, 0]}
        opacity={0.22}
        scale={12}
        blur={2.8}
        far={5}
        color="#6E4E2E"
        frames={1}
      />
    </>
  );
}
