# RomanForge AI - Projektdokumentation

## 1. Technisches Konzept & Architektur
- **Framework**: Next.js 14 (App Router)
- **Sprache**: TypeScript
- **Datenbank**: PostgreSQL (Replit Managed)
- **Authentifizierung**: JWT (jose) + Google Identity Services (GIS)
- **KI-Integration**: OpenRouter API (OpenAI-kompatibler SDK) mit zentraler, serverseitiger Modellauflösung

## 2. Kernfunktionen
### Projekt-Management
- Erstellung von Projekten mit Titel, Genre, Zielwortzahl und Sprache.
- Ein Admin legt ein globales Standardmodell und bis zu vier weitere freigegebene Modelle fest.
- Beim Anlegen und in der Projektansicht kann ein Nutzer eines der freigegebenen Modelle wählen. Diese Auswahl wird pro Projekt gespeichert und beeinflusst die folgenden KI-Aufrufe.
- Ein Projekt kann jederzeit wieder auf den aktuellen Admin-Standard zurückgesetzt werden. Eine gültige Projektwahl wird durch spätere Admin-Änderungen nicht überschrieben.
- Die Admin-Modellliste wird live von OpenRouter geladen und serverseitig nach Anbieter-Allowlist, Legacy-Ausschlüssen für alte OpenAI-Familien und einem Preisdeckel von 20 USD pro 1 Mio. Tokens gefiltert. Unterstützt werden unter anderem DeepSeek, Google, Anthropic, Moonshot AI, OpenAI, Qwen und Z.ai.
- Die Auswahl zeigt aktuelle Prompt-/Completion-Preise, Kontextlänge und Bildfähigkeit. Der Admin-Bereich bündelt den globalen Standard und optionale Freigaben in einer kompakten Konfiguration; der Katalog ist als responsive Modellkartenliste ohne horizontales Scrollen aufbereitet. Volltextsuche, Anbieter, Bildfähigkeit und klar beschriftete Gesamtpreise pro 1 Mio. Tokens lassen sich kombinieren; aktive Einschränkungen sind einzeln oder gemeinsam zurücksetzbar. Die Modellliste wird eine Stunde serverseitig gecacht und kann explizit aktualisiert werden.

### Stil-Engine
- **Beispieltext**: Analyse von Textproben zur Erstellung eines Stil-Profils.
- **Direkt-Modus**: Manuelle Eingabe einer Stilbeschreibung ohne KI-Analyse.
- **Upload**: Unterstützung für .txt und .md Dateien.

### Outline-System
- **KI-Generierung**: Erstellung einer Kapitelstruktur basierend auf der Zusammenfassung.
- **Manueller Import (custom_outline)**: Eingefügter Outline-Text wird szenenweise geparst und mit dem `customOutlineConverter`-Prompt in JSON umgewandelt.
  - Jede Szene wird als **eigener Eintrag** gespeichert (keine Zusammenfassungen).
  - Felder: `title`, `purpose`, `character_arc`, `tension_level`, `location`, `key_events`, `raw_notes`.
  - `raw_notes` enthält den **vollständigen Originaltext** der Szene.
  - **Chunked Processing**: Bei mehr als 25 Szenen werden die Eingaben in Blöcken von 25 verarbeitet (je ein separater API-Aufruf).
  - Output-Token-Limit: 32.000 (verhindert Abbruch bei langen Outlines).
- **Bearbeitung**: Verschieben (Up/Down), Editieren, Löschen, einzelne Punkte hinzufügen.
- **Detail-Ansicht**: Klick auf Szene expandiert `location`, `key_events` und `raw_notes`.

### Kapitel-Generierung & Konsistenz (Narrative Memory)
- **Sequentielle Generierung**: AI schreibt Kapitel basierend auf Stil und Charakter-Profilen.
- **Narrative Memory System**: 
  - Nach jeder Generierung wird eine `narrative_summary` (200-300 Wörter) und `character_states` (JSON) erstellt.
  - Das nächste Kapitel erhält alle bisherigen Zusammenfassungen ("The Story So Far") plus den Volltext des unmittelbar vorangegangenen Kapitels.
- **Charakter-Filter**: Nur Charaktere mit `first_appears_chapter <= aktuelle_nummer` werden an die KI gesendet (außer die Outline ordnet sie explizit zu).
- **Stil-Injektion**: Stilvorgaben und Sprachregeln werden direkt in den *System Prompt* injiziert (`buildDynamicSystemPrompt`), um maximale Treue zu gewährleisten.

### Fehlerbehebung (Bugfixes)
- **Hydration**: Badge-Komponenten im Dashboard von `<CardDescription>` (p) in `<div>` verschoben.
- **AuthInterceptor**: Header-Handling korrigiert (Verwendung von `Object.fromEntries` für `Headers`-Objekte).
- **Double-Requests**: `useRef`-Guards verhindern doppelte API-Aufrufe durch React StrictMode bei Outline-Charakteren und Auth-Initialisierung.
- **Publishing**: `deploymentTarget: "autoscale"` mit `npm run build` und `npm run start` auf Port 5000 konfiguriert.

### Charaktere
- Zentrales Management der Charakterbeschreibungen.
- **KI-Splitting**: Automatisierte Unterteilung ungeordneter Beschreibungen in strukturierte Blöcke.

## 3. Design-System (PromptMate Spec)
- **Schriftart**: Plus Jakarta Sans (Google Fonts)
- **Farben (Light/Dark)**:
  - Background: #F4F5F7 / #0F1119
  - Primary: #F59E0B (Warm Orange)
  - Card: #FFFFFF / #171B28
- **Radien**: Cards (16px / 1rem), Buttons (12px / 0.75rem), Inputs (8px / 0.5rem)
- **Schatten**: Subtile Kartenschatten mit Hover-Effekt (Primary-Glow).

### Editieren & Löschen
- **Stil**: Löschen der Analyse über das "X"-Icon in der Stil-Analyse Card.
- **Outline**: Einzelne Punkte können editiert (Stift) oder gelöscht (X) werden. Neue Punkte können manuell hinzugefügt werden (Formular unter "Punkt hinzufügen").
- **Kapitel**: Generierte Kapitel können editiert oder gelöscht (X) werden.

## 5. KI-Kosten & Generierungs-Log
- **Tabelle**: `generation_log` in PostgreSQL speichert jede KI-Anfrage mit Aktion, Modell, Token-Zählung und geschätzten Kosten (USD).
- **API**: `GET /api/projects/[id]/log` liefert alle Einträge plus Summenwerte.
- **Preistabelle**: `estimateCost()` nutzt aktuelle Preise der Live-Modellliste, wenn verfügbar, und fällt für historische/alte Modell-IDs auf die hinterlegte Kompatibilitätstabelle zurück.
- **generateText()**: Gibt jetzt `{ content, prompt_tokens, completion_tokens, total_tokens }` zurück (statt nur String).
- **UI**: Tab "KI-Log" zeigt alle Generierungen in einer Tabelle inkl. Zeitstempel, Aktion, Modell, Tokens und Kostenschätzung. Summenkarten zeigen Gesamtkosten und -tokens.

## 6. Regeln für zukünftige Entwicklungen
- **Aktualisierung**: Diese Datei (`PROJECT_DOC.md`) muss bei jeder neuen Funktion oder Architekturänderung aktualisiert werden.
- **Design-Treue**: Neue UI-Elemente müssen dem PromptMate Design-System folgen.
- **Datenbank-Sicherheit**: IDs und Schemata dürfen nicht destruktiv geändert werden.
- **Modell-Liste**: Laufzeitmodelle kommen live von OpenRouter; Anbieter-Allowlist, Legacy-Ausschlüsse und Preisdeckel liegen zentral in der serverseitigen Modellschicht. `MODEL_PRICES` bleibt nur als Kompatibilitäts-Fallback für historische Logs.
- **Projektmodell**: `projects.ai_provider` enthält aus Kompatibilitätsgründen die gespeicherte Projektmodell-ID. Sie wird bei jedem KI-Aufruf serverseitig gegen die aktuelle Admin-Freigabeliste und die Live-Liste geprüft.
- **Logging**: Jede neue KI-Generierungsroute muss einen Eintrag in `generation_log` schreiben und `estimateCost()` verwenden.
