import { buildingMaps } from "@/data/buildingMaps";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MapPin,
  Navigation,
  RotateCcw,
  XCircle,
  Layers3,
  Building2,
} from "lucide-react";

interface DestinationSelectorProps {
  selectedDestination: string | null;
  onDestinationChange: (poiId: string) => void;
  onReset: () => void;
  hasCurrentLocation: boolean;
  hasPath: boolean;
  selectedFloor: string;

  // 🟩 UX props
  activeFloors?: string[];
  onCancelRoute?: () => void;
}

export const DestinationSelector = ({
  selectedDestination,
  onDestinationChange,
  onReset,
  hasCurrentLocation,
  hasPath,
  selectedFloor,
  activeFloors = [],
  onCancelRoute,
}: DestinationSelectorProps) => {
  const isMultiFloorRoute = activeFloors.length > 1;

  return (
    <div className="bg-card rounded-lg shadow-lg border border-border p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Navigation className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-bold text-foreground">
          Navigation — {selectedFloor === "floor1" ? "Ground Floor" : "First Floor"}
        </h2>
      </div>

      {/* 🟩 Multi-floor route banner */}
      {isMultiFloorRoute && (
        <div className="flex items-center gap-3 bg-primary/10 border border-primary/30 text-primary rounded-md p-3">
          <Layers3 className="w-5 h-5" />
          <div className="text-sm">
            <span className="font-semibold">Active Route:</span> Multi-Floor Navigation
            <br />
            <span className="text-xs text-muted-foreground">
              Floors:{" "}
              {activeFloors
                .map((f) => f.replace("buildingA-", "A ").replace("buildingB-", "B "))
                .join(" → ")}
            </span>
          </div>
        </div>
      )}

      {/* Destination Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">
          Select Destination
        </label>

        <Select
          value={selectedDestination || ""}
          onValueChange={onDestinationChange}
          disabled={!hasCurrentLocation}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose a destination..." />
          </SelectTrigger>

          <SelectContent>
            {/* 🏢 Group by Building → Floor */}
            {Object.entries(buildingMaps).map(([buildingKey, building]) => (
              <div key={buildingKey}>
                <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/40 border-t border-border flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {building.name}
                </div>

                {Object.entries(building.floors).map(([floorKey, floorMap]) => (
                  <div key={floorKey}>
                    <div className="px-4 py-1 text-xs font-semibold text-muted-foreground">
                      {floorMap.name}
                    </div>
                    {floorMap.pois.map((poi) => (
                      <SelectItem key={poi.id} value={poi.id}>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          {poi.name}
                        </div>
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </SelectContent>
        </Select>

        {!hasCurrentLocation && (
          <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">
            Click on the map to set your current location first.
          </p>
        )}
      </div>

      {/* 🟩 Active Route Controls */}
      {hasPath && (
        <div className="pt-3 border-t border-border space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={onReset} variant="outline" className="flex-1">
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset Navigation
            </Button>

            {isMultiFloorRoute && onCancelRoute && (
              <Button onClick={onCancelRoute} variant="destructive" className="flex-1">
                <XCircle className="w-4 h-4 mr-2" />
                Cancel Route
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="pt-3 border-t border-border space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Controls:</h3>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• Tap on the map to set your current location.</li>
          <li>• Select a destination from any building & floor.</li>
          <li>• Scroll or pinch to zoom in/out.</li>
          <li>• Shift + Drag (desktop) to pan the map.</li>
        </ul>
      </div>
    </div>
  );
};
