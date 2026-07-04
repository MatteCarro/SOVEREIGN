"use client";

import * as React from "react";
import { geoNaturalEarth1, geoPath, GeoPermissibleObjects } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import { NUMERIC_TO_A3, A3_NAMES } from "@/lib/countries/isoMap";
import { MapMode } from "@/lib/client/gameStore";
import { countryFill, MapViewData } from "./mapColors";
import { CountryTooltip, TooltipData } from "./CountryTooltip";
import { CapitalMarker } from "./CapitalMarker";
import { pairKey } from "@/lib/types";

/**
 * Interactive world map: SVG + d3-geo (Natural Earth projection).
 * Zoom (wheel/pinch buttons), pan (drag), selection, hover tooltips,
 * color modes and animated crisis indicators. Geometry: world-atlas
 * (Natural Earth, public domain).
 */

interface CountryFeature {
  type: "Feature";
  id: string;
  properties: { name?: string };
  geometry: GeoPermissibleObjects;
}

let topoCache: Promise<CountryFeature[]> | null = null;

function loadFeatures(): Promise<CountryFeature[]> {
  if (!topoCache) {
    topoCache = fetch("/map/countries-110m.json")
      .then((r) => r.json())
      .then((topo: Topology<{ countries: GeometryCollection<{ name?: string }> }>) => {
        const collection = feature(topo, topo.objects.countries) as unknown as {
          features: CountryFeature[];
        };
        return collection.features;
      });
  }
  return topoCache;
}

const WIDTH = 960;
const HEIGHT = 470;

export interface WorldMapProps {
  data: MapViewData | null;
  mode: MapMode;
  selectedCountryId?: string | null;
  onSelect?: (countryId: string) => void;
  interactive?: boolean;
  className?: string;
}

export function WorldMap({
  data,
  mode,
  selectedCountryId,
  onSelect,
  interactive = true,
  className,
}: WorldMapProps) {
  const [features, setFeatures] = React.useState<CountryFeature[]>([]);
  const [tooltip, setTooltip] = React.useState<TooltipData | null>(null);
  const [transform, setTransform] = React.useState({ x: 0, y: 0, k: 1 });
  const dragRef = React.useRef<{ startX: number; startY: number; x: number; y: number } | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const movedRef = React.useRef(false);

  React.useEffect(() => {
    let mounted = true;
    loadFeatures().then((f) => mounted && setFeatures(f));
    return () => {
      mounted = false;
    };
  }, []);

  const projection = React.useMemo(
    () => geoNaturalEarth1().fitExtent([[4, 4], [WIDTH - 4, HEIGHT - 4]], { type: "Sphere" }),
    [],
  );
  const path = React.useMemo(() => geoPath(projection), [projection]);

  const paths = React.useMemo(
    () =>
      features.map((f) => ({
        id: NUMERIC_TO_A3[String(f.id).padStart(3, "0")] ?? null,
        d: path(f.geometry) ?? "",
        name: f.properties?.name,
      })),
    [features, path],
  );

  const clampTransform = (t: { x: number; y: number; k: number }) => {
    const k = Math.min(10, Math.max(1, t.k));
    const maxX = (WIDTH * (k - 1)) / 2 + 80 * k;
    const maxY = (HEIGHT * (k - 1)) / 2 + 60 * k;
    return {
      k,
      x: Math.min(maxX, Math.max(-maxX, t.x)),
      y: Math.min(maxY, Math.max(-maxY, t.y)),
    };
  };

  const zoomAt = (factor: number, cx = WIDTH / 2, cy = HEIGHT / 2) => {
    setTransform((t) => {
      const k = Math.min(10, Math.max(1, t.k * factor));
      const scale = k / t.k;
      return clampTransform({
        k,
        x: cx - scale * (cx - t.x),
        y: cy - scale * (cy - t.y),
      });
    });
  };

  const svgPoint = (event: React.PointerEvent | React.WheelEvent): [number, number] => {
    const rect = containerRef.current!.getBoundingClientRect();
    return [
      ((event.clientX - rect.left) / rect.width) * WIDTH,
      ((event.clientY - rect.top) / rect.height) * HEIGHT,
    ];
  };

  const handleWheel = (event: React.WheelEvent) => {
    if (!interactive) return;
    const [cx, cy] = svgPoint(event);
    zoomAt(event.deltaY < 0 ? 1.25 : 0.8, cx, cy);
  };

  const handlePointerDown = (event: React.PointerEvent) => {
    if (!interactive) return;
    movedRef.current = false;
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      x: transform.x,
      y: transform.y,
    };
    (event.target as Element).setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    if (!dragRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dx = ((event.clientX - dragRef.current.startX) / rect.width) * WIDTH;
    const dy = ((event.clientY - dragRef.current.startY) / rect.height) * HEIGHT;
    if (Math.abs(dx) + Math.abs(dy) > 3) movedRef.current = true;
    setTransform((t) =>
      clampTransform({ k: t.k, x: dragRef.current!.x + dx, y: dragRef.current!.y + dy }),
    );
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  const handleHover = (event: React.PointerEvent, id: string | null) => {
    if (!interactive || !data || !id || !data.countries[id]) {
      setTooltip(null);
      return;
    }
    const rect = containerRef.current!.getBoundingClientRect();
    setTooltip({
      countryId: id,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  };

  // Overlay indicators (wars, crises, sanctions, mobilization, nuclear).
  const markers = React.useMemo(() => {
    if (!data) return [];
    const out: { id: string; x: number; y: number; kind: "war" | "crisis" | "sanction" | "mobilization" | "nuclear" | "capital"; name: string }[] = [];
    const atWar = new Set<string>();
    for (const war of data.wars) {
      if (war.status === "active") {
        atWar.add(war.attacker);
        atWar.add(war.defender);
      }
    }
    const sanctioned = new Set(data.sanctions.filter((s) => s.active).map((s) => s.target));
    for (const country of Object.values(data.countries)) {
      const projected = projection(country.capitalCoords);
      if (!projected) continue;
      const [x, y] = projected;
      const important = country.control === "player" || country.control === "available";
      if (atWar.has(country.id)) out.push({ id: country.id, x, y, kind: "war", name: country.name });
      else if (country.stats.nuclearPosture >= 60) out.push({ id: country.id, x, y, kind: "nuclear", name: country.name });
      else if (important && country.stats.stability < 30) out.push({ id: country.id, x, y, kind: "crisis", name: country.name });
      else if (important && country.stats.militaryReadiness >= 75) out.push({ id: country.id, x, y, kind: "mobilization", name: country.name });
      else if (sanctioned.has(country.id) && important) out.push({ id: country.id, x, y, kind: "sanction", name: country.name });
      else if (important) out.push({ id: country.id, x, y, kind: "capital", name: country.capital });
    }
    return out;
  }, [data, projection]);

  // Alliance lines (alleanze mode only).
  const allianceLines = React.useMemo(() => {
    if (!data || mode !== "alleanze" || !data.myCountryId) return [];
    const me = data.countries[data.myCountryId];
    if (!me) return [];
    const from = projection(me.capitalCoords);
    if (!from) return [];
    return data.treaties
      .filter(
        (t) =>
          t.status === "active" &&
          t.type === "alliance" &&
          t.parties.includes(data.myCountryId!),
      )
      .map((t) => {
        const other = t.parties[0] === data.myCountryId ? t.parties[1] : t.parties[0];
        const target = data.countries[other];
        const to = target ? projection(target.capitalCoords) : null;
        return to ? { id: t.id, x1: from[0], y1: from[1], x2: to[0], y2: to[1] } : null;
      })
      .filter((l): l is NonNullable<typeof l> => Boolean(l));
  }, [data, mode, projection]);

  const fillFor = (id: string | null): string => {
    if (!id || !data) return "hsl(220 14% 17%)";
    return countryFill(id, mode, data);
  };

  const warPairs = React.useMemo(() => {
    if (!data) return new Set<string>();
    return new Set(
      data.wars.filter((w) => w.status === "active").map((w) => pairKey(w.attacker, w.defender)),
    );
  }, [data]);
  void warPairs;

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full select-none overflow-hidden ${interactive ? "" : "map-noninteractive pointer-events-none"} ${className ?? ""}`}
    >
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-full w-full touch-none"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => {
          handlePointerUp();
          setTooltip(null);
        }}
      >
        <defs>
          <radialGradient id="ocean" cx="50%" cy="38%" r="75%">
            <stop offset="0%" stopColor="hsl(218 32% 12%)" />
            <stop offset="100%" stopColor="hsl(220 24% 8%)" />
          </radialGradient>
          <pattern id="graticule" width="26" height="26" patternUnits="userSpaceOnUse">
            <path d="M 26 0 L 0 0 0 26" fill="none" stroke="hsl(215 30% 16%)" strokeWidth="0.35" />
          </pattern>
        </defs>
        <rect width={WIDTH} height={HEIGHT} fill="url(#ocean)" />
        <rect width={WIDTH} height={HEIGHT} fill="url(#graticule)" opacity="0.5" />
        <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
          {paths.map((p, index) => {
            const isSelected = p.id !== null && p.id === selectedCountryId;
            const isMine = p.id !== null && data?.myCountryId === p.id;
            return (
              <path
                key={p.id ?? `f${index}`}
                d={p.d}
                className="map-country"
                fill={fillFor(p.id)}
                stroke={isSelected ? "hsl(38 80% 65%)" : isMine ? "hsl(38 55% 50%)" : "hsl(220 20% 9%)"}
                strokeWidth={(isSelected ? 1.4 : isMine ? 0.9 : 0.45) / transform.k}
                onClick={() => {
                  if (interactive && !movedRef.current && p.id && onSelect && data?.countries[p.id]) {
                    onSelect(p.id);
                  }
                }}
                onPointerMove={(event) => handleHover(event, p.id)}
                onPointerLeave={() => setTooltip(null)}
              >
                {!data && p.id && <title>{A3_NAMES[p.id] ?? p.id}</title>}
              </path>
            );
          })}
          {allianceLines.map((line) => (
            <line
              key={line.id}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke="hsl(150 45% 45%)"
              strokeWidth={1 / transform.k}
              strokeDasharray={`${4 / transform.k} ${3 / transform.k}`}
              opacity={0.8}
            />
          ))}
          {markers.map((marker) => (
            <CapitalMarker key={`${marker.id}-${marker.kind}`} {...marker} zoom={transform.k} />
          ))}
        </g>
      </svg>

      {interactive && (
        <div className="absolute bottom-3 right-3 flex flex-col gap-1">
          <button
            className="h-8 w-8 rounded-md border border-border bg-panel/90 text-lg leading-none text-muted hover:text-foreground"
            onClick={() => zoomAt(1.4)}
            aria-label="Zoom avanti"
          >
            +
          </button>
          <button
            className="h-8 w-8 rounded-md border border-border bg-panel/90 text-lg leading-none text-muted hover:text-foreground"
            onClick={() => zoomAt(0.7)}
            aria-label="Zoom indietro"
          >
            −
          </button>
        </div>
      )}

      {tooltip && data && (
        <CountryTooltip data={data} tooltip={tooltip} />
      )}
    </div>
  );
}
