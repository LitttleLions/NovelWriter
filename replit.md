# RomanForge AI

## Overview
RomanForge AI is a web application for generating complete, style-consistent novels from summaries, characters, and outlines. Users can select any AI model via OpenRouter (Anthropic, OpenAI, Google, Meta, etc.) and generate chapters with consistent style, character development, and plot coherence.

## Tech Stack
- **Frontend**: Next.js 14 (App Router) + React 18 + TypeScript
- **Styling**: Tailwind CSS 3 with custom design system (Plus Jakarta Sans, warm orange primary color, dark mode default)
- **UI Components**: Custom shadcn/ui-style components (Button, Card, Input, Select, Tabs, Badge, Progress, etc.)
- **Backend**: Next.js API Routes
- **Database**: Replit PostgreSQL (via `pg` package)
- **Auth**: JWT-based (bcryptjs + jose)
- **AI**: OpenRouter API (OpenAI-compatible SDK) - supports multiple providers/models

## Project Structure
```
src/
├── app/
│   ├── layout.tsx          # Root layout (dark mode, fonts)
│   ├── page.tsx            # Landing page with auth
│   ├── globals.css         # Design system CSS variables
│   ├── dashboard/
│   │   └── page.tsx        # Project list
│   ├── project/
│   │   ├── new/
│   │   │   └── page.tsx    # New project wizard (2 steps)
│   │   └── [id]/
│   │       └── page.tsx    # Project workspace (style, outline, chapters)
│   └── api/
│       ├── auth/           # login, register, logout, me
│       ├── models/         # Available AI models list
│       └── projects/       # CRUD + style analysis + outline + chapter generation + export
├── components/
│   └── ui/                 # Reusable UI components
├── lib/
│   ├── auth.ts             # JWT auth helpers
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
- `OPENROUTER_API_KEY` - OpenRouter API key (user provides in Secrets tab)

## Key Features
1. **Auth**: Email/password registration and login
2. **Project Creation**: Title, genre, word count, language, AI model selection
3. **Style Engine**: Paste sample text → AI analyzes writing style → JSON style profile
4. **Outline Generation**: AI creates chapter structure from summary
5. **Chapter Generation**: AI writes chapters following style, maintaining consistency
6. **Live Editor**: Edit chapters directly, save changes
7. **Export**: Markdown and TXT download
8. **Multi-Model**: Choose from 9+ AI models across multiple providers via OpenRouter
