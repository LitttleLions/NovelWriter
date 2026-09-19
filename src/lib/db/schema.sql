CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  genre VARCHAR(100),
  target_word_count INTEGER DEFAULT 80000,
  language VARCHAR(50) DEFAULT 'Deutsch',
  summary TEXT,
  characters TEXT,
  outline TEXT,
  style_sample TEXT,
  style_json JSONB,
  style_notes TEXT,
  ai_provider VARCHAR(100) DEFAULT 'anthropic/claude-sonnet-4.6',
  status VARCHAR(50) DEFAULT 'draft',
  project_type VARCHAR(20) DEFAULT 'novel',
  screenplay_format VARCHAR(20),
  screenplay_style_preset VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chapters (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL,
  title VARCHAR(500),
  purpose TEXT,
  content TEXT,
  word_count INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending',
  narrative_summary TEXT,
  character_states JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chapter_outlines (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL,
  title VARCHAR(500),
  purpose TEXT,
  character_arc TEXT,
  tension_level INTEGER DEFAULT 5,
  location TEXT,
  key_events TEXT,
  raw_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS generation_log (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  model VARCHAR(200),
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  estimated_cost_usd NUMERIC(10, 6) DEFAULT 0,
  chapter_number INTEGER,
  details TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_chapters_project ON chapters(project_id);
CREATE INDEX IF NOT EXISTS idx_chapter_outlines_project ON chapter_outlines(project_id);
CREATE INDEX IF NOT EXISTS idx_generation_log_project ON generation_log(project_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Idempotente Migrationen für ältere DBs (additive, sichere Re-Runs)
-- ─────────────────────────────────────────────────────────────────────────────
-- Drehbuch-Modus (Task #5): project_type, screenplay_format, screenplay_style_preset
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_type VARCHAR(20) DEFAULT 'novel';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS screenplay_format VARCHAR(20);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS screenplay_style_preset VARCHAR(50);
UPDATE projects SET project_type = 'novel' WHERE project_type IS NULL;

-- Drei-Akt-Struktur (Task #8): strukturelle Rolle der Szene
-- (Setup / Inciting Incident / Rising Action / Midpoint / Crisis / Climax / Resolution
--  bzw. Cold Open / Act Break / Tag bei TV-Episoden)
ALTER TABLE chapter_outlines ADD COLUMN IF NOT EXISTS structural_role VARCHAR(50);

-- Zentrale KI-Modellverwaltung. Die CHECK-Bedingung erlaubt genau eine Zeile.
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;
CREATE TABLE IF NOT EXISTS ai_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE,
  default_model VARCHAR(255) NOT NULL DEFAULT 'anthropic/claude-sonnet-4.6',
  allowed_models TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT ai_settings_singleton CHECK (id = TRUE)
);
ALTER TABLE ai_settings ADD COLUMN IF NOT EXISTS allowed_models TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
INSERT INTO ai_settings (id, default_model, allowed_models)
VALUES (TRUE, 'anthropic/claude-sonnet-4.6', ARRAY['anthropic/claude-sonnet-4.6']::TEXT[])
ON CONFLICT (id) DO NOTHING;
UPDATE ai_settings
SET allowed_models = ARRAY[default_model]::TEXT[]
WHERE id = TRUE AND (allowed_models IS NULL OR cardinality(allowed_models) = 0);

ALTER TABLE chapters ADD COLUMN IF NOT EXISTS last_scene_ending TEXT;
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS open_plot_threads JSONB;

DELETE FROM chapters a USING chapters b
  WHERE a.project_id = b.project_id AND a.chapter_number = b.chapter_number AND a.id < b.id;
DELETE FROM chapter_outlines a USING chapter_outlines b
  WHERE a.project_id = b.project_id AND a.chapter_number = b.chapter_number AND a.id < b.id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_chapters_project_number ON chapters (project_id, chapter_number);
CREATE UNIQUE INDEX IF NOT EXISTS idx_chapter_outlines_project_number ON chapter_outlines (project_id, chapter_number);

CREATE TABLE IF NOT EXISTS chapter_generation_jobs (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL,
  chapter_id INTEGER REFERENCES chapters(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'queued',
  abort_requested BOOLEAN NOT NULL DEFAULT FALSE,
  attempt INTEGER NOT NULL DEFAULT 0,
  finish_reason VARCHAR(80),
  content_so_far TEXT DEFAULT '',
  event_seq INTEGER NOT NULL DEFAULT 0,
  model VARCHAR(200),
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  estimated_cost_usd NUMERIC(10, 6) DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_chapter_jobs_one_running
  ON chapter_generation_jobs (project_id, chapter_number)
  WHERE status = 'running';

CREATE TABLE IF NOT EXISTS chapter_revisions (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  chapter_id INTEGER REFERENCES chapters(id) ON DELETE SET NULL,
  chapter_number INTEGER NOT NULL,
  job_id INTEGER REFERENCES chapter_generation_jobs(id) ON DELETE SET NULL,
  source VARCHAR(50) NOT NULL,
  content TEXT,
  word_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
