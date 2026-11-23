"use client";

import { Component, Suspense, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { FoodScene } from "./FoodScene";
import { SceneFallback } from "./SceneFallback";

interface FoodCanvasProps {
  scrollProgressRef: React.MutableRefObject<number>;
}

class WebGLErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return <SceneFallback />;
    }
    return this.props.children;
  }
}

function detectCanUse3D(): boolean {
  if (typeof window === "undefined") return false;
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isSmallLowPower =
    window.innerWidth < 640 &&
    typeof navigator !== "undefined" &&
    (navigator.hardwareConcurrency || 4) <= 4;

  if (prefersReduced || isSmallLowPower) return false;

  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl2") || canvas.getContext("webgl"))
    );
  } catch {
    return false;
  }
}

export function FoodCanvas({ scrollProgressRef }: FoodCanvasProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);
  const [canUse3D] = useState<boolean>(() => detectCanUse3D());

  useEffect(() => {
    const node = wrapperRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        setInView(entries[0]?.isIntersecting ?? true);
      },
      { threshold: 0.02 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={wrapperRef} className="relative h-full w-full">
      {!canUse3D ? (
        <SceneFallback />
      ) : (
        <WebGLErrorBoundary>
          <Suspense fallback={<SceneFallback />}>
            <Canvas
              dpr={[1, 1.75]}
              frameloop={inView ? "always" : "never"}
              camera={{ position: [0, 0.25, 7.4], fov: 40, near: 0.1, far: 50 }}
              gl={{
                antialias: true,
                alpha: false,
                powerPreference: "high-performance",
              }}
              aria-label="Không gian 3D món ăn đường phố Việt Nam"
            >
              <FoodScene scrollProgressRef={scrollProgressRef} />
            </Canvas>
          </Suspense>
        </WebGLErrorBoundary>
      )}
    </div>
  );
}
