import { Compass, Footprints, MapPinned, RadioTower, Timer, Navigation, AlertTriangle } from "lucide-react";

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
  headingUpEnabled?: boolean;
  onHeadingUpChange?: (enabled: boolean) => void;
  experimentalEnabled?: boolean;
  stepCount?: number;
  isFacingCorrectDirection?: boolean;
}

export const NavigationBrief = ({
  path,
  nextInstruction,
  remainingDistanceFt,
  etaMinutes,
  trackingEnabled,
  onTrackingChange,
  headingUpEnabled = false,
  onHeadingUpChange,
  experimentalEnabled = false,
  stepCount = 0,
  isFacingCorrectDirection = true,
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
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-full bg-secondary px-3 py-2">
            <RadioTower className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium">Live tracking</span>
            <Switch checked={trackingEnabled} onCheckedChange={onTrackingChange} />
          </div>
          {experimentalEnabled && (
            <div className="flex items-center gap-2 rounded-full bg-secondary px-3 py-2">
              <Compass className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium">Heading-up map</span>
              <Switch
                checked={headingUpEnabled}
                onCheckedChange={(value) => onHeadingUpChange?.(value)}
              />
            </div>
          )}
        </div>
      </div>

      {trackingEnabled && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-amber-700 mb-1">Live tracing status</p>
          <p className="text-sm font-medium text-amber-900">
            {experimentalEnabled
              ? "Experimental dead-reckoning is active. Keep this as a guided assist, not medical-grade positioning."
              : "This feature is yet to be implemented. Current values below are route estimates only."}
          </p>
        </div>
      )}

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
          <p className="text-xl font-semibold">
            {trackingEnabled
              ? `${remainingDistanceFt} ft • ${etaMinutes} min`
              : `${remainingDistanceFt} ft • ${etaMinutes} min`}
          </p>
        </div>
      </div>

      {trackingEnabled && experimentalEnabled && (
        <div className="flex items-center justify-between rounded-lg border border-border p-3 bg-background/70 text-sm text-muted-foreground">
          <span>
            Steps detected: <span className="font-semibold text-foreground">{stepCount}</span>
          </span>
          <span
            className={`flex items-center gap-1.5 font-semibold text-xs px-3 py-1 rounded-full transition-all duration-500 ${
              isFacingCorrectDirection
                ? "bg-green-100 text-green-700 border border-green-300"
                : "bg-red-100 text-red-700 border border-red-300"
            }`}
          >
            {isFacingCorrectDirection ? (
              <><Navigation className="w-3 h-3" /> Right Direction</>
            ) : (
              <><AlertTriangle className="w-3 h-3 animate-pulse" /> Wrong Direction</>
            )}
          </span>
        </div>
      )}

      <div className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3">
        <p className="text-xs uppercase tracking-wide text-primary mb-1 flex items-center gap-2">
          <Compass className="w-3.5 h-3.5" /> Next instruction
        </p>
        <p className="font-medium text-foreground">
          {nextInstruction}
        </p>
      </div>
    </section>
  );
};