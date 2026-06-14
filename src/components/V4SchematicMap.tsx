"use client";

import { countries } from "@/lib/data";

type ShapeConfig = {
  path: string;
  label: { x: number; y: number };
  dotArea: { x: number; y: number; width: number; height: number; cols: number };
};

type V4SchematicMapProps = {
  compact?: boolean;
  selectedCountrySlug?: string;
  onSelectCountry?: (slug: string) => void;
};

const shapeByCountry: Record<string, ShapeConfig> = {
  poland: {
    path: "M350 45 L520 70 L655 155 L625 285 L470 325 L315 290 L235 185 Z",
    label: { x: 455, y: 178 },
    dotArea: { x: 300, y: 110, width: 270, height: 165, cols: 4 },
  },
  czechia: {
    path: "M150 315 L330 290 L445 345 L405 435 L205 430 L95 365 Z",
    label: { x: 275, y: 370 },
    dotArea: { x: 165, y: 330, width: 245, height: 75, cols: 4 },
  },
  slovakia: {
    path: "M385 390 L570 375 L720 425 L675 500 L485 500 L350 450 Z",
    label: { x: 545, y: 455 },
    dotArea: { x: 405, y: 410, width: 265, height: 55, cols: 4 },
  },
  hungary: {
    path: "M405 490 L635 480 L760 545 L690 610 L480 600 L330 545 Z",
    label: { x: 565, y: 550 },
    dotArea: { x: 375, y: 510, width: 335, height: 60, cols: 5 },
  },
};

const countrySchematicColors: Record<string, string> = {
  poland: "#c18a45",
  hungary: "#4d8581",
  czechia: "#6f6aa8",
  slovakia: "#6a965f",
};

function getRegionPoint(index: number, total: number, area: ShapeConfig["dotArea"]) {
  const cols = area.cols;
  const rows = Math.max(1, Math.ceil(total / cols));
  const col = index % cols;
  const row = Math.floor(index / cols);
  const xStep = cols === 1 ? 0 : area.width / (cols - 1);
  const yStep = rows === 1 ? 0 : area.height / (rows - 1);

  return {
    x: area.x + col * xStep,
    y: area.y + row * yStep,
  };
}

export function V4SchematicMap({ compact = false, selectedCountrySlug, onSelectCountry }: V4SchematicMapProps) {
  const isInteractive = Boolean(onSelectCountry);

  return (
    <div className="overflow-hidden rounded-[24px] border border-[var(--line)] bg-[#edf0e8]">
      <svg
        viewBox="0 0 900 640"
        role="img"
        aria-label="V4 国家与一级行政区示意地图"
        className={`h-full w-full ${compact ? "min-h-[360px]" : "min-h-[520px]"}`}
      >
        <defs>
          <filter id="mapShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="18" stdDeviation="18" floodColor="#20242a" floodOpacity="0.12" />
          </filter>
        </defs>

        <rect width="900" height="640" fill="#edf0e8" />
        <path d="M70 120 C180 45 280 25 390 28 C560 32 730 105 820 230 C905 350 855 505 725 590 C600 670 370 625 205 555 C55 492 0 338 40 230 C50 198 50 160 70 120 Z" fill="#e1e7dd" />

        {countries.map((country) => {
          const shape = shapeByCountry[country.slug];
          const fill = countrySchematicColors[country.slug] ?? "#4f6670";
          const isSelected = selectedCountrySlug === country.slug;

          if (!shape) {
            return null;
          }

          const countryShape = (
            <>
              <path
                d={shape.path}
                fill={fill}
                fillOpacity={isSelected ? "0.92" : "0.68"}
                stroke={isSelected ? "#20242a" : "#ffffff"}
                strokeWidth={isSelected ? "5" : "3"}
                filter="url(#mapShadow)"
                className="transition"
              />
              <text x={shape.label.x} y={shape.label.y} textAnchor="middle" className="pointer-events-none fill-white text-[24px] font-semibold">
                {country.nameZh}
              </text>
              <text x={shape.label.x} y={shape.label.y + 28} textAnchor="middle" className="pointer-events-none fill-white/80 text-[13px] font-semibold">
                {country.regions.length} regions
              </text>
            </>
          );

          return (
            <g key={country.slug}>
              {isInteractive ? (
                <g
                  role="button"
                  tabIndex={0}
                  aria-label={`选择${country.nameZh}`}
                  className="cursor-pointer hover:opacity-95"
                  onClick={() => onSelectCountry?.(country.slug)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      onSelectCountry?.(country.slug);
                    }
                  }}
                >
                  {countryShape}
                </g>
              ) : (
                <a href={`/map`} aria-label={`进入${country.nameZh}交互地图`}>
                  {countryShape}
                </a>
              )}

              {country.regions.map((region, index) => {
                const point = getRegionPoint(index, country.regions.length, shape.dotArea);
                return (
                  <a key={region.slug} href={`/regions/${region.slug}`} aria-label={`打开${region.nameZh}区域档案`}>
                    <circle cx={point.x} cy={point.y} r={isSelected ? "8" : "6"} fill="#ffffff" stroke="#20242a" strokeOpacity="0.35" strokeWidth="1.5" className="transition hover:r-10" />
                    <title>{`${region.nameZh} / ${country.nameZh}`}</title>
                  </a>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
