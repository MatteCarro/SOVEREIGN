"use client";

import * as React from "react";
import { ChevronUp, ChevronDown, Zap, Coins, Target, AlertTriangle, Trash2, TimerReset } from "lucide-react";
import { GameView } from "@/lib/view";
import { ActionCategory } from "@/lib/types";
import { ActionDef, validateAction } from "@/lib/engine/actions";
import { ACTION_META_LIST, CATEGORY_LABELS } from "./actionMeta";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGameStore, refreshGame } from "@/lib/client/gameStore";
import { api, ApiError } from "@/lib/client/api";
import { ActionConfirmationModal } from "./ActionConfirmationModal";
import { cn } from "@/lib/utils";

const CATEGORIES = Object.keys(CATEGORY_LABELS) as ActionCategory[];

/**
 * Bottom action panel: category tabs, action cards with visible costs,
 * cooldowns, risks and prerequisites; confirmation modal before submit.
 */
export function ActionDrawer({ view }: { view: GameView }) {
  const { drawerOpen, setDrawerOpen, selectedCountryId, pendingActionType, setPendingActionType } =
    useGameStore();
  const [category, setCategory] = React.useState<ActionCategory>("diplomacy");
  const setError = useGameStore((s) => s.setError);
  const me = view.players.find((p) => p.id === view.myPlayerId);
  const country = view.myCountryId ? view.countries[view.myCountryId] : null;
  if (!country) return null;

  const gameDocLike = viewAsDoc(view);
  const actions = ACTION_META_LIST.filter((a) => a.category === category && a.id !== "send_message");
  const locked = Boolean(me?.ready);

  const cancelAction = async (actionId: string) => {
    try {
      await api.del(`/api/games/${view.id}/actions`, { actionId });
      await refreshGame(view.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Errore.");
    }
  };

  const pendingDef = pendingActionType
    ? ACTION_META_LIST.find((a) => a.id === pendingActionType) ?? null
    : null;

  return (
    <>
      <div
        className={cn(
          "pointer-events-auto flex flex-col border-t border-border bg-panel/95 backdrop-blur transition-all duration-300",
          drawerOpen ? "h-[290px]" : "h-9",
        )}
      >
        <button
          className="flex h-9 shrink-0 items-center justify-between px-3 text-xs text-muted hover:text-foreground"
          onClick={() => setDrawerOpen(!drawerOpen)}
        >
          <span className="flex items-center gap-2 font-medium uppercase tracking-wide">
            {drawerOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            Azioni
            <Badge variant="accent" className="normal-case">
              <Zap size={10} /> {country.stats.actionPoints} PA
            </Badge>
            {locked && <Badge variant="success" className="normal-case">Turno confermato</Badge>}
          </span>
          {view.myPendingActions.length > 0 && (
            <span className="text-[11px]">
              {view.myPendingActions.length} azioni in coda per il turno {view.turn}
            </span>
          )}
        </button>

        {drawerOpen && (
          <div className="flex min-h-0 flex-1">
            {/* Categories */}
            <div className="flex w-32 shrink-0 flex-col gap-0.5 border-r border-border p-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={cn(
                    "rounded px-2 py-1.5 text-left text-[11px] font-medium",
                    category === cat ? "bg-accent/15 text-accent" : "text-muted hover:bg-raised/60 hover:text-foreground",
                  )}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
              {view.myPendingActions.length > 0 && (
                <div className="mt-auto border-t border-border pt-1.5">
                  <div className="mb-1 px-1 text-[9px] uppercase tracking-wide text-faint">In coda</div>
                  <div className="max-h-24 space-y-0.5 overflow-y-auto">
                    {view.myPendingActions.map((action) => (
                      <div key={action.id} className="group flex items-center gap-1 rounded bg-surface/60 px-1.5 py-1 text-[10px]">
                        <span className="min-w-0 flex-1 truncate">
                          {ACTION_META_LIST.find((a) => a.id === action.type)?.name ?? action.type}
                          {action.targetCountryId && ` → ${action.targetCountryId}`}
                        </span>
                        {!locked && (
                          <button
                            className="text-faint hover:text-danger"
                            title="Annulla (rimborso PA e fondi)"
                            onClick={() => cancelAction(action.id)}
                          >
                            <Trash2 size={10} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action cards */}
            <div className="grid flex-1 auto-rows-min grid-cols-1 gap-1.5 overflow-y-auto p-2 sm:grid-cols-2 xl:grid-cols-3">
              {actions.map((action) => (
                <ActionCard
                  key={action.id}
                  def={action}
                  view={view}
                  doc={gameDocLike}
                  disabled={locked}
                  selectedCountryId={selectedCountryId}
                  onPick={() => setPendingActionType(action.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {pendingDef && (
        <ActionConfirmationModal
          def={pendingDef}
          view={view}
          onClose={() => setPendingActionType(null)}
        />
      )}
    </>
  );
}

function ActionCard({
  def,
  view,
  doc,
  disabled,
  selectedCountryId,
  onPick,
}: {
  def: ActionDef;
  view: GameView;
  doc: ReturnType<typeof viewAsDoc>;
  disabled: boolean;
  selectedCountryId: string | null;
  onPick: () => void;
}) {
  const my = view.myCountryId!;
  // Pre-validate with the shared engine (server re-validates anyway).
  const target = def.needsTarget ? (selectedCountryId !== my ? selectedCountryId : null) : null;
  const error = validateAction(doc, my, def.id, target, def.needsText ? { body: "x" } : null);
  const targetMissing = def.needsTarget && !target;
  const blocked = Boolean(error) && !targetMissing;
  const cooldownUntil = view.cooldowns[`${my}|${def.id}`];
  const onCooldown = cooldownUntil !== undefined && view.turn < cooldownUntil;

  return (
    <button
      disabled={disabled || blocked}
      onClick={onPick}
      title={error ?? def.description}
      className={cn(
        "flex flex-col gap-1 rounded-md border p-2 text-left transition-colors",
        disabled || blocked
          ? "cursor-not-allowed border-border/60 bg-surface/30 opacity-55"
          : "border-border bg-surface/60 hover:border-accent/50 hover:bg-raised/60",
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-xs font-medium leading-tight">{def.name}</span>
        <span className="flex shrink-0 items-center gap-1">
          <Badge variant="accent" className="px-1.5"><Zap size={9} />{def.apCost}</Badge>
          {def.treasuryCost && (
            <Badge variant="muted" className="px-1.5"><Coins size={9} />{def.treasuryCost}</Badge>
          )}
        </span>
      </div>
      <p className="line-clamp-2 text-[10px] leading-snug text-muted">{def.description}</p>
      <div className="mt-auto flex flex-wrap items-center gap-1.5 text-[9px] text-faint">
        {def.needsTarget && (
          <span className={cn("flex items-center gap-0.5", targetMissing && "text-warning")}>
            <Target size={9} /> {targetMissing ? "seleziona un paese sulla mappa" : view.countries[target!]?.name}
          </span>
        )}
        {def.risk && (
          <span className="flex items-center gap-0.5 text-warning">
            <AlertTriangle size={9} /> rischio
          </span>
        )}
        {onCooldown && (
          <span className="flex items-center gap-0.5 text-info">
            <TimerReset size={9} /> dal turno {cooldownUntil}
          </span>
        )}
        {blocked && !onCooldown && <span className="text-danger">{error}</span>}
      </div>
    </button>
  );
}

/**
 * The engine's validateAction expects a GameDoc; the view is a superset of
 * the fields it reads (countries, relations, treaties, wars, sanctions,
 * cooldowns, turn), so this adapter is safe.
 */
export function viewAsDoc(view: GameView) {
  return view as unknown as Parameters<typeof validateAction>[0];
}
