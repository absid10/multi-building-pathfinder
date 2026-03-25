import { Node } from "@/utils/pathfinding";

const MAP_UNIT_TO_FEET = 0.75;

export interface TurnInstruction {
  id: string;
  atNodeId: string;
  index: number;
  text: string;
  distanceFromStartFt: number;
}

export interface NavigationSummary {
  totalDistanceFt: number;
  etaMinutes: number;
  instructions: TurnInstruction[];
}

const toFeet = (distanceInMapUnits: number): number => distanceInMapUnits * MAP_UNIT_TO_FEET;

const segmentDistance = (a: Node, b: Node): number => Math.hypot(b.x - a.x, b.y - a.y);

export const calculatePathDistanceFt = (path: Node[]): number => {
  if (path.length < 2) return 0;

  let total = 0;
  for (let i = 0; i < path.length - 1; i += 1) {
    total += segmentDistance(path[i], path[i + 1]);
  }

  return toFeet(total);
};

export const estimateEtaMinutes = (distanceFt: number, walkingSpeedFtPerSec = 4.2): number => {
  if (distanceFt <= 0) return 0;
  return Math.max(1, Math.round(distanceFt / walkingSpeedFtPerSec / 60));
};

const angleBetweenSegments = (a: Node, b: Node, c: Node): number => {
  const v1x = b.x - a.x;
  const v1y = b.y - a.y;
  const v2x = c.x - b.x;
  const v2y = c.y - b.y;

  const dot = v1x * v2x + v1y * v2y;
  const cross = v1x * v2y - v1y * v2x;

  return (Math.atan2(cross, dot) * 180) / Math.PI;
};

export const buildTurnInstructions = (path: Node[]): TurnInstruction[] => {
  if (path.length < 2) return [];

  const instructions: TurnInstruction[] = [];
  let cumulativeDistance = 0;

  const firstLegDistanceFt = toFeet(segmentDistance(path[0], path[1]));
  instructions.push({
    id: `start-${path[0].id}`,
    atNodeId: path[0].id,
    index: 0,
    text: `Start and continue for about ${Math.max(5, Math.round(firstLegDistanceFt))} ft`,
    distanceFromStartFt: 0,
  });

  for (let i = 1; i < path.length - 1; i += 1) {
    cumulativeDistance += toFeet(segmentDistance(path[i - 1], path[i]));

    const angle = angleBetweenSegments(path[i - 1], path[i], path[i + 1]);
    const absAngle = Math.abs(angle);
    if (absAngle < 20) continue;

    const turnType = angle > 0 ? "left" : "right";
    instructions.push({
      id: `turn-${path[i].id}-${i}`,
      atNodeId: path[i].id,
      index: i,
      text: `Turn ${turnType} in ${Math.max(5, Math.round(cumulativeDistance))} ft`,
      distanceFromStartFt: Math.round(cumulativeDistance),
    });
  }

  instructions.push({
    id: `arrive-${path[path.length - 1].id}`,
    atNodeId: path[path.length - 1].id,
    index: path.length - 1,
    text: "Arrive at destination",
    distanceFromStartFt: Math.round(calculatePathDistanceFt(path)),
  });

  return instructions;
};

export const buildNavigationSummary = (path: Node[]): NavigationSummary => {
  const totalDistanceFt = Math.round(calculatePathDistanceFt(path));
  const etaMinutes = estimateEtaMinutes(totalDistanceFt);

  return {
    totalDistanceFt,
    etaMinutes,
    instructions: buildTurnInstructions(path),
  };
};
