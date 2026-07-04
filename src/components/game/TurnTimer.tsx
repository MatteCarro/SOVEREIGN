"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import { formatCountdown } from "@/lib/utils";

export function TurnTimer({ turnEndsAt }: { turnEndsAt: string | null }) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!turnEndsAt) {
    return (
      <span className="flex items-center gap-1 text-[11px] text-muted" title="L'host risolve il turno manualmente">
        <Clock size={11} /> manuale
      </span>
    );
  }
  const msLeft = new Date(turnEndsAt).getTime() - now;
  const urgent = msLeft < 60_000;
  return (
    <span
      className={`flex items-center gap-1 font-mono text-[11px] ${urgent ? "text-danger" : "text-muted"}`}
      title="Tempo alla risoluzione del turno"
    >
      <Clock size={11} />
      {msLeft <= 0 ? "risoluzione..." : formatCountdown(msLeft)}
    </span>
  );
}
