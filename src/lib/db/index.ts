import { Pool, PoolClient } from "pg";

// Database schema with current columns
/*
users: id, email, password_hash, name, is_admin, created_at
ai_settings: singleton id, default_model, allowed_models, updated_at
projects: id, user_id, title, genre, target_word_count, language, summary, characters, outline, style_sample, style_json, style_notes, ai_provider (saved project model), status, project_type, screenplay_format, screenplay_style_preset, created_at, updated_at
chapters: id, project_id, chapter_number, title, purpose, content, word_count, status, narrative_summary, character_states, last_scene_ending, open_plot_threads, created_at, updated_at
  UNIQUE (project_id, chapter_number)
chapter_outlines: id, project_id, chapter_number, title, purpose, character_arc, tension_level, location, key_events, raw_notes, structural_role, created_at
  UNIQUE (project_id, chapter_number)
chapter_generation_jobs / chapter_revisions: persistent generation + draft snapshots
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

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
