import React, { useMemo, useState } from "react";
import { toast } from "sonner";

type OverlayPolygon = {
  id: string;
  points: string;
};

type DragRect = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

interface CampusMapProps {
  onSelectBuilding: (buildingId: string) => void;
  isNavigating: boolean;
  mapId?: string;
  buildingALabel?: string;
  buildingBLabel?: string;
  disableBuildingNavigation?: boolean;
}

export const CampusMap: React.FC<CampusMapProps> = ({
  onSelectBuilding,
  isNavigating,
  mapId,
  buildingALabel,
  buildingBLabel,
  disableBuildingNavigation = false,
}) => {
  const isGeca = (mapId || "").includes("geca");
  const viewWidth = isGeca ? 1200 : 1132;
  const viewHeight = isGeca ? 800 : 801;

  const [areaMode, setAreaMode] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [draftRect, setDraftRect] = useState<DragRect | null>(null);
  const [selectedRect, setSelectedRect] = useState<DragRect | null>(null);
  const [overlayPolygons, setOverlayPolygons] = useState<OverlayPolygon[]>([]);
  const [loadingOverlay, setLoadingOverlay] = useState(false);

  // Approximate campus bounds used to project OSM footprint coordinates.
  const campusBounds = useMemo(
    () =>
      isGeca
        ? { north: 19.9139, south: 19.9065, west: 75.3515, east: 75.3645 }
        : { north: 19.9076, south: 19.9005, west: 75.3365, east: 75.3488 },
    [isGeca]
  );

  const handleBuildingPick = (buildingId: string) => {
    if (areaMode || disableBuildingNavigation) return;
    onSelectBuilding(buildingId);
  };

  const toSvgPoint = (evt: React.MouseEvent<SVGSVGElement>) => {
    const rect = evt.currentTarget.getBoundingClientRect();
    const x = ((evt.clientX - rect.left) / rect.width) * viewWidth;
    const y = ((evt.clientY - rect.top) / rect.height) * viewHeight;
    return { x, y };
  };

  const svgToLatLng = (x: number, y: number) => {
    const lat = campusBounds.north - (y / viewHeight) * (campusBounds.north - campusBounds.south);
    const lng = campusBounds.west + (x / viewWidth) * (campusBounds.east - campusBounds.west);
    return { lat, lng };
  };

  const latLngToSvg = (lat: number, lng: number) => {
    const x = ((lng - campusBounds.west) / (campusBounds.east - campusBounds.west)) * viewWidth;
    const y = ((campusBounds.north - lat) / (campusBounds.north - campusBounds.south)) * viewHeight;
    return { x, y };
  };

  const fetchOsmBuildings = async (rect: DragRect) => {
    const minX = Math.min(rect.x1, rect.x2);
    const maxX = Math.max(rect.x1, rect.x2);
    const minY = Math.min(rect.y1, rect.y2);
    const maxY = Math.max(rect.y1, rect.y2);
    const nw = svgToLatLng(minX, minY);
    const se = svgToLatLng(maxX, maxY);

    const south = Math.min(nw.lat, se.lat);
    const north = Math.max(nw.lat, se.lat);
    const west = Math.min(nw.lng, se.lng);
    const east = Math.max(nw.lng, se.lng);

    const query = `[out:json][timeout:25];(way["building"](${south},${west},${north},${east});relation["building"](${south},${west},${north},${east}););out body geom;`;

    setLoadingOverlay(true);
    try {
      const resp = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: query,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      if (!resp.ok) throw new Error("OSM request failed");
      const data = await resp.json();
      const elements = Array.isArray(data?.elements) ? data.elements : [];

      const polygons: OverlayPolygon[] = elements
        .filter((el: any) => Array.isArray(el.geometry) && el.geometry.length >= 3)
        .map((el: any) => {
          const points = el.geometry
            .map((pt: any) => {
              const projected = latLngToSvg(pt.lat, pt.lon);
              return `${projected.x.toFixed(2)},${projected.y.toFixed(2)}`;
            })
            .join(" ");
          return { id: `osm-${el.type}-${el.id}`, points };
        });

      setOverlayPolygons(polygons);
      toast.success(`Loaded ${polygons.length} OSM building footprints`);
    } catch (_err) {
      toast.error("Could not load OSM footprints for selected area");
    } finally {
      setLoadingOverlay(false);
    }
  };

  const onSvgMouseDown = (evt: React.MouseEvent<SVGSVGElement>) => {
    if (!areaMode) return;
    evt.preventDefault();
    const pt = toSvgPoint(evt);
    setDragStart(pt);
    setDraftRect({ x1: pt.x, y1: pt.y, x2: pt.x, y2: pt.y });
  };

  const onSvgMouseMove = (evt: React.MouseEvent<SVGSVGElement>) => {
    if (!areaMode || !dragStart) return;
    const pt = toSvgPoint(evt);
    setDraftRect({ x1: dragStart.x, y1: dragStart.y, x2: pt.x, y2: pt.y });
  };

  const onSvgMouseUp = async (evt: React.MouseEvent<SVGSVGElement>) => {
    if (!areaMode || !dragStart) return;
    const pt = toSvgPoint(evt);
    const rect = { x1: dragStart.x, y1: dragStart.y, x2: pt.x, y2: pt.y };
    setDragStart(null);
    setDraftRect(null);

    const width = Math.abs(rect.x2 - rect.x1);
    const height = Math.abs(rect.y2 - rect.y1);
    if (width < 18 || height < 18) {
      toast.info("Drag a larger area to fetch OSM footprints");
      return;
    }

    setSelectedRect(rect);
    await fetchOsmBuildings(rect);
  };

  const renderRect = (
    rect: DragRect,
    key: string,
    stroke: string,
    fill: string,
    dasharray: string
  ) => {
    const x = Math.min(rect.x1, rect.x2);
    const y = Math.min(rect.y1, rect.y2);
    const width = Math.abs(rect.x2 - rect.x1);
    const height = Math.abs(rect.y2 - rect.y1);
    return (
      <rect
        key={key}
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        stroke={stroke}
        strokeWidth={1.5}
        strokeDasharray={dasharray}
        className="pointer-events-none"
      />
    );
  };

  return (
    <div className="relative w-full h-[70vh] bg-[hsl(var(--map-bg))] rounded-lg border-2 border-border shadow-lg flex items-center justify-center overflow-hidden">
      <div className="absolute top-3 left-3 z-20 flex flex-wrap gap-2">
        <button
          onClick={() => setAreaMode((v) => !v)}
          className={`px-3 py-1.5 text-xs rounded-md border ${
            areaMode
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-slate-700 border-slate-300"
          }`}
        >
          {areaMode ? "Area Mode: ON" : "Select OSM Area"}
        </button>
        <button
          onClick={() => {
            setOverlayPolygons([]);
            setSelectedRect(null);
          }}
          className="px-3 py-1.5 text-xs rounded-md border bg-white text-slate-700 border-slate-300"
        >
          Clear Overlay
        </button>
        {loadingOverlay && (
          <span className="px-3 py-1.5 text-xs rounded-md border bg-amber-50 text-amber-700 border-amber-300">
            Loading OSM…
          </span>
        )}
      </div>
      <svg
        viewBox={isGeca ? "0 0 1200 800" : "0 0 1132 801"}
        className="w-full h-full"
        onMouseDown={onSvgMouseDown}
        onMouseMove={onSvgMouseMove}
        onMouseUp={onSvgMouseUp}
      >
        {isGeca ? (
          <>
            {/* GECA campus roads */}
            <polyline
              points="120,690 250,610 410,560 560,500 760,430 920,350 1060,290"
              fill="none"
              stroke="#B8B8B8"
              strokeWidth="34"
              strokeLinecap="round"
              className="pointer-events-none"
            />
            <polyline
              points="430,620 500,560 640,560 760,580 900,620"
              fill="none"
              stroke="#C7C7C7"
              strokeWidth="26"
              strokeLinecap="round"
              className="pointer-events-none"
            />

            {/* GECA non-interactive blocks */}
            <rect x="140" y="470" width="170" height="90" rx="10" fill="#7A7A7A" opacity="0.75" className="pointer-events-none" />
            <text x="225" y="523" textAnchor="middle" fontSize="14" fill="white" fontWeight="600" className="pointer-events-none">Hostel</text>

            <rect x="590" y="520" width="140" height="80" rx="10" fill="#7A7A7A" opacity="0.75" className="pointer-events-none" />
            <text x="660" y="567" textAnchor="middle" fontSize="14" fill="white" fontWeight="600" className="pointer-events-none">Library</text>

            {/* GECA interactive blocks */}
            <rect
              x="460"
              y="430"
              width="170"
              height="95"
              rx="10"
              fill="#E3C744"
              stroke="black"
              strokeWidth="2"
              opacity="0.85"
              className={`${disableBuildingNavigation || areaMode ? "cursor-not-allowed" : "cursor-pointer hover:opacity-100"} transition`}
              onClick={() => handleBuildingPick("buildingA")}
            />
            <text x="545" y="485" textAnchor="middle" fontSize="20" fill="black" fontWeight="600" className="pointer-events-none">
              {buildingALabel || "Admin Block"}
            </text>
            {disableBuildingNavigation && (
              <text x="545" y="508" textAnchor="middle" fontSize="12" fill="#333" fontWeight="600" className="pointer-events-none">
                Mapping Pending
              </text>
            )}

            <rect
              x="790"
              y="335"
              width="195"
              height="105"
              rx="10"
              fill="#E3C744"
              stroke="black"
              strokeWidth="2"
              opacity="0.85"
              className={`${disableBuildingNavigation || areaMode ? "cursor-not-allowed" : "cursor-pointer hover:opacity-100"} transition`}
              onClick={() => handleBuildingPick("buildingB")}
            />
            <text x="888" y="396" textAnchor="middle" fontSize="20" fill="black" fontWeight="600" className="pointer-events-none">
              {buildingBLabel || "Academic Block"}
            </text>
            {disableBuildingNavigation && (
              <text x="888" y="420" textAnchor="middle" fontSize="12" fill="#333" fontWeight="600" className="pointer-events-none">
                Mapping Pending
              </text>
            )}

            {isNavigating && (
              <polyline
                points="120,690 250,610 410,560 560,500 760,430 920,350 1060,290"
                fill="none"
                stroke="hsl(var(--path-color))"
                strokeWidth="6"
                strokeDasharray="10 10"
                className="animate-pulse pointer-events-none"
              />
            )}
          </>
        ) : (
          <>
        {/* --- Non-Interactive Scenery --- */}
        
        {/* Inner Ghati Path */}
        <polygon
          title="inner ghati path"
          points="410,737,429,641,437,534,442,287,307,188,305,276,245,365,238,552,219,537,232,366,175,290,176,164,191,175,191,282,238,339,286,274,292,177,195,175,175,161,297,161,417,252,452,269,460,61,464,2,480,0,479,11,853,18,856,29,479,22,467,320,1071,342,1075,357,977,352,972,537,950,538,958,357,709,343,706,527,692,529,697,347,466,339,448,602,630,600,633,616,445,621,423,747"
          fill="#CCCCCC" // ✅ Gray fill
          stroke="black"   // ✅ Black border
          strokeWidth="1.5"
          className="pointer-events-none"
        />
        {/* Outer Main Road */}
        <polygon
          title="out main road"
          points="-1,320,219,535,241,548,415,734,421,748,458,796,429,799,402,755,89,438,-1,349"
          fill="#CCCCCC" // ✅ Gray fill
          stroke="black"   // ✅ Black border
          strokeWidth="1.5"
          className="pointer-events-none"
        />

        {/* Dental Building */}
        <polygon
          points="522,624,527,694,504,694,504,745,519,745,520,802,645,800,646,629"
          fill="#776434" // ✅ Non-interactive color
          opacity="0.8"
          stroke="black"   // ✅ Black border
          strokeWidth="1.5"
          className="pointer-events-none" 
        />
        <text x="584" y="710" textAnchor="middle" fontSize="16" fill="white" fontWeight="600" className="pointer-events-none">Dental</text>
        
        {/* Medical College */}
        <polygon
          points="107,24,107,77,142,78,198,79,225,78,224,108,259,108,334,115,334,137,346,142,349,193,408,197,401,173,382,170,379,147,365,149,364,134,382,137,388,105,367,108,360,79,354,76,351,17,279,18,279,2,221,0,156,1,157,20"
          fill="#776434" // ✅ Non-interactive color
          opacity="0.8"
          stroke="black"   // ✅ Black border
          strokeWidth="1.5"
          className="pointer-events-none"
        />
        <text x="250" y="90" textAnchor="middle" fontSize="16" fill="white" fontWeight="600" className="pointer-events-none">Medical College</text>

        
        {/* --- INTERACTIVE BUILDINGS --- */}
        {/* This group wrapper ensures clicks work */}
        <g>
          {/* OPD (Building A) */}
          <polygon
            points="498,543,535,484,511,476,501,443,529,432,506,375,511,355,535,345,545,352,607,345,607,430,625,430,648,378,677,388,648,432,643,494,671,533,643,548,622,499,607,502,607,582,558,579"
            fill="#E3C744" // ✅ Interactive color
            stroke="black" // ✅ Black border
            strokeWidth="2"
            opacity="0.8"
            className={`${areaMode ? "cursor-not-allowed" : "cursor-pointer hover:opacity-100"} transition`}
            onClick={() => handleBuildingPick("buildingA")}
          />
          <text
            x="585"
            y="465"
            textAnchor="middle"
            fontSize="24"
            fill="black" 
            fontWeight="600"
            className="pointer-events-none"
          >
            OPD
          </text>

          {/* Casualty (Building B) */}
          <polygon
            points="527,115,524,259,537,262,535,283,555,280,555,262,607,265,604,239,545,239,542,221,607,218,607,198,664,200,661,303,708,303,708,198,764,198,762,308,806,308,806,198,868,203,865,319,906,319,906,208,966,208,966,290,1009,285,1009,205,1040,205,1043,316,1030,321,1030,337,1087,334,1084,321,1077,321,1084,321,1079,71,1043,71,1043,195,1009,195,1012,66,963,66,963,192,904,192,909,87,870,87,868,192,808,190,811,115,857,115,855,74,744,74,744,118,764,123,764,187,708,185,710,63,658,61,664,182,607,182,607,164,547,164,545,141,602,141,604,120"
            fill="#E3C744" // ✅ Interactive color
            stroke="black" // ✅ Black border
            strokeWidth="2"
            opacity="0.8"
            className={`${areaMode ? "cursor-not-allowed" : "cursor-pointer hover:opacity-100"} transition`}
            onClick={() => handleBuildingPick("buildingB")}
          />
          <text
            x="800"
            y="190"
            textAnchor="middle"
            fontSize="24"
            fill="black" 
            fontWeight="600"
            className="pointer-events-none"
          >
            Casualty
          </text>
        </g>
        
        {/* --- Navigation Path --- */}
        {isNavigating && (
          <polyline
            points="433,783 409,743 439,622 220,552 93,424 241,350 300,276 182,282 185,170 299,172 460,283 450,453 548,609 617,331 841,340 962,346 964,447 702,460 463,185 471,21 625,23 771,20"
            fill="none"
            stroke="hsl(var(--path-color))"
            strokeWidth="5"
            strokeDasharray="10 10"
            className="animate-pulse pointer-events-none" // ✅ BUG FIX: Made path un-clickable
          />
        )}
          </>
        )}

        {/* OSM building footprint overlays */}
        {overlayPolygons.map((poly) => (
          <polygon
            key={poly.id}
            points={poly.points}
            fill="rgba(56, 189, 248, 0.18)"
            stroke="rgba(14, 116, 144, 0.95)"
            strokeWidth="1.2"
            strokeDasharray="6 4"
            className="pointer-events-none"
          />
        ))}

        {selectedRect &&
          renderRect(
            selectedRect,
            "selected-osm-rect",
            "#0e7490",
            "rgba(34,211,238,0.10)",
            "8 4"
          )}
        {draftRect &&
          renderRect(
            draftRect,
            "draft-osm-rect",
            "#2563eb",
            "rgba(59,130,246,0.10)",
            "8 4"
          )}
      </svg>
    </div>
  );
};