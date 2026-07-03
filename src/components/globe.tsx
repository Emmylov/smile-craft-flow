import { useEffect, useRef, useState } from "react";
import createGlobe from "cobe";

type Marker = { location: [number, number]; size: number };

const MARKERS: Marker[] = [
  { location: [43.6532, -79.3832], size: 0.07 },   // Toronto
  { location: [51.5074, -0.1278], size: 0.08 },    // London
  { location: [6.5244, 3.3792], size: 0.09 },      // Lagos
  { location: [-1.2921, 36.8219], size: 0.08 },    // Nairobi
  { location: [40.7128, -74.006], size: 0.08 },    // New York
  { location: [1.3521, 103.8198], size: 0.07 },    // Singapore
  { location: [-33.8688, 151.2093], size: 0.07 },  // Sydney
  { location: [19.076, 72.8777], size: 0.08 },     // Mumbai
  { location: [48.8566, 2.3522], size: 0.07 },     // Paris
  { location: [-23.5505, -46.6333], size: 0.08 },  // São Paulo
];

export function InteractiveGlobe({ size = 520 }: { size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerInteracting = useRef<number | null>(null);
  const pointerInteractionMovement = useRef(0);
  const [rotation, setRotation] = useState(0);
  const rotationRef = useRef(0);

  useEffect(() => {
    if (!canvasRef.current) return;
    let phi = 0;
    let width = 0;
    const onResize = () => {
      if (canvasRef.current) width = canvasRef.current.offsetWidth;
    };
    window.addEventListener("resize", onResize);
    onResize();

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: width * 2,
      height: width * 2,
      phi: 0,
      theta: 0.25,
      dark: 0,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [0.95, 0.95, 1],
      markerColor: [0.32, 0.28, 0.9],
      glowColor: [0.85, 0.82, 1],
      markers: MARKERS,
      onRender: (state) => {
        if (pointerInteracting.current === null) phi += 0.004;
        state.phi = phi + rotationRef.current;
        state.width = width * 2;
        state.height = width * 2;
      },
    });

    setTimeout(() => {
      if (canvasRef.current) canvasRef.current.style.opacity = "1";
    }, 0);

    return () => {
      globe.destroy();
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    rotationRef.current = rotation;
  }, [rotation]);

  return (
    <div className="relative mx-auto" style={{ maxWidth: size, aspectRatio: "1 / 1", width: "100%" }}>
      <canvas
        ref={canvasRef}
        onPointerDown={(e) => {
          pointerInteracting.current = e.clientX - pointerInteractionMovement.current;
          if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
        }}
        onPointerUp={() => {
          pointerInteracting.current = null;
          if (canvasRef.current) canvasRef.current.style.cursor = "grab";
        }}
        onPointerOut={() => {
          pointerInteracting.current = null;
          if (canvasRef.current) canvasRef.current.style.cursor = "grab";
        }}
        onMouseMove={(e) => {
          if (pointerInteracting.current !== null) {
            const delta = e.clientX - pointerInteracting.current;
            pointerInteractionMovement.current = delta;
            setRotation(delta / 200);
          }
        }}
        onTouchMove={(e) => {
          if (pointerInteracting.current !== null && e.touches[0]) {
            const delta = e.touches[0].clientX - pointerInteracting.current;
            pointerInteractionMovement.current = delta;
            setRotation(delta / 100);
          }
        }}
        style={{
          width: "100%",
          height: "100%",
          cursor: "grab",
          contain: "layout paint size",
          opacity: 0,
          transition: "opacity 1s ease",
        }}
      />
    </div>
  );
}