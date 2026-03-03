# RomanForge AI

## Overview
RomanForge AI is a web application for generating complete, style-consistent novels from summaries, characters, and outlines. Users can select any AI model via OpenRouter (Anthropic, OpenAI, Google, Meta, etc.) and generate chapters with consistent style, character development, and plot coherence.

## Tech Stack
- **Frontend**: Next.js 14 (App Router) + React 18 + TypeScript
- **Styling**: Tailwind CSS 3 with custom design system (Plus Jakarta Sans, warm orange primary, light/dark mode)
- **UI Components**: Custom shadcn/ui-style components (Button, Card, Input, Select, Tabs, Badge, Progress, etc.)
- **Backend**: Next.js API Routes
- **Database**: Replit PostgreSQL (via `pg` package)
- **Auth**: JWT-based (bcryptjs + jose) + optional Google Sign-In
- **AI**: OpenRouter API (OpenAI-compatible SDK) - supports multiple providers/models
- **Export**: DOCX (via `docx` package), Markdown, TXT

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
│       ├── models/         # Available AI models list
│       └── projects/       # CRUD + style analysis + outline + chapter generation + export
├── components/
│   ├── theme-toggle.tsx    # Light/dark mode toggle
│   └── ui/                 # Reusable UI components
├── lib/
│   ├── auth.ts             # JWT auth helpers (requires JWT_SECRET env var)
│   ├── db/
│   │   ├── index.ts        # PostgreSQL connection pool
│   │   └── schema.sql      # Database schema reference
│   ├── openrouter.ts       # OpenRouter client + model list
│   ├── prompts.ts          # AI prompt templates
│   └── utils.ts            # cn() utility
```

## Database Schema
- **users**: id, email, password_hash, name
- **projects**: id, user_id, title, genre, target_word_count, language, summary, characters, outline, style_sample, style_json, ai_provider, status
- **chapters**: id, project_id, chapter_number, title, content, word_count, status
- **chapter_outlines**: id, project_id, chapter_number, title, purpose, character_arc, tension_level

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection (auto-set by Replit)
- `JWT_SECRET` - JWT signing secret (auto-generated)
- `OPENROUTER_API_KEY` - OpenRouter API key (user provides in Secrets tab)
- `GOOGLE_CLIENT_ID` - (Optional) Google OAuth Client ID for Google Sign-In

## Key Features
1. **Auth**: Email/password + optional Google Sign-In
2. **Theme**: Light/dark mode toggle on all pages
3. **Project Creation**: Title, genre, word count, language, AI model selection
4. **Style Engine**: Paste sample text OR upload files OR paste style descriptions → AI analyzes → JSON style profile
5. **Outline Generation**: AI creates chapter structure from summary
6. **Chapter Generation**: AI writes chapters following style, maintaining consistency
7. **Live Editor**: Edit chapters directly, save changes
8. **Export**: Word (DOCX), Markdown, and TXT download
9. **Multi-Model**: Choose from 9+ AI models across multiple providers via OpenRouter
