import React from "react";

interface CampusMapProps {
  onSelectBuilding: (buildingId: string) => void;
  isNavigating: boolean;
}

export const CampusMap: React.FC<CampusMapProps> = ({
  onSelectBuilding,
  isNavigating,
}) => {
  return (
    <div className="w-full h-[70vh] bg-[hsl(var(--map-bg))] rounded-lg border-2 border-border shadow-lg flex items-center justify-center">
      <svg
        viewBox="0 0 1132 801" // Set to your "outer map boundry"
        className="w-full h-full"
      >
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
            className="cursor-pointer hover:opacity-100 transition"
            onClick={() => onSelectBuilding("buildingA")}
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
            className="cursor-pointer hover:opacity-100 transition"
            onClick={() => onSelectBuilding("buildingB")}
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
      </svg>
    </div>
  );
};