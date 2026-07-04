# SOVEREIGN

*Il mondo osserva ogni tua mossa.*

SOVEREIGN è un gioco di strategia geopolitica **asincrono e multiplayer** per browser.
Ogni giocatore guida un paese di un mondo alternativo-moderno: diplomazia, stabilità
interna, economia, intelligence, deterrenza e guerre — con un **analista diplomatico AI**
che interpreta messaggi e mosse e genera conseguenze narrative *limitate e validate*.

Costruito con Next.js 15, React 19, TypeScript, Tailwind CSS, Zustand, Zod,
d3-geo + world-atlas (Natural Earth) e l'API Anthropic (`claude-fable-5`).

---

## Architettura in 30 secondi

**L'AI non è mai la fonte di verità delle regole.**

```
DB (JSON locale o Supabase)  ←  unica fonte di verità (GameDoc)
        ↑
Server Next.js (API routes)  ←  valida OGNI azione (proprietà, costi, cooldown, prerequisiti)
        ↑
Motore di regole deterministico  ←  calcola tutti gli effetti "duri" (testato con Vitest)
        ↑
AI resolver (Anthropic o mock)   ←  analizza chat e azioni del turno
        ↓
JSON strutturato → validazione Zod → clamp (±3 max per coppia/turno) → effetti limitati
```

L'AI può produrre solo: segnali diplomatici (tono/intensità), flag temporanei,
eventi mondiali narrativi, briefing privati e un riassunto. **Non può** creare
risorse, eserciti, guerre, territori o alterare numeri di gioco: lo schema Zod
lo rende strutturalmente impossibile e il motore applica comunque dei tetti.
I messaggi dei giocatori sono **contenuto non fidato**: vengono incapsulati in
tag `<untrusted_player_message>` e il prompt istruisce il modello a ignorarne
eventuali istruzioni (testato: l'iniezione non altera lo stato).

### Flusso di risoluzione del turno

1. I giocatori inviano azioni (PA e fondi impegnati subito, rimborsati se l'azione decade).
2. Le azioni si bloccano a fine turno (timer, "Conferma azioni" di tutti, o host).
3. Il server ri-valida proprietà, costi, cooldown e prerequisiti.
4. Il motore deterministico applica gli effetti (ogni delta ha una *ragione* leggibile).
5. Messaggi e azioni del turno vengono riassunti per l'AI.
6. L'AI analizza il turno (Anthropic API, oppure mock euristico senza chiave).
7. L'output AI è validato con Zod; se fallisce → log + fallback deterministico.
8. I segnali AI diventano micro-effetti clampati; eventi e briefing vengono creati.
9. Nuovo stato salvato atomicamente (lock per partita + guardia di idempotenza per turno).
10. I client ricevono l'aggiornamento via polling versionato (~2,5 s).

---

## Avvio rapido (modalità locale, zero configurazione)

Prerequisiti: Node.js 20+.

```bash
npm install
npm run dev
# → http://localhost:3000
```

Senza variabili d'ambiente il gioco è **completo e onesto**:

- **Persistenza**: file JSON per partita in `.data/games/` (creata automaticamente).
- **Multiplayer reale**: tutti i browser collegati allo stesso server condividono le partite.
- **AI**: resolver *mock* euristico (etichettato "AI simulata" nell'interfaccia) che
  analizza il tono dei messaggi e delle azioni — l'intera pipeline gira comunque.

### Provare in due giocatori sulla stessa macchina

1. `npm run dev`
2. Finestra normale → `http://localhost:3000/lobby` → nome → **Crea partita**.
3. Finestra **in incognito** (cookie di sessione separato) → `/lobby` → nome →
   inserisci il **codice invito** di 6 caratteri mostrato in alto nella lobby di partita.
4. Entrambi scelgono un paese dalla mappa → l'host preme **Avvia partita**.
5. Giocate: messaggi diplomatici (1 PA), azioni dal pannello in basso,
   **Conferma azioni** per chiudere il turno (si risolve quando confermano tutti,
   allo scadere del timer, o quando l'host preme **Risolvi turno**).

Test automatici (motore di regole, clamp AI, schema, iniezione):

```bash
npm test
```

---

## Variabili d'ambiente

Copia `.env.example` in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-fable-5
```

Tutte opzionali. Le chiavi segrete restano sul server: nessuna è mai inviata al browser.

### Abilitare l'AI Anthropic

1. Imposta `ANTHROPIC_API_KEY` (e opzionalmente `ANTHROPIC_MODEL`, default `claude-fable-5`).
2. Riavvia il server. La lobby mostrerà "AI attiva (claude-fable-5)".

Dettagli dell'integrazione (`src/lib/ai/anthropic.ts`):

- Output strutturato JSON (`output_config.format` con JSON Schema) + **ri-validazione Zod** server-side.
- Su `claude-fable-5` è attivo il **fallback server-side** su `claude-opus-4-8`
  (beta `server-side-fallback-2026-06-01`): un falso positivo dei classificatori
  di sicurezza non blocca la partita.
- Gestione esplicita di `stop_reason: "refusal"` e `max_tokens`; qualunque errore
  AI → fallback deterministico con nota nel report del turno (mai partita bloccata).

### Abilitare Supabase (persistenza Postgres)

1. Crea un progetto su [supabase.com](https://supabase.com).
2. Esegui `supabase/migrations/0001_init.sql` nell'SQL editor (tabelle + RLS).
3. Imposta `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` e riavvia.

Lo store passa automaticamente a Postgres (tabella `games`, JSONB + lock ottimistico
sulla colonna `version`). **Modello di sicurezza**: i client non parlano mai con
Supabase; tutte le scritture passano dalle API del server, che filtra le informazioni
private per giocatore. Le policy RLS negano ogni accesso ai ruoli client (deny-all):
il documento di gioco contiene briefing privati e non deve mai raggiungere un client
senza filtro. L'identità nel MVP è un cookie di sessione httpOnly; con Supabase Auth
basta sostituire `src/lib/server/auth.ts` (le route usano solo un id stabile).

---

## Come si gioca

- **Obiettivo**: è un sandbox strategico — sopravvivi, prospera, domina o media.
- **Punti azione (PA)**: 6 per turno. Ogni azione (e ogni messaggio) ha un costo visibile.
- **Turni**: 10/30/60 minuti o risoluzione manuale dell'host (configurabile alla creazione).
- **Categorie di azione**: Diplomazia (trattati, aiuti, avvertimenti), Economia (tasse,
  sanzioni, investimenti), Politica interna (discorsi, riforme, decreti), Intelligence
  (dossier, campagne di influenza, intercettazioni — con probabilità di successo e
  rischio di attribuzione) e Difesa (prontezza, mobilitazione, guerre, postura nucleare).
- **Guerra**: richiede prontezza ≥ 50 e una giustificazione (relazioni ostili, tensione
  alta, sanzioni o trattato rotto); l'esaurimento forza il cessate il fuoco.
- **Nucleare**: deterrenza astratta di fine partita (serve ricerca ≥ 70) con gravi
  conseguenze su fiducia e tensione globale. Nessun dettaglio operativo, per scelta.
- **Trasparenza**: ogni variazione mostra *cosa* è cambiato e *perché* (Log del turno);
  gli effetti derivati dall'AI sono etichettati e limitati.

### Rotte principali

| Rotta | Contenuto |
|---|---|
| `/` | landing |
| `/lobby` | crea/entra/lista partite pubbliche |
| `/game/[gameId]` | selezione paese (lobby) o schermata di gioco |
| `/game/[gameId]/country/[countryId]` | dossier paese |
| `/game/[gameId]/diplomacy` | chat diplomatica a schermo intero |
| `/game/[gameId]/history` | archivio turni e notizie |
| `/admin/dev` | console di sviluppo (stato resolver, risoluzione manuale) |

---

## Struttura del codice

```
src/lib/types.ts              modello di dominio (GameDoc = fonte di verità)
src/lib/countries/            8 paesi seed + generazione procedurale del mondo intero
src/lib/engine/               catalogo azioni, effetti, pipeline del turno, RNG deterministico
src/lib/engine/engine.test.ts test del motore (validazioni, clamp AI, idempotenza, iniezione)
src/lib/ai/                   schema Zod, prompt, resolver Anthropic + mock
src/lib/server/               store (JSON locale / Supabase), auth cookie, view per-giocatore
src/app/api/                  route: games, join, select-country, actions, messages,
                              ready, treaties, resolve, session
src/components/map/           WorldMap (d3-geo), tooltip, marker, legenda, layer regioni
src/components/game/          TopBar, sidebar, ActionDrawer, chat, modali di turno/confronto
supabase/migrations/          schema Postgres + RLS
```

## Stato delle funzionalità

**Completo e funzionante**: multiplayer (locale o Supabase), lobby con codici invito,
selezione paese su mappa interattiva (zoom/pan/tooltip/7 modalità colore), 35+ azioni
in 5 categorie con costi/cooldown/rischi/probabilità, trattati con accettazione
giocatore/AI, sanzioni, guerre con esaurimento, intelligence con scoperta, postura
nucleare astratta, chat diplomatica (1 PA), risoluzione turno idempotente (timer /
tutti pronti / host), report trasparente effetto-per-effetto, briefing privati filtrati
server-side, eventi mondiali, AI Anthropic con output strutturato + mock, audit log,
layout mobile con fogli a scomparsa, test Vitest.

**Semplificazioni dichiarate del MVP**: realtime via polling versionato (non WebSocket);
le regioni sono entità dati (pannello + overlay) senza confini geografici admin-1;
i governi AI decidono su trattati e reagiscono ai segnali ma non inviano messaggi in
chat; l'identità è un cookie di sessione (Supabase Auth è un drop-in successivo).

## Crediti

Dati geografici: [Natural Earth](https://www.naturalearthdata.com/) (pubblico dominio)
via [world-atlas](https://github.com/topojson/world-atlas) e
[world-countries](https://github.com/mledoze/countries) (ODbL).
Leader e scenario sono interamente immaginari: nessun riferimento a persone reali.
