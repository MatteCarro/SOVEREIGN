"use client";

import { create } from "zustand";
import { GameView } from "@/lib/view";
import { api } from "./api";

export type MapMode =
  | "politico"
  | "diplomatico"
  | "stabilita"
  | "economia"
  | "militare"
  | "alleanze"
  | "tensione";

export type LeftTab =
  | "governo" | "diplomazia" | "economia" | "intelligence"
  | "difesa" | "regioni" | "cronologia";

export type RightTab = "notizie" | "messaggi" | "rapporti" | "log";

interface GameStore {
  view: GameView | null;
  error: string | null;
  polling: boolean;
  // UI state
  mapMode: MapMode;
  selectedCountryId: string | null;
  leftTab: LeftTab;
  rightTab: RightTab;
  drawerOpen: boolean;
  /** Mobile: which overlay panel is open. */
  mobilePanel: "left" | "right" | "map" | null;
  pendingActionType: string | null;
  chatCountryId: string | null;
  lastSeenResolutionTurn: number;
  showResolution: boolean;
  compareCountryId: string | null;

  setView: (view: GameView) => void;
  setError: (error: string | null) => void;
  setMapMode: (mode: MapMode) => void;
  selectCountry: (id: string | null) => void;
  setLeftTab: (tab: LeftTab) => void;
  setRightTab: (tab: RightTab) => void;
  setDrawerOpen: (open: boolean) => void;
  setMobilePanel: (panel: "left" | "right" | "map" | null) => void;
  setPendingActionType: (type: string | null) => void;
  setChatCountryId: (id: string | null) => void;
  dismissResolution: () => void;
  setCompareCountryId: (id: string | null) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  view: null,
  error: null,
  polling: false,
  mapMode: "politico",
  selectedCountryId: null,
  leftTab: "governo",
  rightTab: "notizie",
  drawerOpen: false,
  mobilePanel: null,
  pendingActionType: null,
  chatCountryId: null,
  lastSeenResolutionTurn: 0,
  showResolution: false,
  compareCountryId: null,

  setView: (view) => {
    const previous = get().view;
    const latest = view.resolutions[view.resolutions.length - 1];
    let { lastSeenResolutionTurn, showResolution } = get();
    if (previous === null && latest) {
      // Initial load: don't replay old reports.
      lastSeenResolutionTurn = latest.turn;
    } else if (latest && latest.turn > lastSeenResolutionTurn) {
      lastSeenResolutionTurn = latest.turn;
      showResolution = true;
    }
    set({ view, error: null, lastSeenResolutionTurn, showResolution });
  },
  setError: (error) => set({ error }),
  setMapMode: (mapMode) => set({ mapMode }),
  selectCountry: (selectedCountryId) => set({ selectedCountryId }),
  setLeftTab: (leftTab) => set({ leftTab, mobilePanel: "left" }),
  setRightTab: (rightTab) => set({ rightTab }),
  setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
  setMobilePanel: (mobilePanel) => set({ mobilePanel }),
  setPendingActionType: (pendingActionType) => set({ pendingActionType }),
  setChatCountryId: (chatCountryId) => set({ chatCountryId }),
  dismissResolution: () => set({ showResolution: false }),
  setCompareCountryId: (compareCountryId) => set({ compareCountryId }),
}));

/** Version-aware polling loop; call from a useEffect. */
export function startPolling(gameId: string, intervalMs = 2500): () => void {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  async function tick() {
    if (stopped) return;
    const { view, setView, setError } = useGameStore.getState();
    try {
      const since = view?.id === gameId ? view.version : 0;
      const data = await api.get<{ unchanged?: boolean; view?: GameView }>(
        `/api/games/${gameId}?since=${since}`,
      );
      if (!stopped && data.view) setView(data.view);
    } catch (error) {
      if (!stopped) setError(error instanceof Error ? error.message : "Errore di rete");
    }
    if (!stopped) timer = setTimeout(tick, intervalMs);
  }

  tick();
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}

/** Optimistic refresh after any mutation. */
export async function refreshGame(gameId: string) {
  try {
    const data = await api.get<{ view?: GameView }>(`/api/games/${gameId}?since=0`);
    if (data.view) useGameStore.getState().setView(data.view);
  } catch {
    /* polling will recover */
  }
}
