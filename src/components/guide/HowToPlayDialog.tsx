"use client";

import * as React from "react";
import {
  UserRound, PlusCircle, MapPin, Play, Swords, MessageSquare,
  Zap, Gavel, CheckCircle2,
} from "lucide-react";
import { Dialog, DialogHeader } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

/**
 * "Come si gioca": step-by-step guide reachable from the landing page,
 * the lobby and the in-game menu. Pure explanatory content — no game state.
 */

const STEPS = [
  {
    icon: <UserRound size={16} />,
    title: "1. Scegli il tuo nome",
    text: "Nella lobby, scrivi il tuo nome da leader nel primo campo in alto. È obbligatorio: senza nome non puoi creare o entrare in una partita.",
  },
  {
    icon: <PlusCircle size={16} />,
    title: "2. Crea una partita (o entra)",
    text: "Premi «Crea nuova partita», dai un nome alla partita, scegli la durata del turno e i giocatori massimi, poi conferma. In alternativa entra in una partita pubblica dalla lista, o inserisci un codice invito di 6 caratteri.",
  },
  {
    icon: <MapPin size={16} />,
    title: "3. Scegli il tuo paese",
    text: "Si apre la mappa del mondo: clicca un paese disponibile (o cercalo nella lista) e premi «Guida [paese]». Vedrai leader, statistiche e punti di forza prima di decidere.",
  },
  {
    icon: <Play size={16} />,
    title: "4. Avvia la partita",
    text: "Quando tutti i giocatori hanno scelto un paese, l'host preme «Avvia partita». Puoi invitare altri condividendo il codice invito mostrato in alto.",
  },
  {
    icon: <Zap size={16} />,
    title: "5. Agisci nel turno",
    text: "Hai 6 punti azione (PA) a turno. Dal pannello «Azioni» in basso scegli mosse di diplomazia, economia, politica interna, intelligence o difesa. Ogni azione mostra costo, rischi e requisiti.",
  },
  {
    icon: <MessageSquare size={16} />,
    title: "6. Fai diplomazia",
    text: "Seleziona un paese sulla mappa e apri la chat (pannello «Messaggi», costa 1 PA a messaggio). Il tono dei tuoi messaggi viene analizzato a fine turno e influenza le relazioni.",
  },
  {
    icon: <CheckCircle2 size={16} />,
    title: "7. Conferma le azioni",
    text: "Quando hai finito, premi «Conferma azioni» in alto. Il turno si risolve quando tutti confermano, allo scadere del timer, oppure quando l'host preme «Risolvi turno».",
  },
  {
    icon: <Gavel size={16} />,
    title: "8. Leggi le conseguenze",
    text: "Alla risoluzione appare il report del turno: cosa è cambiato, perché, e l'analisi diplomatica dell'AI. Ogni effetto è trasparente e motivato.",
  },
];

export function HowToPlayDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} wide>
      <DialogHeader
        title={
          <span className="flex items-center gap-2">
            <Swords size={16} className="text-accent" /> Come si gioca a SOVEREIGN
          </span>
        }
        subtitle="Guida rapida in 8 passi — dalla creazione della partita alla risoluzione del turno."
      />
      <div className="space-y-3 p-5">
        <p className="rounded-md border border-info/30 bg-info/5 px-3 py-2 text-xs leading-relaxed text-info">
          SOVEREIGN è un gioco di strategia geopolitica a turni. Guidi un paese e competi con altri
          giocatori (e governi gestiti dall&apos;AI) attraverso diplomazia, economia, intrighi e — se serve — la guerra.
          Non c&apos;è una condizione di vittoria unica: sopravvivi, prospera, domina o fai da mediatore.
        </p>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {STEPS.map((step) => (
            <div key={step.title} className="rounded-md border border-border bg-surface/60 p-3">
              <div className="mb-1 flex items-center gap-2 text-accent">
                {step.icon}
                <span className="text-sm font-semibold text-foreground">{step.title}</span>
              </div>
              <p className="text-[11px] leading-relaxed text-muted">{step.text}</p>
            </div>
          ))}
        </div>
        <div className="rounded-md border border-border bg-surface/40 p-3 text-[11px] leading-relaxed text-muted">
          <span className="font-semibold text-foreground">Suggerimento:</span> passa il mouse su
          qualsiasi valore (Stabilità, Influenza, Tensione…) per leggere cosa significa. Il pannello
          «Log del turno» spiega sempre cosa è cambiato e perché.
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant="accent"><Zap size={10} /> PA = punti azione</Badge>
            <Badge variant="muted">Tensione = vicinanza a una crisi</Badge>
            <Badge variant="muted">Influenza = peso diplomatico</Badge>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
