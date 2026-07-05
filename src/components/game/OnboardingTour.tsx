"use client";

import * as React from "react";
import { MapPin, Zap, MessageSquare, CheckCircle2, Newspaper, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * First-turn tutorial: a sequence of dismissible popups anchored to the
 * key areas of the game screen. Shows once per browser (localStorage);
 * can be reopened from the header menu ("Tutorial").
 */

const STEPS: {
  title: string;
  body: string;
  icon: React.ReactNode;
  /** Where the card sits on screen. */
  pos: string;
  arrow?: string;
}[] = [
  {
    title: "Benvenuto, leader",
    body: "Questa è la plancia di comando del tuo paese. Ti mostro in 5 passi come si gioca. Puoi saltare quando vuoi.",
    icon: <MapPin size={16} />,
    pos: "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
  },
  {
    title: "La mappa del mondo",
    body: "Clicca un paese per selezionarlo e vederne i dettagli. In basso puoi cambiare la modalità colore (diplomatico, militare, tensione…). Zoom con la rotella, trascina per spostarti.",
    icon: <MapPin size={16} />,
    pos: "left-1/2 top-24 -translate-x-1/2",
  },
  {
    title: "Il pannello Azioni",
    body: "In basso trovi le tue mosse, divise per categoria. Hai 6 punti azione (PA) a turno. Ogni azione mostra costo, rischi e requisiti. Alcune richiedono un paese bersaglio: selezionalo prima sulla mappa.",
    icon: <Zap size={16} />,
    pos: "bottom-24 left-1/2 -translate-x-1/2 lg:left-64 lg:translate-x-0",
    arrow: "bottom",
  },
  {
    title: "Diplomazia e messaggi",
    body: "Seleziona un paese e apri «Messaggio» (pannello Messaggi a destra). Ogni messaggio costa 1 PA e il suo tono viene analizzato dall'AI a fine turno: influenza relazioni e trattati.",
    icon: <MessageSquare size={16} />,
    pos: "right-4 top-24 lg:right-[340px]",
  },
  {
    title: "Chiudi il turno",
    body: "Quando hai finito, premi «Conferma azioni» in alto. Il turno si risolve quando confermano tutti i giocatori, allo scadere del timer, o quando l'host preme «Risolvi turno». Poi leggi il report: cosa è cambiato e perché.",
    icon: <CheckCircle2 size={16} />,
    pos: "right-4 top-14",
    arrow: "top",
  },
];

const STORAGE_KEY = "sovereign_tour_done_v1";

export function hasSeenTour(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(STORAGE_KEY) === "1";
}

export function OnboardingTour({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = React.useState(0);

  React.useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  if (!open) return null;
  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  const finish = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Dim + click-through blocker */}
      <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={finish} />
      <div
        className={`absolute z-10 w-[min(92vw,360px)] rounded-xl border border-accent/40 bg-panel p-4 shadow-2xl animate-fade-in ${current.pos}`}
      >
        <button
          onClick={finish}
          className="absolute right-2 top-2 rounded p-1 text-muted hover:text-foreground"
          aria-label="Chiudi tutorial"
        >
          <X size={14} />
        </button>
        <div className="mb-2 flex items-center gap-2 text-accent">
          {current.icon}
          <span className="text-sm font-semibold text-foreground">{current.title}</span>
          <Badge variant="muted" className="ml-auto mr-5">
            {step + 1}/{STEPS.length}
          </Badge>
        </div>
        <p className="text-xs leading-relaxed text-muted">{current.body}</p>
        <div className="mt-3 flex items-center justify-between">
          <button onClick={finish} className="text-[11px] text-faint hover:text-muted">
            Salta il tutorial
          </button>
          <div className="flex gap-1.5">
            {step > 0 && (
              <Button size="sm" variant="ghost" onClick={() => setStep((s) => s - 1)}>
                Indietro
              </Button>
            )}
            <Button size="sm" onClick={() => (last ? finish() : setStep((s) => s + 1))}>
              {last ? "Inizia a giocare" : "Avanti"}
              {!last && <ChevronRight size={13} />}
            </Button>
          </div>
        </div>
        {/* progress dots */}
        <div className="mt-3 flex justify-center gap-1.5">
          {STEPS.map((_, index) => (
            <span
              key={index}
              className={`h-1.5 rounded-full transition-all ${
                index === step ? "w-4 bg-accent" : "w-1.5 bg-border-strong"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export { STORAGE_KEY as TOUR_STORAGE_KEY, Newspaper };
