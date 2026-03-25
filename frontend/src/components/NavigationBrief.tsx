import { Compass, Footprints, MapPinned, RadioTower, Timer } from "lucide-react";

import { buildNavigationSummary } from "@/utils/navigationInstructions";
import { Node } from "@/utils/pathfinding";
import { useMemo } from "react";
import { Switch } from "@/components/ui/switch";

interface NavigationBriefProps {
  path: Node[];
  nextInstruction: string;
  remainingDistanceFt: number;
  etaMinutes: number;
  trackingEnabled: boolean;
  onTrackingChange: (enabled: boolean) => void;
}

export const NavigationBrief = ({
  path,
  nextInstruction,
  remainingDistanceFt,
  etaMinutes,
  trackingEnabled,
  onTrackingChange,
}: NavigationBriefProps) => {
  const summary = useMemo(() => buildNavigationSummary(path), [path]);

  if (path.length < 2) {
    return (
      <section className="bg-card border border-border rounded-xl p-4">
        <p className="text-sm text-muted-foreground">Set your location and choose a destination to get step-by-step indoor guidance.</p>
      </section>
    );
  }

  return (
    <section className="bg-card border border-border rounded-xl p-4 space-y-4 shadow-md">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Live Indoor Navigation</h3>
          <p className="text-xs text-muted-foreground">Google Maps style summary with indoor route simulation</p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-secondary px-3 py-2">
          <RadioTower className="w-4 h-4 text-primary" />
          <span className="text-xs font-medium">Live tracking</span>
          <Switch checked={trackingEnabled} onCheckedChange={onTrackingChange} />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-border p-3 bg-background/70">
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <Footprints className="w-3.5 h-3.5" /> Total distance
          </div>
          <p className="text-xl font-semibold">{summary.totalDistanceFt} ft</p>
        </div>
        <div className="rounded-lg border border-border p-3 bg-background/70">
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <Timer className="w-3.5 h-3.5" /> ETA
          </div>
          <p className="text-xl font-semibold">{summary.etaMinutes} min</p>
        </div>
        <div className="rounded-lg border border-border p-3 bg-background/70">
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <MapPinned className="w-3.5 h-3.5" /> Remaining
          </div>
          <p className="text-xl font-semibold">{remainingDistanceFt} ft • {etaMinutes} min</p>
        </div>
      </div>

      <div className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3">
        <p className="text-xs uppercase tracking-wide text-primary mb-1 flex items-center gap-2">
          <Compass className="w-3.5 h-3.5" /> Next instruction
        </p>
        <p className="font-medium text-foreground">{nextInstruction}</p>
      </div>
    </section>
  );
};
