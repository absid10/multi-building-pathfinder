import { useEffect, useRef, useState } from "react";

export interface HeadingState {
  heading: number;       // stable heading 0-360° (only updated when flat)
  rawHeading: number;    // latest raw reading for debug
  hasReading: boolean;   // true once first valid flat reading received
  supported: boolean;
  isFlat: boolean;       // true when phone is horizontal enough to trust compass
}

const normalizeHeading = (v: number) => ((v % 360) + 360) % 360;

const smoothCircular = (prev: number, next: number, alpha = 0.3): number => {
  const delta = ((((next - prev) % 360) + 540) % 360) - 180;
  return normalizeHeading(prev + delta * alpha);
};

// Phone is "flat enough" when beta (pitch) is within this many degrees of 0
// beta=0 → perfectly flat, beta=90 → perfectly vertical
// 40° gives decent tolerance — user can tilt slightly without losing compass
const FLAT_BETA_THRESHOLD = 40; // degrees from flat

const getRawHeading = (
  e: DeviceOrientationEvent & { webkitCompassHeading?: number }
): number | null => {
  if (typeof e.webkitCompassHeading === "number" && !Number.isNaN(e.webkitCompassHeading)) {
    return e.webkitCompassHeading;
  }
  if (typeof e.alpha === "number" && !Number.isNaN(e.alpha)) {
    return normalizeHeading(360 - e.alpha);
  }
  return null;
};

export const useDeviceHeading = (enabled: boolean): HeadingState => {
  const [heading,    setHeading]    = useState(0);
  const [rawHeading, setRawHeading] = useState(0);
  const [supported,  setSupported]  = useState(false);
  const [hasReading, setHasReading] = useState(false);
  const [isFlat,     setIsFlat]     = useState(true);

  // Motion gate — freeze heading while walking vibration is detected
  const isMovingRef      = useRef(false);
  const motionClearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const smoothMagRef     = useRef(9.8);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const hasOrientation = "DeviceOrientationEvent" in window;
    setSupported(hasOrientation);
    if (!hasOrientation) return;

    // Motion detector — raises flag during walking vibration
    const MOTION_THRESHOLD = 11.5;
    const MOTION_QUIET_MS  = 800;

    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a) return;
      const mag = Math.sqrt((a.x ?? 0) ** 2 + (a.y ?? 0) ** 2 + (a.z ?? 0) ** 2);
      smoothMagRef.current = smoothMagRef.current * 0.7 + mag * 0.3;

      if (smoothMagRef.current > MOTION_THRESHOLD) {
        isMovingRef.current = true;
        if (motionClearTimer.current) clearTimeout(motionClearTimer.current);
        motionClearTimer.current = setTimeout(() => {
          isMovingRef.current = false;
        }, MOTION_QUIET_MS);
      }
    };

    const onOrientation = (e: DeviceOrientationEvent) => {
      const beta = e.beta ?? 0;
      // absBeta: 0 = flat, 90 = vertical. We use abs because face-up and
      // face-down both have beta near 0 or near ±180 — we only care about tilt.
      const absBeta = Math.abs(beta);
      // Phone is flat if beta is near 0 (face-up) 
      // Beta near ±180 means face-down — also flat, also fine
      const flat = absBeta < FLAT_BETA_THRESHOLD || absBeta > (180 - FLAT_BETA_THRESHOLD);
      setIsFlat(flat);

      // Only update heading when phone is flat AND not shaking from walking
      if (!flat || isMovingRef.current) return;

      const raw = getRawHeading(
        e as DeviceOrientationEvent & { webkitCompassHeading?: number }
      );
      if (raw == null) return;

      setRawHeading(Math.round(raw));
      setHasReading(true);
      setHeading((prev) => smoothCircular(prev, raw, 0.3));
    };

    window.addEventListener("devicemotion",      onMotion,      true);
    window.addEventListener("deviceorientation", onOrientation, true);

    return () => {
      window.removeEventListener("devicemotion",      onMotion,      true);
      window.removeEventListener("deviceorientation", onOrientation, true);
      if (motionClearTimer.current) clearTimeout(motionClearTimer.current);
    };
  }, [enabled]);

  return { heading, rawHeading, supported, hasReading, isFlat };
};