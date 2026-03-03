# RomanForge AI - Projektdokumentation

## 1. Technisches Konzept & Architektur
- **Framework**: Next.js 14 (App Router)
- **Sprache**: TypeScript
- **Datenbank**: PostgreSQL (Replit Managed)
- **Authentifizierung**: JWT (jose) + Google Identity Services (GIS)
- **KI-Integration**: OpenRouter API (OpenAI-kompatibler SDK)

## 2. Kernfunktionen
### Projekt-Management
- Erstellung von Projekten mit Titel, Genre, Zielwortzahl und Sprache.
- Auswahl aus über 20 KI-Modellen (Claude, GPT, Gemini, DeepSeek, Llama etc.).

### Stil-Engine
- **Beispieltext**: Analyse von Textproben zur Erstellung eines Stil-Profils.
- **Direkt-Modus**: Manuelle Eingabe einer Stilbeschreibung ohne KI-Analyse.
- **Upload**: Unterstützung für .txt und .md Dateien.

### Outline-System
- **KI-Generierung**: Erstellung einer Kapitelstruktur basierend auf der Zusammenfassung.
- **Manueller Modus**: Importieren einer eigenen Outline (Text), die von der KI in das interne Format konvertiert wird.
- **Bearbeitung**: Verschieben (Up/Down), Editieren von Titeln/Inhalten und Löschen von Kapiteln.

### Kapitel-Generierung
- Sequentielle Generierung von Kapiteln unter Berücksichtigung von Stil und Charakter-Konsistenz.
- Live-Editor zur manuellen Nachbearbeitung.

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
- **Preistabelle**: `estimateCost()` in `openrouter.ts` berechnet Kosten basierend auf hinterlegten Preisen pro Modell.
- **generateText()**: Gibt jetzt `{ content, prompt_tokens, completion_tokens, total_tokens }` zurück (statt nur String).
- **UI**: Tab "KI-Log" zeigt alle Generierungen in einer Tabelle inkl. Zeitstempel, Aktion, Modell, Tokens und Kostenschätzung. Summenkarten zeigen Gesamtkosten und -tokens.

## 6. Regeln für zukünftige Entwicklungen
- **Aktualisierung**: Diese Datei (`PROJECT_DOC.md`) muss bei jeder neuen Funktion oder Architekturänderung aktualisiert werden.
- **Design-Treue**: Neue UI-Elemente müssen dem PromptMate Design-System folgen.
- **Datenbank-Sicherheit**: IDs und Schemata dürfen nicht destruktiv geändert werden.
- **Modell-Liste**: Neue Modelle in `src/lib/openrouter.ts` müssen a) in `AVAILABLE_MODELS` und b) in `MODEL_PRICES` mit korrekten Preisen eingetragen werden.
- **Logging**: Jede neue KI-Generierungsroute muss einen Eintrag in `generation_log` schreiben und `estimateCost()` verwenden.
