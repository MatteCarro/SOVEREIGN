"use client";

import * as React from "react";
import { Send, ChevronLeft, Zap } from "lucide-react";
import { GameView } from "@/lib/view";
import { pairKey } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { api, ApiError } from "@/lib/client/api";
import { refreshGame, useGameStore } from "@/lib/client/gameStore";

/**
 * Diplomatic chat: thread list + conversation. Sending costs 1 AP and the
 * message is analyzed (as untrusted content) by the AI at turn end.
 */
export function DiplomacyChat({ view }: { view: GameView }) {
  const { chatCountryId, setChatCountryId } = useGameStore();
  if (!view.myCountryId) return null;
  return chatCountryId ? (
    <DiplomaticThread view={view} otherId={chatCountryId} onBack={() => setChatCountryId(null)} />
  ) : (
    <ThreadList view={view} onOpen={setChatCountryId} />
  );
}

function ThreadList({ view, onOpen }: { view: GameView; onOpen: (countryId: string) => void }) {
  const my = view.myCountryId!;
  const threads = [...view.threads]
    .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt))
    .map((thread) => {
      const other = thread.participants.find((p) => p !== my)!;
      const last = [...view.messages]
        .filter((m) => m.threadId === thread.id)
        .pop();
      return { thread, other, last };
    })
    .filter((t) => view.countries[t.other]);

  const [search, setSearch] = React.useState("");
  const candidates = Object.values(view.countries)
    .filter(
      (c) =>
        c.id !== my &&
        (c.control === "player" || c.control === "ai") &&
        c.name.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => (a.control === "player" ? -1 : 1) - (b.control === "player" ? -1 : 1) || a.name.localeCompare(b.name))
    .slice(0, 8);

  return (
    <div className="space-y-3">
      {threads.length > 0 && (
        <div className="space-y-1.5">
          {threads.map(({ thread, other, last }) => (
            <button
              key={thread.id}
              onClick={() => onOpen(other)}
              className="w-full rounded-md border border-border bg-surface/60 p-2.5 text-left hover:border-border-strong"
            >
              <div className="flex items-center justify-between text-xs font-medium">
                <span>
                  {view.countries[other].flag} {view.countries[other].name}
                </span>
                <span className="text-[10px] text-faint">T{last?.turn}</span>
              </div>
              {last && (
                <p className="mt-0.5 truncate text-[11px] text-muted">
                  {last.fromCountryId === my ? "Tu: " : ""}
                  {last.body}
                </p>
              )}
            </button>
          ))}
        </div>
      )}
      <div>
        <h3 className="mb-1.5 text-[10px] uppercase tracking-wide text-faint">Nuovo canale diplomatico</h3>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cerca un paese..."
          className="mb-1.5 h-8 w-full rounded-md border border-border bg-surface px-2.5 text-xs placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <div className="space-y-1">
          {candidates.map((c) => (
            <button
              key={c.id}
              onClick={() => onOpen(c.id)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-raised/60"
            >
              <span>{c.flag}</span>
              <span className="flex-1">{c.name}</span>
              <span className="text-[10px] text-faint">{c.control === "player" ? "giocatore" : "AI"}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DiplomaticThread({
  view,
  otherId,
  onBack,
}: {
  view: GameView;
  otherId: string;
  onBack: () => void;
}) {
  const my = view.myCountryId!;
  const other = view.countries[otherId];
  const [body, setBody] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const setError = useGameStore((s) => s.setError);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  const messages = view.messages
    .filter((m) => pairKey(m.fromCountryId, m.toCountryId) === pairKey(my, otherId))
    .sort((a, b) => a.at.localeCompare(b.at));

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = async () => {
    if (body.trim().length === 0 || busy) return;
    setBusy(true);
    try {
      await api.post(`/api/games/${view.id}/messages`, { toCountryId: otherId, body: body.trim() });
      setBody("");
      await refreshGame(view.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Errore nell'invio.");
    } finally {
      setBusy(false);
    }
  };

  const myAp = view.countries[my].stats.actionPoints;
  const isAI = other?.control === "ai";

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-center gap-2">
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onBack}>
          <ChevronLeft size={14} />
        </Button>
        <span className="text-sm font-medium">
          {other?.flag} {other?.name}
        </span>
        {isAI && <span className="text-[10px] text-faint">governo AI</span>}
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        {messages.length === 0 && (
          <p className="py-8 text-center text-xs text-muted">
            Canale riservato con {other?.name}. Il tono dei messaggi influenzerà
            l&apos;analisi diplomatica del turno.
          </p>
        )}
        {messages.map((message) => {
          const mine = message.fromCountryId === my;
          return (
            <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                  mine
                    ? "rounded-br-sm bg-accent/15 text-foreground"
                    : "rounded-bl-sm border border-border bg-surface"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{message.body}</p>
                <div className="mt-1 text-right text-[9px] text-faint">Turno {message.turn}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="mt-2 space-y-1.5">
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) send();
          }}
          placeholder={`Scrivi a ${other?.name}...`}
          maxLength={1200}
          className="min-h-[60px] text-xs"
        />
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-[10px] text-faint" title="Ogni messaggio costa 1 punto azione">
            <Zap size={10} className="text-accent" /> costo: 1 PA (hai {myAp})
          </span>
          <Button size="sm" disabled={busy || body.trim().length === 0 || myAp < 1} onClick={send}>
            <Send size={12} /> Invia
          </Button>
        </div>
        {isAI && (
          <p className="text-[10px] text-faint">
            I governi AI non rispondono in chat, ma il tuo tono conta nell&apos;analisi del turno
            e nelle loro decisioni sui trattati.
          </p>
        )}
      </div>
    </div>
  );
}
