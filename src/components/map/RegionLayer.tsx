"use client";

import { CountryState } from "@/lib/types";

/**
 * Regional overlay for the selected playable country. Region geometry is
 * abstracted in the MVP (no admin-1 polygons): regions appear as a compact
 * on-map panel with development/unrest signals.
 */
export function RegionLayer({ country }: { country: CountryState }) {
  if (country.regions.length === 0) return null;
  return (
    <div className="pointer-events-none absolute left-3 top-3 z-10 w-52 rounded-md border border-border bg-panel/85 p-2.5 backdrop-blur animate-fade-in">
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
        {country.flag} Regioni — {country.name}
      </div>
      <div className="space-y-1">
        {country.regions.map((region) => (
          <div key={region.id} className="flex items-center justify-between gap-2 text-[10px]">
            <span className="truncate text-foreground">{region.name}</span>
            <span className="flex shrink-0 items-center gap-1.5 font-mono">
              <span className="text-success" title="Sviluppo">{region.development}</span>
              <span
                className={region.unrest >= 35 ? "text-danger" : region.unrest >= 20 ? "text-warning" : "text-muted"}
                title="Malcontento"
              >
                {region.unrest}
              </span>
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 border-t border-border pt-1 text-[9px] text-faint">
        sviluppo · malcontento
      </div>
    </div>
  );
}
