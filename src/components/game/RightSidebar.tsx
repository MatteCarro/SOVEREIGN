"use client";

import { GameView } from "@/lib/view";
import { RightTab, useGameStore } from "@/lib/client/gameStore";
import { TabBar } from "@/components/ui/tabs";
import { WorldNewsFeed } from "./WorldNewsFeed";
import { DiplomacyChat } from "./DiplomacyChat";
import { PrivateBriefingCard } from "./PrivateBriefingCard";
import { TurnLog } from "./TurnLog";

const TABS: { id: RightTab; label: string }[] = [
  { id: "notizie", label: "Notizie mondiali" },
  { id: "messaggi", label: "Messaggi" },
  { id: "rapporti", label: "Rapporti segreti" },
  { id: "log", label: "Log del turno" },
];

export function RightSidebar({ view }: { view: GameView }) {
  const { rightTab, setRightTab } = useGameStore();
  const briefings = [...view.briefings].reverse();
  const unreadBriefings = briefings.filter((b) => b.turn >= view.turn - 1).length;
  return (
    <div className="flex h-full flex-col">
      <TabBar
        tabs={TABS.map((t) => ({
          ...t,
          badge: t.id === "rapporti" ? unreadBriefings : undefined,
        }))}
        value={rightTab}
        onChange={setRightTab}
        compact
      />
      <div className="flex-1 overflow-y-auto p-3">
        {rightTab === "notizie" && <WorldNewsFeed view={view} />}
        {rightTab === "messaggi" && <DiplomacyChat view={view} />}
        {rightTab === "rapporti" && (
          <div className="space-y-2">
            {briefings.length === 0 && (
              <p className="py-6 text-center text-xs text-muted">
                Nessun rapporto riservato. I tuoi servizi ti informeranno qui.
              </p>
            )}
            {briefings.map((briefing) => (
              <PrivateBriefingCard key={briefing.id} briefing={briefing} />
            ))}
          </div>
        )}
        {rightTab === "log" && <TurnLog view={view} />}
      </div>
    </div>
  );
}
