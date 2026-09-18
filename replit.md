# RomanForge AI

## Overview
RomanForge AI is a web application for generating complete, style-consistent novels from summaries, characters, and outlines. An administrator controls the centrally configured OpenRouter model used by all AI features, including consistent style, character development, and plot coherence.

## Tech Stack
- **Frontend**: Next.js 14 (App Router) + React 18 + TypeScript
- **Dokumentation**: Die Datei `PROJECT_DOC.md` enthält die vollständige technische Dokumentation, Funktionsübersicht und Design-Vorgaben. Sie **muss** bei jeder Erweiterung aktualisiert werden.
- **UI Components**: Custom shadcn/ui-style components. All cards must use `rounded-2xl` and shadow-card. All buttons must use `rounded-xl`.
- **Backend**: Next.js API Routes
- **Database**: Replit PostgreSQL (via `pg` package)
- **Auth**: JWT-based (bcryptjs + jose) + optional Google Sign-In
- **AI**: OpenRouter API (OpenAI-compatible SDK) with centralized, server-side model resolution
- **Export**: DOCX (via `docx`), Markdown, TXT, plus PDF (Courier 12 screenplay layout via `pdf-lib`) and Final Draft `.fdx` for screenplay projects

## Project Structure
```
src/
├── app/
│   ├── layout.tsx          # Root layout (theme, fonts, Google GIS script)
│   ├── page.tsx            # Landing page with auth + Google Sign-In
│   ├── globals.css         # Design system CSS variables (light + dark)
│   ├── dashboard/
│   │   └── page.tsx        # Project list
│   ├── project/
│   │   ├── new/
│   │   │   └── page.tsx    # New project wizard (2 steps)
│   │   └── [id]/
│   │       └── page.tsx    # Project workspace (style, outline, chapters)
│   └── api/
│       ├── auth/           # login, register, logout, me, google
│       ├── config/         # Public config (Google Client ID)
│       ├── models/         # Live, filtered AI models list
│       └── projects/       # CRUD + style analysis + outline + chapter generation + export
│           └── [id]/
│               ├── outline/
│               │   ├── generate/    # POST: generate new outline (deletes chapters)
│               │   ├── reorder/     # PUT: reorder outline items
│               │   └── [outlineId]/ # PUT: edit, DELETE: remove outline item
│               ├── chapters/        # generate, [chapterId] edit
│               ├── style/analyze/   # POST: analyze style (modes: "analyze" or "direct")
│               └── export/          # GET: whole-book or chapter export as DOCX/MD/TXT/PDF/FDX
├── components/
│   ├── theme-toggle.tsx    # Light/dark mode toggle
│   └── ui/                 # Reusable UI components
├── lib/
│   ├── auth.ts             # JWT auth helpers (requires JWT_SECRET env var)
│   ├── db/
│   │   ├── index.ts        # PostgreSQL connection pool
│   │   └── schema.sql      # Database schema reference
│   ├── openrouter.ts       # OpenRouter client + compatibility pricing
│   ├── ai-settings.ts      # Live model list, cache, admin-approved models, project resolver
│   ├── prompts.ts          # AI prompt templates
│   └── utils.ts            # cn() utility
```

## Database Schema
- **Produktionsschutz**: Produktionsabfragen sind read-only. Schema-Erweiterungen müssen additiv, idempotent und transaktional sein; bestehende Bücher und Generierungsdaten dürfen nicht verändert oder gelöscht werden, außer bei einer ausdrücklich bestätigten Datenübernahme.
- **Datenabgleich**: Ein vollständiger Live→Development-Abgleich darf Development ersetzen. Vorher Development sichern, den Umfang bestätigen, die Daten in Fremdschlüssel-Reihenfolge und transaktional übertragen und anschließend Tabellenstände sowie wichtige Inhalte verifizieren. Live bleibt unverändert.
- **users**: id, email, password_hash, name, is_admin
- **ai_settings**: singleton row with default_model, allowed_models and updated_at
- **projects**: id, user_id, title, genre, target_word_count, language, summary, characters, outline, style_sample, style_json, style_notes, ai_provider (saved project model), status, project_type, screenplay_format, screenplay_style_preset
- **chapters**: id, project_id, chapter_number, title, purpose, content, word_count, status, narrative_summary, character_states
- **project_characters**: id, project_id, name, role, description, traits, backstory, appearance, notes, first_appears_chapter
- **chapter_outlines**: id, project_id, chapter_number, title, purpose, character_arc, tension_level, location, key_events, raw_notes, structural_role
- **generation_log**: token and cost tracking for AI actions per project/chapter
- **outline_characters**: outline-to-project-character assignments

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection (auto-set by Replit)
- `JWT_SECRET` - JWT signing secret (auto-generated)
- `OPENROUTER_API_KEY` - OpenRouter API key (user provides in Secrets tab)
- `OPENROUTER_MODEL` - (Optional) operator fallback model ID if the configured default is unavailable
- `ADMIN_EMAIL` / `ADMIN_EMAILS` - (Optional) comma-separated operator email(s) that receive admin access
- `GOOGLE_CLIENT_ID` - (Optional) Google OAuth Client ID for Google Sign-In

## Key Features
1. **Auth**: Email/password + optional Google Sign-In
2. **Theme**: Light/dark mode toggle on all pages
3. **Project Creation**: Title, genre, word count, language; the AI model is centrally managed
4. **Style Engine**: Three input modes:
   - **Beispieltext**: Paste book pages → KI analyzes and creates style profile
   - **Eigene Stilbeschreibung**: Write style directly → saved as-is (no AI analysis)
   - **Datei hochladen**: Upload .txt/.md file → switches to Beispieltext mode
5. **Outline Generation**: AI creates chapter structure; can be re-generated (with confirmation if chapters exist)
6. **Outline Editing**: Edit title/purpose/character_arc/tension_level per item; reorder items with up/down arrows
7. **Chapter Generation**: AI writes chapters following style, maintaining consistency
8. **Live Editor**: Edit chapters directly, save changes
9. **Export**: Complete-book export as DOCX, Markdown, TXT, PDF, or FDX where applicable
10. **Chapter exports**: Directly on each chapter card, copy Markdown to the clipboard or download the individual chapter as Markdown or Word
11. **Central AI model management**: Admin-controlled default model from a live, provider- and price-filtered OpenRouter list
