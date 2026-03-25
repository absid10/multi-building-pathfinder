import { useEffect, useMemo, useState } from "react";

import { Node } from "@/utils/pathfinding";
import { buildNavigationSummary } from "@/utils/navigationInstructions";

interface TrackingState {
  progress: number;
  currentPosition: { x: number; y: number } | null;
  remainingDistanceFt: number;
  etaMinutes: number;
  nextInstruction: string;
}

const SEGMENT_STEP_FEET = 10;
const FEET_PER_SECOND = 4.2;

const getPointOnPolyline = (path: Node[], normalizedProgress: number): { x: number; y: number } | null => {
  if (path.length < 2) return path[0] ? { x: path[0].x, y: path[0].y } : null;

  const lengths: number[] = [];
  let total = 0;

  for (let i = 0; i < path.length - 1; i += 1) {
    const segment = Math.hypot(path[i + 1].x - path[i].x, path[i + 1].y - path[i].y);
    lengths.push(segment);
    total += segment;
  }

  if (total === 0) return { x: path[0].x, y: path[0].y };

  const target = Math.min(total, Math.max(0, normalizedProgress) * total);
  let traversed = 0;

  for (let i = 0; i < lengths.length; i += 1) {
    const segmentLength = lengths[i];
    if (traversed + segmentLength >= target) {
      const localT = (target - traversed) / segmentLength;
      return {
        x: path[i].x + (path[i + 1].x - path[i].x) * localT,
        y: path[i].y + (path[i + 1].y - path[i].y) * localT,
      };
    }
    traversed += segmentLength;
  }

  const last = path[path.length - 1];
  return { x: last.x, y: last.y };
};

export const useIndoorTracking = (path: Node[], enabled: boolean): TrackingState => {
  const [progress, setProgress] = useState(0);

  const summary = useMemo(() => buildNavigationSummary(path), [path]);

  useEffect(() => {
    setProgress(0);
  }, [path]);

  useEffect(() => {
    if (!enabled || path.length < 2) return;

    const totalDistance = Math.max(1, summary.totalDistanceFt);
    const step = SEGMENT_STEP_FEET / totalDistance;

    const intervalId = window.setInterval(() => {
      setProgress((prev) => {
        const next = prev + step;
        return next >= 1 ? 1 : next;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [enabled, path, summary.totalDistanceFt]);

  const currentPosition = useMemo(() => {
    if (!enabled) return null;
    return getPointOnPolyline(path, progress);
  }, [enabled, path, progress]);

  const remainingDistanceFt = Math.max(0, Math.round(summary.totalDistanceFt * (1 - progress)));
  const etaMinutes = Math.max(0, Math.ceil(remainingDistanceFt / FEET_PER_SECOND / 60));

  const nextInstruction = useMemo(() => {
    if (!summary.instructions.length) return "Select destination to begin navigation";

    const traveledFt = summary.totalDistanceFt * progress;
    const upcoming = summary.instructions.find(
      (instruction) => instruction.distanceFromStartFt >= traveledFt,
    );

    return upcoming?.text ?? "Arriving at destination";
  }, [progress, summary.instructions, summary.totalDistanceFt]);

  return {
    progress,
    currentPosition,
    remainingDistanceFt,
    etaMinutes,
    nextInstruction,
  };
};
