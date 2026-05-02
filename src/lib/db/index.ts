import { Pool } from "pg";

// Database schema with current columns
/*
projects: id, user_id, title, genre, target_word_count, language, summary, characters, outline, style_sample, style_json, style_notes, ai_provider, status, project_type, screenplay_format, screenplay_style_preset, created_at, updated_at
  - project_type: 'novel' (default) | 'screenplay'
  - screenplay_format: NULL | 'feature' | 'tv_episode'
  - screenplay_style_preset: NULL | 'sorkin' | 'tarantino' | 'dialogue_heavy' | 'action_heavy' | 'custom'
chapters: id, project_id, chapter_number, title, purpose, content, word_count, status, narrative_summary, character_states, created_at, updated_at
chapter_outlines: id, project_id, chapter_number, title, purpose, character_arc, tension_level, location, key_events, raw_notes, created_at
  (For screenplay projects, chapter_outlines holds Szenen, location holds the Slugline.)
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
