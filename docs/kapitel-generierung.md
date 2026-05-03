# Kapitel-Generierung: Wie funktioniert die Logik?

Diese Dokumentation beschreibt, was passiert, wenn du in der Projekt-Detailseite auf den **"Generieren"** (oder **"Neu"**) Button für ein Kapitel klickst.

Quell-Datei: `src/app/api/projects/[id]/chapters/generate/route.ts`

---

## Kurzantwort vorab

**Ja** — wenn du Kapitel 10 generierst, erstellt das System direkt im Anschluss automatisch das **Narrative Gedächtnis** für Kapitel 10 (Zusammenfassung + Figurenstatus + offene Handlungsfäden). Dieses Gedächtnis wird beim nächsten Klick auf "Generieren" für Kapitel 11 als Vorgeschichte mitgeschickt.

---

## Schritt-für-Schritt-Ablauf

### Schritt 1 — Kontext aus der Datenbank laden

| Datenquelle | Was wird geladen |
|---|---|
| `projects` | Summary, Sprache, gewähltes KI-Modell, Stil-Profil (`style_json`), manuelle Stil-Notizen (`style_notes`) |
| `chapter_outlines` | Outline für Kapitel N: Titel, Zweck, Schlüsselereignisse, Ort, Spannungslevel, Charakter-Bogen, Roh-Notizen |
| `chapters` | **Alle vorigen Kapitel 1 … N-1** mit Inhalt, Gedächtnis (`narrative_summary`) und Figurenstatus (`character_states`) |
| `project_characters` (+ `outline_characters`) | Figurenliste mit Filter-Logik (siehe unten) |

### Schritt 2 — "Story So Far" Block bauen

Das ist das **Narrative Gedächtnisprotokoll**, das die KI als Vorgeschichte erhält:

1. **Pro vorherigem Kapitel:**
   - Wenn ein `narrative_summary` existiert → wird er verwendet (kompakt, kuratiert, ~500-1000 Wörter pro Kapitel).
   - Wenn nicht → Fallback auf die ersten 800 Zeichen des Rohtexts (für ältere Kapitel ohne Gedächtnis).

2. **Aktueller Figurenstatus:** aus dem zuletzt generierten `character_states`-Eintrag — pro Figur: Aufenthaltsort, emotionaler Zustand, offene Handlungsfäden.

3. **Volltext-Ende des direkt vorherigen Kapitels:** die letzten ~2500 Zeichen des Rohtexts. Wichtig für nahtlosen Stil-, Ton- und Szenenübergang.

### Schritt 3 — Figuren-Filterung

Es gibt zwei Modi:

**Modus A — Outline hat Figuren zugewiesen:**
Nur diese Figuren dürfen im Kapitel auftreten ("NUR diese dürfen auftreten" steht hart im Prompt).

**Modus B — Keine Outline-Zuweisung:**
Alle Figuren mit `first_appears_chapter ≤ N` (oder NULL / 0) werden geladen.

**Immer zusätzlich — Verbots-Liste:**
Alle Figuren mit `first_appears_chapter > N` werden explizit als verboten markiert. Im Prompt:

> "Die folgenden Figuren treten erst in späteren Kapiteln auf und DÜRFEN in diesem Kapitel NICHT erwähnt, angedeutet oder sonstwie eingebaut werden. Auch keine indirekten Hinweise, Gerüchte, oder Erwähnungen durch Dritte."

### Schritt 4 — Stil-Block bauen

Der Stil-Block kombiniert zwei Quellen — die **manuellen Direktiven stehen ganz oben** und sind explizit als oberstes Gesetz markiert:

**[A] Manuelle Stil-Direktiven** (`style_notes`) — HÖCHSTE PRIORITÄT:
> "DIESE ANWEISUNGEN SIND DAS OBERSTE GESETZ. Sie überschreiben jede einzelne Vorgabe aus dem KI-Stil-Profil [B] sowie deinen eigenen Schreibreflex. Wenn eine manuelle Direktive einer anderen Regel widerspricht, gewinnt IMMER die manuelle Direktive – ohne Ausnahme, ohne Interpretation, ohne stillen Kompromiss."

Werden in einem ════ Block visuell hervorgehoben und **zusätzlich am Ende des User-Prompts wortgleich wiederholt** — direkt vor der Generierung. So bleiben sie auch bei langen Prompts top-of-mind und werden nicht von Recency-Bias überlagert.

**[B] KI-generiertes Stil-Profil** (`style_json`) — nachgeordnet, gilt nur dort, wo [A] schweigt:
- Autoren-Vorbild (z.B. "Stephen King")
- Grundton, Zeitform (Vergangenheit/Gegenwart — wird HART durchgesetzt)
- Erzähltempo
- Durchschnittliche Satzlänge mit konkreter Anweisung
- Vokabular-Komplexität (1-10)
- Beschreibungsdichte (1-10)
- Dialog-Anteil in Prozent
- Pflicht-Stilmittel (mind. 3× pro Kapitel)
- Stil-Maßstab: konkrete Beispielsätze, die nachgeahmt werden sollen

Wenn keine manuellen Notizen vorhanden sind, wird das KI-Profil als [A] geführt (Default).

### Schritt 5 — System- und User-Prompt zusammensetzen

**System-Prompt enthält:**
- **Sprach-Gesetz**: "Das gesamte Kapitel MUSS auf [SPRACHE] geschrieben sein. Kein einziges Wort auf Englisch oder einer anderen Sprache."
- **Stil-Gesetz**: der oben gebaute Stil-Block als bindendes "Grundgesetz".
- **Arbeitsweise**: Sprache → Stil → Kontinuität → Inhalt → Qualität.
- **Ausgabe-Regeln**:
  - 3.000–5.000 Wörter reiner Fließtext
  - Keine Markdown-Headings, keine Listen
  - Keine Einleitung wie "Hier ist Kapitel X"
  - Keine Meta-Kommentare am Ende ("Schlüsselelemente, die umgesetzt wurden", "Wortzahl", "Anmerkungen")
  - Beginne direkt mit dem ersten Satz, höre direkt mit dem letzten Satz auf

**User-Prompt enthält:**
1. Kapitel-Anweisung (Outline mit allen Feldern)
2. Projekt-Kontext (Summary, Figuren, Verbote)
3. Narrative Vorgeschichte (Story-So-Far-Block)
4. Erinnerung am Ende: Sprache + Stil-Gesetz erneut betont

### Schritt 6 — KI-Aufruf

Über OpenRouter mit dem Modell aus `project.ai_provider` (Default: `anthropic/claude-sonnet-4.6`).
Max. **16.000 Tokens** Output.

### Schritt 7 — Bereinigung

Die Funktion `stripMetaCommentary()` entfernt automatisch:
- Markdown-Code-Fences (```` ``` ````)
- Meta-Sektionen am Ende: "Schlüsselelemente", "Anmerkungen", "Hinweise", "Wortzahl", "Notes", "Key elements", "Translation notes" usw.
- Trailing Meta-Absätze die mit "(Anmerkung:", "Hinweis:", "Wortzahl:" beginnen
- Einleitungen wie "Hier ist Kapitel X" oder "Here is the chapter"

### Schritt 8 — Speichern

Kapitel wird in `chapters` gespeichert/aktualisiert mit:
- `content`, `title`, `word_count`
- `status = 'generated'`
- `updated_at = NOW()`

Ein Eintrag in `generation_log` wird angelegt mit Modell, Token-Verbrauch und geschätzten Kosten.

### Schritt 9 — Gedächtnis fürs nächste Kapitel erzeugen (automatisch!)

Direkt im selben Request ruft das System nochmal die KI auf — diesmal mit dem speziellen `narrativeSummarizer`-Prompt aus `src/lib/prompts.ts`. Der KI wird der gerade fertige Kapiteltext (max 12.000 Zeichen) gegeben und sie liefert ein **Handoff-Dokument** im JSON-Format:

```json
{
  "summary": "Kompakte Zusammenfassung des Kapitels, kuratiert für Folgekapitel",
  "character_states": {
    "FigurX": {
      "location": "Aufenthaltsort am Kapitelende",
      "emotional_state": "Stimmung",
      "open_threads": "Offene Handlungsfäden für diese Figur"
    }
  },
  "last_scene_ending": "Wie die letzte Szene endet",
  "open_plot_threads": ["Faden 1", "Faden 2"]
}
```

Gespeichert in:
- `chapters.narrative_summary` ← `summary`
- `chapters.character_states` ← `character_states` (als JSONB)

Ein zweiter `generation_log`-Eintrag dokumentiert die Erzeugung des Handoff-Dokuments.

---

## Was bedeutet das praktisch?

### Wenn du jetzt Kapitel 10 generierst …

… läuft Folgendes automatisch ab:

1. Die KI bekommt das Gedächtnis von Kapitel 1–9 + Figurenstatus + die letzten 2500 Zeichen aus Kapitel 9.
2. Kapitel 10 wird geschrieben und gespeichert.
3. **Direkt danach** wird das Gedächtnis von Kapitel 10 erzeugt und gespeichert.

### Wenn du danach Kapitel 11 generierst …

… sieht die KI dann:

- Gedächtnis Kapitel 1–9 (vorher schon vorhanden)
- **Gedächtnis Kapitel 10** (gerade erst erzeugt)
- Volltext-Ende von Kapitel 10 (letzte ~2500 Zeichen)
- Aktueller Figurenstatus aus Kapitel 10

### Wenn das auto-generierte Gedächtnis nicht passt

Klicke in der Kapitel-Liste auf **"Gedächtnis"** — du kannst es manuell editieren und damit überschreiben. Beim nächsten Kapitel wird dann deine Version verwendet.

### Wenn ein altes Kapitel kein Gedächtnis hat

(z.B. weil es vor dem Feature generiert wurde oder die Auto-Erzeugung fehlgeschlagen ist) → Der Prompt nimmt automatisch die ersten 800 Zeichen des Rohtexts als Notbehelf. Du kannst das Gedächtnis aber jederzeit manuell nachpflegen.

---

## Wichtige Sonderregeln im Überblick

| Regel | Wirkung |
|---|---|
| **Sprach-Gesetz** | Wird zweimal im Prompt eingehämmert (System + Erinnerung). Verhindert "Sprach-Drift" bei langen Generierungen. |
| **Manuelle Stil-Direktiven** | `style_notes` schlagen das KI-Profil im Konfliktfall — höchste Priorität. |
| **Outline-Figuren-Zuweisung** | Wenn gesetzt, dürfen NUR diese Figuren auftreten. Schließt alle anderen aus. |
| **Figuren-Verbot ist hart** | Auch indirekte Erwähnungen, Gerüchte oder Referenzen durch Dritte sind verboten. |
| **Meta-Kommentar-Filter** | Cleant aggressiv KI-typische Anhänge wie "Schlüsselelemente", "Wortzahl", "Anmerkungen". |
| **Auto-Gedächtnis** | Wird **immer** nach jeder Generierung im selben Request erzeugt — keine separate Aktion nötig. |

---

## Beteiligte Dateien

- `src/app/api/projects/[id]/chapters/generate/route.ts` — Haupt-Logik (alles oben Beschriebene)
- `src/lib/prompts.ts` — `PROMPTS.narrativeSummarizer` für die Gedächtnis-Erzeugung
- `src/lib/openrouter.ts` — `generateText`, `estimateCost`, `describeAiError`
- `src/lib/db/schema.sql` — Schema für `chapters.narrative_summary` und `character_states`
- `src/app/project/[id]/page.tsx` — UI-Buttons "Generieren" / "Neu" / "Gedächtnis"

---

## Drehbuch-Modus (Spielfilm / TV-Episode)

Seit Task #5 unterstützt RomanForge AI **Drehbücher** als zweiten Werk-Typ – ohne die bestehende Roman-Logik zu verändern.

### Was ist anders?

| Aspekt | Roman | Drehbuch |
|---|---|---|
| `projects.project_type` | `'novel'` (Default) | `'screenplay'` |
| `projects.screenplay_format` | `NULL` | `'feature'` (Spielfilm, ~22.500 Wörter ≈ 90 Seiten) oder `'tv_episode'` (~14.000 Wörter ≈ 55 Seiten) |
| `projects.screenplay_style_preset` | `NULL` | `'sorkin'` \| `'tarantino'` \| `'dialogue_heavy'` \| `'action_heavy'` \| `'coen'` \| `'wes_anderson'` \| `'nolan'` \| `'gerwig'` \| `'waller_bridge'` \| `'kaufman'` \| `'custom'` |
| System-Prompt | `buildDynamicSystemPrompt()` (Roman-Ghostwriter) | `PROMPTS.screenplayWriter` / `PROMPTS.screenplayTvWriter` mit Industriestandard-Format-Regeln |
| Output-Format | Literarische Prosa | Slugline → Action-Lines → DIALOG-BLOCK |
| Längen-Einheit in UI | "Wörter" | "Seiten" (1 Seite ≈ 250 Wörter ≈ 1 Min. Filmzeit) |
| Outline `location`-Feld | Freitext "Küche, abends" | Echte Slugline "INNEN. KÜCHE - TAG" / "INT. KITCHEN - DAY" |
| Stil-Prompt | nur `style_json` + `style_notes` | Stil-Preset (Sorkin etc.) wird PRE-pended als oberste Priorität |

### Sprachgesteuerte Sluglines

Über `getSluglineVocab(language)` in `src/lib/screenplay-presets.ts` wählt das System automatisch das Vokabular:

- **Deutsch** → `INNEN.` / `AUSSEN.` + `TAG` / `NACHT` / `MORGEN` / `ABEND`
- **Englisch** → `INT.` / `EXT.` + `DAY` / `NIGHT` / `MORNING` / `EVENING`

Sowohl der Outline-Konverter (`convertChunk` in `outline/generate/route.ts`) als auch der Szenen-Schreiber (`buildDynamicSystemPrompt` in `chapters/generate/route.ts`) verwenden diese Vokabel-Tabelle.

### Geteilte Datenbank-Spalten

`chapter_outlines` bleibt **schema-identisch** für beide Werk-Typen – die bestehenden Felder werden semantisch umgewidmet:

| Spalte | Roman-Bedeutung | Drehbuch-Bedeutung |
|---|---|---|
| `title` | Kapitel-Titel | Kurzer Szenen-Name (3–8 Wörter, KEINE Slugline) |
| `purpose` | Kapitel-Zweck | Dramatische Funktion der Szene |
| `character_arc` | Figurenentwicklung | dito |
| `location` | freiformuliert | echte Slugline |
| `tension_level` | 1–10 | dito |
| `key_events` | Hauptereignisse | Action-Beats, die vorkommen MÜSSEN |
| `raw_notes` | Autoren-Vorlage | dito (Szenen-Beschreibung) |

### Stil-Presets

Definiert in `src/lib/screenplay-presets.ts`:

- **Aaron Sorkin** — Walk-and-Talks, Ping-Pong-Dialog, Fachjargon
- **Quentin Tarantino** — Lange Dialog-Tableaus, Pop-Culture-Riffs
- **Dialog-lastig** — 70%+ Dialog, intim
- **Action-lastig** — Visuell-kinetisch, knapp
- **Coen Brothers** — Regionale Dialekte, lakonische Pausen, schwarzer Humor, plötzliche Gewalt
- **Wes Anderson** — Symmetrische Kompositionen, gestelzte Höflichkeit, kindlich-formelle Sprache
- **Christopher Nolan** — Verschachtelte Zeitebenen, Konzept-Exposition unter Druck, kühler Ton
- **Greta Gerwig** — Überlappender Familien-Dialog, Coming-of-Age-Wärme, schnelle Tonwechsel
- **Phoebe Waller-Bridge** — Direkte Kamera-Adresse, scharfe Pointen, sexueller Subtext
- **Charlie Kaufman** — Realitätsbrüche, neurotische Innensicht, surreale Konzepte als Alltag
- **Eigener Stil** — Nur die normale Stil-Engine wird verwendet

Das gewählte Preset wird vor dem regulären Stil-Block (`[A]` KI-Profil + `[B]` manuelle Notizen) als **`[S]` DREHBUCH-STIL-PRESET (oberste Priorität)** in den System-Prompt injiziert.

### Empfohlene Modelle für Drehbücher

Das UI zeigt im Modell-Selector den Hinweis: für Drehbücher liefern **Claude Sonnet 4.6** und **GPT-5** das zuverlässigste Format-Halten (Sluglines, Charakter-Caps, Dialog-Layout).
