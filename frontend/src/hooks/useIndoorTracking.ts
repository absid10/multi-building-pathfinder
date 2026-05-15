import { useEffect, useMemo, useRef, useState } from "react";
import { Node } from "@/utils/pathfinding";
import { buildNavigationSummary } from "@/utils/navigationInstructions";

interface TrackingState {
  progress: number;
  currentPosition: { x: number; y: number } | null;
  remainingDistanceFt: number;
  etaMinutes: number;
  nextInstruction: string;
  stepCount: number;
  isFacingCorrectDirection: boolean;
  requiredBearing: number | null; // Needed for the Index.tsx UI
  directionMode: "checking" | "navigating" | "turn_approaching";
}

interface TrackingOptions {
  experimentalEnabled?: boolean;
  headingDegrees?: number;
  headingTrusted?: boolean;
  navigationActive?: boolean; // This connects to your "Start Navigation" button
}

const STEP_LENGTH_FT = Number(import.meta.env.VITE_STEP_LENGTH_FT ?? 2.6);
const ENABLE_REAL_STEP_DETECTOR =
  String(import.meta.env.VITE_ENABLE_REAL_STEP_DETECTOR ?? "false").toLowerCase() === "true";

const HEADING_TOLERANCE_DEG = 45;

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

// 📐 Fixed SVG-to-Compass Math: Top = North (0°), Right = East (90°)
export const angleBetweenNodes = (from: Node, to: Node): number => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  // Use -dy because SVG Y increases downwards, but compass North is upwards
  const rad = Math.atan2(dx, -dy);
  return ((rad * 180) / Math.PI + 360) % 360;
};

export const angularDifference = (a: number, b: number): number => {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
};

// ... (buildSegments, locateOnPath, projectPointOnPath remain unchanged)
const buildSegments = (path: Node[]) => {
  const lengths: number[] = [];
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const len = Math.hypot(path[i + 1].x - path[i].x, path[i + 1].y - path[i].y);
    lengths.push(len);
    total += len;
  }
  return { lengths, total };
};

const locateOnPath = (lengths: number[], total: number, progress: number) => {
  const target = clamp(progress, 0, 1) * total;
  let traversed = 0;
  for (let i = 0; i < lengths.length; i++) {
    const end = traversed + lengths[i];
    if (end >= target || i === lengths.length - 1) {
      const localProgress = lengths[i] > 0 ? (target - traversed) / lengths[i] : 0;
      return { segIdx: i, localProgress: clamp(localProgress, 0, 1) };
    }
    traversed = end;
  }
  return { segIdx: lengths.length - 1, localProgress: 1 };
};

const projectPointOnPath = (
  path: Node[], lengths: number[], total: number, progress: number
): { x: number; y: number } => {
  if (path.length < 2 || total <= 0) return { x: path[0].x, y: path[0].y };
  const { segIdx, localProgress } = locateOnPath(lengths, total, progress);
  const i = Math.min(segIdx, path.length - 2);
  return {
    x: path[i].x + (path[i + 1].x - path[i].x) * localProgress,
    y: path[i].y + (path[i + 1].y - path[i].y) * localProgress,
  };
};

export const useIndoorTracking = (
  path: Node[],
  enabled: boolean,
  options: TrackingOptions = {}
): TrackingState => {
  const summary = useMemo(() => buildNavigationSummary(path), [path]);
  const experimentalEnabled = options.experimentalEnabled === true;
  const headingDegrees = options.headingDegrees ?? 0;
  const navigationActive = options.navigationActive ?? false;

  const { lengths, total } = useMemo(() => buildSegments(path), [path]);

  const [stepCount, setStepCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isFacingCorrectDirection, setIsFacingCorrectDirection] = useState(true);

  const lastPeakAtRef = useRef(0);
  const smoothMagnitudeRef = useRef(0);

  // 🎯 Calculate bearing for the FIRST segment of the path
  // 🎯 Calculate bearing for the FIRST segment on the CURRENT floor
 // 🎯 Calculate bearing for the NEXT segment relative to where we stand NOW
const requiredBearing = useMemo(() => {
  // 1. Safety check
  if (path.length < 2 || navigationActive) return null;

  // 2. Handle the "User Click" scenario:
  // If the very first node is a temporary click node, skip it 
  // and use path[1] to path[2] to get the true hallway direction.
  if (path[0].id === "user-temp-start") {
    if (path.length >= 3) {
      return angleBetweenNodes(path[1], path[2]);
    }
    // If there's only 2 nodes and one is temp, we have to use it
    return angleBetweenNodes(path[0], path[1]);
  }

  // 3. Handle the "Floor Change" or "Standard" scenario:
  // After slicing in Index.tsx, path[0] is a REAL node (like a stair node).
  // We use path[0] to path[1] to get the orientation for the new floor.
  return angleBetweenNodes(path[0], path[1]);
}, [path, navigationActive]);
  // Reset on new path
  useEffect(() => {
    setStepCount(0);
    setProgress(0);
    setIsFacingCorrectDirection(true);
  }, [path]);

  // 🧭 ORIENT & GO Logic
  useEffect(() => {
    // If navigation button is clicked, we bypass direction check entirely
    if (navigationActive) {
      setIsFacingCorrectDirection(true);
      return;
    }

    if (!enabled || !experimentalEnabled || !requiredBearing) {
      setIsFacingCorrectDirection(true);
      return;
    }

    const diff = angularDifference(headingDegrees, requiredBearing);
    setIsFacingCorrectDirection(diff <= HEADING_TOLERANCE_DEG);
  }, [enabled, experimentalEnabled, headingDegrees, requiredBearing, navigationActive]);

  const countStep = () => {
    setStepCount((prev) => prev + 1);
  };

  // Accelerometer Step Detector
  useEffect(() => {
    if (!enabled || !experimentalEnabled || !ENABLE_REAL_STEP_DETECTOR || path.length < 2) return;

    const handler = (event: DeviceMotionEvent) => {
      const a = event.accelerationIncludingGravity;
      if (!a) return;
      const mag = Math.sqrt((a.x ?? 0) ** 2 + (a.y ?? 0) ** 2 + (a.z ?? 0) ** 2);
      smoothMagnitudeRef.current = smoothMagnitudeRef.current * 0.8 + mag * 0.2;

      const now = Date.now();
      if (smoothMagnitudeRef.current > 10.8 && now - lastPeakAtRef.current > 280) {
        lastPeakAtRef.current = now;

        // Steps ONLY count if navigation has started OR they are facing correctly
        if (navigationActive || isFacingCorrectDirection) {
          countStep();
        }
      }
    };

    window.addEventListener("devicemotion", handler);
    return () => window.removeEventListener("devicemotion", handler);
  }, [enabled, experimentalEnabled, path.length, isFacingCorrectDirection, navigationActive]);

  // Simulated Mode
  useEffect(() => {
    if (ENABLE_REAL_STEP_DETECTOR || !enabled || !experimentalEnabled || path.length < 2) return;
    const interval = window.setInterval(() => {
      if (navigationActive || isFacingCorrectDirection) {
        countStep();
      }
    }, 850);
    return () => window.clearInterval(interval);
  }, [enabled, experimentalEnabled, path.length, isFacingCorrectDirection, navigationActive]);

  useEffect(() => {
    const t = Math.max(summary.totalDistanceFt, 1);
    setProgress(clamp((stepCount * STEP_LENGTH_FT) / t, 0, 1));
  }, [stepCount, summary.totalDistanceFt]);

  return {
    progress,
    currentPosition: enabled && path.length > 1
      ? projectPointOnPath(path, lengths, total, progress)
      : null,
    remainingDistanceFt: Math.max(0, Math.round(summary.totalDistanceFt * (1 - progress))),
    etaMinutes: Math.max(1, Math.round((1 - progress) * summary.etaMinutes)),
    nextInstruction: summary.instructions.find(i => i.distanceFromStartFt >= stepCount * STEP_LENGTH_FT)?.text ?? "Arrived",
    stepCount,
    isFacingCorrectDirection,
    requiredBearing, // Now returned to Index.tsx
    directionMode: navigationActive ? "navigating" : "checking",
  };
};