CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
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
