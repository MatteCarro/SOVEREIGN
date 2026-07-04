"use client";

import { WorldMap } from "@/components/map/WorldMap";

/** Non-interactive decorative map for the landing page. */
export function LandingMap() {
  return <WorldMap data={null} mode="politico" interactive={false} className="scale-110" />;
}
