import { useCallback, useEffect, useRef, useState } from "react";

export interface HeadingState {
  heading: number;       // stable heading 0-360° (only updated when flat)
  rawHeading: number;    // latest raw reading for debug
  hasReading: boolean;   // true once first valid flat reading received
  supported: boolean;
  isFlat: boolean;       // true when phone is horizontal enough to trust compass
  permissionNeeded: boolean; // true when user gesture is required to grant permission
  requestPermission: () => Promise<void>; // call from a click handler to request permission
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

// Check if the browser requires explicit permission request (iOS 13+, some Android)
const needsPermissionRequest = (): boolean => {
  const DOE = DeviceOrientationEvent as any;
  return typeof DOE.requestPermission === "function";
};

export const useDeviceHeading = (enabled: boolean): HeadingState => {
  const [heading,    setHeading]    = useState(0);
  const [rawHeading, setRawHeading] = useState(0);
  const [supported,  setSupported]  = useState(false);
  const [hasReading, setHasReading] = useState(false);
  const [isFlat,     setIsFlat]     = useState(true);
  const [permissionNeeded, setPermissionNeeded] = useState(false);

  // Motion gate — freeze heading while walking vibration is detected
  const isMovingRef      = useRef(false);
  const motionClearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const smoothMagRef     = useRef(9.8);
  const listenersAttached = useRef(false);
  const cleanupRef       = useRef<(() => void) | null>(null);

  // Attach orientation + motion listeners (extracted so we can call after permission grant)
  const attachListeners = useCallback(() => {
    if (listenersAttached.current) return;
    listenersAttached.current = true;

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
      const absBeta = Math.abs(beta);
      const flat = absBeta < FLAT_BETA_THRESHOLD || absBeta > (180 - FLAT_BETA_THRESHOLD);
      setIsFlat(flat);

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

    cleanupRef.current = () => {
      window.removeEventListener("devicemotion",      onMotion,      true);
      window.removeEventListener("deviceorientation", onOrientation, true);
      if (motionClearTimer.current) clearTimeout(motionClearTimer.current);
      listenersAttached.current = false;
    };
  }, []);

  // Manual permission request — must be called from a user gesture (click/tap handler)
  const requestPermission = useCallback(async () => {
    try {
      const DOE = DeviceOrientationEvent as any;
      if (typeof DOE.requestPermission === "function") {
        const result = await DOE.requestPermission();
        if (result === "granted") {
          setPermissionNeeded(false);
          attachListeners();
        }
      }
      // Also request DeviceMotionEvent permission if available (iOS)
      const DME = DeviceMotionEvent as any;
      if (typeof DME.requestPermission === "function") {
        await DME.requestPermission();
      }
    } catch (err) {
      console.warn("Compass permission request failed:", err);
    }
  }, [attachListeners]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const hasOrientation = "DeviceOrientationEvent" in window;
    setSupported(hasOrientation);
    if (!hasOrientation) return;

    // If browser requires explicit permission (iOS 13+), try requesting it
    if (needsPermissionRequest()) {
      // We can't auto-request — it MUST come from a user gesture.
      // Signal to the UI that a tap is needed.
      setPermissionNeeded(true);
      return;
    }

    // Browser doesn't need requestPermission — attach listeners directly.
    // But on some Android browsers, events may still not fire. We use a
    // timeout to detect this and surface a fallback.
    attachListeners();

    // Fallback: if no reading after 3s, the browser might be silently blocking.
    // In that case, we just continue without compass (the UI will skip the
    // "waiting" state after a timeout handled in Index.tsx).
    const fallbackTimer = setTimeout(() => {
      setHasReading((current) => {
        if (!current) {
          console.warn("No compass data after 3s — device may not have a magnetometer or browser is blocking.");
          // Force past the waiting state so navigation isn't blocked
          return true;
        }
        return current;
      });
    }, 3000);

    return () => {
      clearTimeout(fallbackTimer);
      if (cleanupRef.current) cleanupRef.current();
    };
  }, [enabled, attachListeners]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanupRef.current) cleanupRef.current();
    };
  }, []);

  return { heading, rawHeading, supported, hasReading, isFlat, permissionNeeded, requestPermission };
};