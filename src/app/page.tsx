import Link from "next/link";
import { Globe2, Swords, Landmark, TrendingUp, Sparkles, Eye } from "lucide-react";
import { LandingMap } from "@/components/landing/LandingMap";
import { Button } from "@/components/ui/button";

const PILLARS = [
  {
    icon: <Landmark size={18} />,
    title: "Diplomazia",
    text: "Messaggi riservati, trattati, alleanze e patti di non aggressione. Ogni parola pesa.",
  },
  {
    icon: <Eye size={18} />,
    title: "Intrighi",
    text: "Operazioni di intelligence, campagne di influenza e fughe di notizie. Se ti scoprono, paghi.",
  },
  {
    icon: <Swords size={18} />,
    title: "Guerre",
    text: "La forza è un linguaggio: mobilitazioni, deterrenza e conflitti dal costo altissimo.",
  },
  {
    icon: <TrendingUp size={18} />,
    title: "Economia",
    text: "Bilanci, sanzioni, accordi commerciali e investimenti. La stabilità si compra, e si perde.",
  },
  {
    icon: <Sparkles size={18} />,
    title: "Conseguenze AI",
    text: "Un analista diplomatico AI legge i tuoi messaggi e le tue mosse, e il mondo reagisce.",
  },
];

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Decorative map backdrop */}
      <div className="absolute inset-0 opacity-40">
        <LandingMap />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/30 to-background" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.35em] text-muted">
          <Globe2 size={14} className="text-accent" />
          Strategia geopolitica multiplayer
        </div>
        <h1 className="font-display text-glow text-6xl font-bold tracking-[0.18em] text-foreground sm:text-7xl">
          SOVEREIGN
        </h1>
        <p className="mt-4 font-display text-lg italic text-muted sm:text-xl">
          Il mondo osserva ogni tua mossa.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link href="/lobby">
            <Button size="lg" className="min-w-40">Gioca ora</Button>
          </Link>
          <Link href="/lobby?create=1">
            <Button size="lg" variant="secondary" className="min-w-40">Crea partita</Button>
          </Link>
          <a href="#come-funziona">
            <Button size="lg" variant="ghost">Come funziona</Button>
          </a>
        </div>

        <section id="come-funziona" className="mt-24 w-full">
          <h2 className="mb-6 text-sm uppercase tracking-[0.3em] text-muted">
            Guida il tuo paese attraverso la crisi
          </h2>
          <div className="grid gap-3 text-left sm:grid-cols-2 lg:grid-cols-5">
            {PILLARS.map((pillar) => (
              <div
                key={pillar.title}
                className="rounded-lg border border-border bg-panel/70 p-4 backdrop-blur transition-colors hover:border-border-strong"
              >
                <div className="mb-2 flex items-center gap-2 text-accent">
                  {pillar.icon}
                  <span className="text-sm font-semibold text-foreground">{pillar.title}</span>
                </div>
                <p className="text-xs leading-relaxed text-muted">{pillar.text}</p>
              </div>
            ))}
          </div>
          <p className="mt-10 text-[11px] leading-relaxed text-faint">
            Un mondo alternativo-moderno con leader interamente immaginari. Turni asincroni, regole
            deterministiche e trasparenti, interpretazione narrativa affidata all&apos;AI — mai l&apos;arbitrio.
            <br />
            Dati geografici: Natural Earth (dominio pubblico) via world-atlas.
          </p>
        </section>
      </div>
    </main>
  );
}
