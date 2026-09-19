import pool from "@/lib/db";

const GENERATION_SCHEMA_LOCK_KEY = 731943;
let schemaPromise: Promise<void> | null = null;

export function ensureGenerationSchema(): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      const client = await pool.connect();
      try {
        await client.query("SELECT pg_advisory_lock($1)", [GENERATION_SCHEMA_LOCK_KEY]);
        try {
          await client.query("BEGIN");

          await client.query(`
            ALTER TABLE chapters
            ADD COLUMN IF NOT EXISTS last_scene_ending TEXT
          `);
          await client.query(`
            ALTER TABLE chapters
            ADD COLUMN IF NOT EXISTS open_plot_threads JSONB
          `);

          await client.query(`
            DELETE FROM chapters a
            USING chapters b
            WHERE a.project_id = b.project_id
              AND a.chapter_number = b.chapter_number
              AND a.id < b.id
          `);
          await client.query(`
            DELETE FROM chapter_outlines a
            USING chapter_outlines b
            WHERE a.project_id = b.project_id
              AND a.chapter_number = b.chapter_number
              AND a.id < b.id
          `);

          await client.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS idx_chapters_project_number
            ON chapters (project_id, chapter_number)
          `);
          await client.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS idx_chapter_outlines_project_number
            ON chapter_outlines (project_id, chapter_number)
          `);

          await client.query(`
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
            )
          `);

          await client.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS idx_chapter_jobs_one_running
            ON chapter_generation_jobs (project_id, chapter_number)
            WHERE status = 'running'
          `);

          await client.query(`
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
            )
          `);

          await client.query(`
            UPDATE chapter_generation_jobs
            SET status = 'failed',
                error_message = COALESCE(error_message, 'Job ohne Fortschritt (Timeout)'),
                updated_at = NOW()
            WHERE status = 'running'
              AND updated_at < NOW() - INTERVAL '12 minutes'
          `);

          await client.query("COMMIT");
        } catch (error) {
          await client.query("ROLLBACK").catch(() => {});
          throw error;
        } finally {
          await client.query("SELECT pg_advisory_unlock($1)", [GENERATION_SCHEMA_LOCK_KEY]).catch(() => {});
        }
      } finally {
        client.release();
      }
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}
