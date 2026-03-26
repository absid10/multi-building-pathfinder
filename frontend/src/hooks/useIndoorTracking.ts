import { useMemo } from "react";

import { Node } from "@/utils/pathfinding";
import { buildNavigationSummary } from "@/utils/navigationInstructions";

interface TrackingState {
  progress: number;
  currentPosition: { x: number; y: number } | null;
  remainingDistanceFt: number;
  etaMinutes: number;
  nextInstruction: string;
}

export const useIndoorTracking = (path: Node[], enabled: boolean): TrackingState => {
  const summary = useMemo(() => buildNavigationSummary(path), [path]);
  const currentPosition = null;
  const remainingDistanceFt = summary.totalDistanceFt;
  const etaMinutes = summary.etaMinutes;
  const nextInstruction = enabled
    ? "Live tracing is yet to be implemented."
    : (summary.instructions[0]?.text ?? "Select destination to begin navigation");

  return {
    progress: 0,
    currentPosition,
    remainingDistanceFt,
    etaMinutes,
    nextInstruction,
  };
};
