"use client";

import * as React from "react";
import { Landmark, Map as MapIcon, Newspaper, X, HelpCircle } from "lucide-react";
import { GameView } from "@/lib/view";
import { useGameStore } from "@/lib/client/gameStore";
import { WorldMap } from "@/components/map/WorldMap";
import { MapLegend } from "@/components/map/MapLegend";
import { RegionLayer } from "@/components/map/RegionLayer";
import { TopBar } from "./TopBar";
import { LeftSidebar } from "./LeftSidebar";
import { RightSidebar } from "./RightSidebar";
import { ActionDrawer } from "./ActionDrawer";
import { TurnResolutionModal } from "./TurnResolutionModal";
import { CountryComparisonModal } from "./CountryComparisonModal";
import { OnboardingTour, hasSeenTour } from "./OnboardingTour";
import { HowToPlayDialog } from "@/components/guide/HowToPlayDialog";
import { CountryPanel } from "./CountryPanel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Main game layout:
 *   top bar / left sidebar / interactive map / right sidebar / action drawer.
 * On mobile the sidebars become full-screen sheets driven by a bottom nav.
 */
export function GameScreen({ view }: { view: GameView }) {
  const {
    mapMode, setMapMode, selectedCountryId, selectCountry,
    mobilePanel, setMobilePanel, error, setError,
  } = useGameStore();

  const [showTour, setShowTour] = React.useState(false);
  const [showGuide, setShowGuide] = React.useState(false);

  // Auto-show the onboarding tour on the player's first game entry.
  React.useEffect(() => {
    if (view.myCountryId && !hasSeenTour()) {
      const timer = setTimeout(() => setShowTour(true), 700);
      return () => clearTimeout(timer);
    }
  }, [view.myCountryId]);

  const mapData = {
    countries: view.countries,
    relations: view.relations,
    treaties: view.treaties,
    wars: view.wars,
    sanctions: view.sanctions,
    myCountryId: view.myCountryId,
    globalTension: view.globalTension,
  };

  const selectedCountry = selectedCountryId ? view.countries[selectedCountryId] : null;
  const showRegions =
    selectedCountry &&
    (selectedCountry.id === view.myCountryId || selectedCountry.control === "player") &&
    selectedCountry.regions.length > 0;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopBar view={view} />

      {error && (
        <div className="flex items-center justify-between border-b border-danger/30 bg-danger/10 px-3 py-1.5 text-xs text-danger">
          {error}
          <button onClick={() => setError(null)} aria-label="Chiudi errore"><X size={12} /></button>
        </div>
      )}

      <div className="relative flex min-h-0 flex-1">
        {/* Left sidebar (desktop) */}
        <aside className="hidden w-[300px] shrink-0 border-r border-border bg-panel/60 lg:block">
          <LeftSidebar view={view} />
        </aside>

        {/* Center: map + drawer */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="relative min-h-0 flex-1">
            <WorldMap
              data={mapData}
              mode={mapMode}
              selectedCountryId={selectedCountryId}
              onSelect={(id) => selectCountry(id === selectedCountryId ? null : id)}
            />
            {showRegions && <RegionLayer country={selectedCountry} />}
            <div className="absolute bottom-3 left-3 z-10 max-w-[75%]">
              <MapLegend mode={mapMode} onModeChange={setMapMode} />
            </div>
            {selectedCountry && selectedCountry.id !== view.myCountryId && (
              <SelectedCountryChip view={view} countryId={selectedCountry.id} />
            )}
          </div>
          <div className="hidden lg:block">
            <ActionDrawer view={view} />
          </div>
        </div>

        {/* Right sidebar (desktop) */}
        <aside className="hidden w-[330px] shrink-0 border-l border-border bg-panel/60 xl:block">
          <RightSidebar view={view} />
        </aside>

        {/* Mobile sheets */}
        {mobilePanel === "left" && (
          <MobileSheet title="Il tuo paese" onClose={() => setMobilePanel(null)}>
            <LeftSidebar view={view} />
          </MobileSheet>
        )}
        {mobilePanel === "right" && (
          <MobileSheet title="Mondo e messaggi" onClose={() => setMobilePanel(null)}>
            <RightSidebar view={view} />
          </MobileSheet>
        )}
      </div>

      {/* Mobile bottom navigation + drawer */}
      <nav className="flex shrink-0 border-t border-border bg-panel lg:hidden">
        <MobileNavButton
          icon={<Landmark size={16} />}
          label="Governo"
          active={mobilePanel === "left"}
          onClick={() => setMobilePanel(mobilePanel === "left" ? null : "left")}
        />
        <MobileNavButton
          icon={<MapIcon size={16} />}
          label="Mappa"
          active={mobilePanel === null}
          onClick={() => setMobilePanel(null)}
        />
        <MobileNavButton
          icon={<Newspaper size={16} />}
          label="Mondo"
          active={mobilePanel === "right"}
          onClick={() => setMobilePanel(mobilePanel === "right" ? null : "right")}
        />
      </nav>
      <div className="lg:hidden">
        <ActionDrawer view={view} />
      </div>

      <TurnResolutionModal view={view} />
      <CountryComparisonModal view={view} />
      <OnboardingTour open={showTour} onClose={() => setShowTour(false)} />
      <HowToPlayDialog open={showGuide} onClose={() => setShowGuide(false)} />

      {/* Floating help button: reopen the tutorial / guide anytime */}
      <button
        onClick={() => setShowGuide(true)}
        className="fixed bottom-16 right-3 z-40 flex h-9 w-9 items-center justify-center rounded-full border border-border-strong bg-panel/90 text-muted shadow-lg backdrop-blur hover:text-accent lg:bottom-3 lg:right-14"
        title="Come si gioca"
        aria-label="Come si gioca"
      >
        <HelpCircle size={16} />
      </button>
    </div>
  );
}

function SelectedCountryChip({ view, countryId }: { view: GameView; countryId: string }) {
  const { setCompareCountryId, setChatCountryId, setRightTab, setMobilePanel, selectCountry } = useGameStore();
  const country = view.countries[countryId];
  const [expanded, setExpanded] = React.useState(false);
  if (!country) return null;
  return (
    <div className="absolute right-3 top-3 z-10 w-64 animate-fade-in">
      <div className="rounded-md border border-border bg-panel/90 backdrop-blur">
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <button className="flex min-w-0 items-center gap-2 text-left" onClick={() => setExpanded(!expanded)}>
            <span className="text-lg">{country.flag}</span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{country.name}</span>
              <span className="block text-[10px] text-muted">
                {country.control === "player"
                  ? `Giocatore: ${view.players.find((p) => p.countryId === country.id)?.name ?? "?"}`
                  : country.control === "ai" ? "Governo AI" : "Neutrale"}
              </span>
            </span>
          </button>
          <button className="text-faint hover:text-foreground" onClick={() => selectCountry(null)} aria-label="Deseleziona">
            <X size={13} />
          </button>
        </div>
        {expanded && (
          <div className="max-h-[45vh] overflow-y-auto border-t border-border p-3">
            <CountryPanel country={country} view={view} />
          </div>
        )}
        {view.myCountryId && (
          <div className="flex gap-1.5 border-t border-border p-2">
            <Button
              size="sm" variant="secondary" className="flex-1"
              onClick={() => { setChatCountryId(country.id); setRightTab("messaggi"); setMobilePanel("right"); }}
            >
              Messaggio
            </Button>
            <Button size="sm" variant="ghost" className="flex-1" onClick={() => setCompareCountryId(country.id)}>
              Confronta
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function MobileSheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-background animate-slide-up lg:hidden">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-sm font-medium">{title}</span>
        <button onClick={onClose} className="rounded p-1 text-muted hover:text-foreground" aria-label="Chiudi">
          <X size={16} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}

function MobileNavButton({
  icon, label, active, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px]",
        active ? "text-accent" : "text-muted",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
