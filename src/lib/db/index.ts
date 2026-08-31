import { Pool } from "pg";

// Database schema with current columns
/*
users: id, email, password_hash, name, is_admin, created_at
ai_settings: singleton id, default_model, allowed_models, updated_at
projects: id, user_id, title, genre, target_word_count, language, summary, characters, outline, style_sample, style_json, style_notes, ai_provider (saved project model), status, project_type, screenplay_format, screenplay_style_preset, created_at, updated_at
  - project_type: 'novel' (default) | 'screenplay'
  - screenplay_format: NULL | 'feature' | 'tv_episode'
  - screenplay_style_preset: NULL | 'sorkin' | 'tarantino' | 'dialogue_heavy' | 'action_heavy' | 'custom'
chapters: id, project_id, chapter_number, title, purpose, content, word_count, status, narrative_summary, character_states, created_at, updated_at
chapter_outlines: id, project_id, chapter_number, title, purpose, character_arc, tension_level, location, key_events, raw_notes, structural_role, created_at
  (For screenplay projects, chapter_outlines holds Szenen, location holds the Slugline.)
  - structural_role: 'Setup' | 'Inciting Incident' | 'Rising Action' | 'Midpoint' | 'Crisis' | 'Climax' | 'Resolution' | 'Cold Open' | 'Act Break' | 'Tag' | NULL
project_characters: id, project_id, name, description, role, traits, backstory, appearance, notes, first_appears_chapter, created_at
*/

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default pool;

export async function query(text: string, params?: any[]) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}
