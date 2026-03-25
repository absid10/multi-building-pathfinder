import React from 'react';

interface CampusPreviewProps {
  mapName: string;
  buildingCount: number;
  floorCount: number;
}

export default function CampusPreview({ mapName, buildingCount, floorCount }: CampusPreviewProps) {
  // Generate simple building shapes for preview
  const buildings = Array.from({ length: buildingCount }, (_, i) => ({
    id: i,
    x: (i % 2) * 120 + 60,
    y: Math.floor(i / 2) * 120 + 60,
    width: 100,
    height: 80,
    label: `Building ${i + 1}`,
    color: ['#3b82f6', '#059669', '#dc2626'][i % 3],
  }));

  return (
    <div className="relative h-64 w-full overflow-hidden rounded-lg bg-gradient-to-br from-slate-50 to-slate-100">
      <svg
        viewBox="0 0 400 300"
        className="h-full w-full"
        style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)' }}
      >
        {/* Grid background */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#cbd5e1" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="400" height="300" fill="url(#grid)" opacity="0.3" />

        {/* Buildings */}
        {buildings.map((building) => (
          <g key={building.id}>
            {/* Building shadow */}
            <rect
              x={building.x + 2}
              y={building.y + 2}
              width={building.width}
              height={building.height}
              fill="#00000015"
              rx="4"
            />

            {/* Main building */}
            <rect
              x={building.x}
              y={building.y}
              width={building.width}
              height={building.height}
              fill={building.color}
              opacity="0.8"
              rx="4"
              stroke="#ffffff"
              strokeWidth="2"
            />

            {/* Floor indicators (small squares) */}
            {Array.from({ length: Math.min(floorCount, 3) }, (_, f) => (
              <rect
                key={`floor-${f}`}
                x={building.x + 8 + f * 28}
                y={building.y + 12}
                width="20"
                height="20"
                fill="#ffffff30"
                rx="2"
                stroke="#ffffff"
                strokeWidth="1"
              />
            ))}

            {/* Building label */}
            <text
              x={building.x + building.width / 2}
              y={building.y + building.height / 2 + 15}
              textAnchor="middle"
              className="fill-white text-xs font-bold"
              style={{ pointerEvents: 'none' }}
            >
              {building.label}
            </text>

            {/* Floor count badge */}
            <circle
              cx={building.x + building.width - 8}
              cy={building.y + 8}
              r="8"
              fill="#ffffff"
              opacity="0.9"
            />
            <text
              x={building.x + building.width - 8}
              y={building.y + 12}
              textAnchor="middle"
              className="fill-slate-700 text-xs font-bold"
              style={{ pointerEvents: 'none' }}
            >
              {floorCount}
            </text>
          </g>
        ))}

        {/* Title */}
        <text
          x="10"
          y="25"
          className="fill-slate-700 text-xs font-semibold"
          style={{ pointerEvents: 'none' }}
        >
          Campus Overview
        </text>

        {/* Legend */}
        <g>
          <text
            x="10"
            y="280"
            className="fill-slate-600 text-xs"
            style={{ pointerEvents: 'none' }}
          >
            ■ Buildings | ■ Floors per building
          </text>
        </g>
      </svg>

      {/* Info overlay */}
      <div className="absolute bottom-3 right-3 rounded bg-white/90 px-3 py-1.5 text-xs text-slate-700 font-medium shadow-sm backdrop-blur-sm">
        {buildingCount} Building{buildingCount !== 1 ? 's' : ''} • {floorCount} Floor{floorCount !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
