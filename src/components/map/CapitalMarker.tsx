"use client";

/**
 * Capital dot + animated status indicators (war, crisis, sanction,
 * mobilization, nuclear escalation). Rendered inside the map's zoom group.
 */

const COLORS: Record<string, string> = {
  war: "hsl(0 70% 55%)",
  crisis: "hsl(28 85% 55%)",
  sanction: "hsl(48 80% 55%)",
  mobilization: "hsl(15 75% 55%)",
  nuclear: "hsl(275 65% 62%)",
  capital: "hsl(40 25% 72%)",
};

export function CapitalMarker({
  x,
  y,
  kind,
  name,
  zoom,
}: {
  x: number;
  y: number;
  kind: "war" | "crisis" | "sanction" | "mobilization" | "nuclear" | "capital";
  name: string;
  zoom: number;
}) {
  const color = COLORS[kind];
  const r = (kind === "capital" ? 1.3 : 2) / Math.sqrt(zoom);
  const pulse = kind !== "capital" && kind !== "sanction";
  return (
    <g transform={`translate(${x},${y})`}>
      {pulse && (
        <circle r={r * 3} fill="none" stroke={color} strokeWidth={0.8 / zoom} opacity={0.7}>
          <animate attributeName="r" values={`${r};${r * 4}`} dur="1.8s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.7;0" dur="1.8s" repeatCount="indefinite" />
        </circle>
      )}
      <circle r={r} fill={color} stroke="hsl(220 20% 8%)" strokeWidth={0.4 / zoom}>
        <title>{name}</title>
      </circle>
      {zoom >= 3 && (
        <text
          y={-r - 2 / zoom}
          textAnchor="middle"
          fontSize={7 / zoom}
          fill="hsl(40 20% 80%)"
          stroke="hsl(220 20% 8%)"
          strokeWidth={0.25 / zoom}
          paintOrder="stroke"
        >
          {name}
        </text>
      )}
    </g>
  );
}
