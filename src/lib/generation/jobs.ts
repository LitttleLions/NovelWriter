import { query } from "@/lib/db";

export type GenerationJobStatus = "queued" | "running" | "completed" | "failed" | "aborted";

export interface GenerationJob {
  id: number;
  project_id: number;
  chapter_number: number;
  chapter_id: number | null;
  status: GenerationJobStatus;
  abort_requested: boolean;
  attempt: number;
  finish_reason: string | null;
  content_so_far: string;
  event_seq: number;
  model: string | null;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
  error_message: string | null;
}

export async function expireStaleJobs() {
  await query(
    `UPDATE chapter_generation_jobs
     SET status = 'failed',
         error_message = COALESCE(error_message, 'Job ohne Fortschritt (Timeout)'),
         updated_at = NOW()
     WHERE status = 'running'
       AND updated_at < NOW() - INTERVAL '12 minutes'`,
  );
}

export async function getJob(jobId: number, projectId: string): Promise<GenerationJob | null> {
  const result = await query(
    "SELECT * FROM chapter_generation_jobs WHERE id = $1 AND project_id = $2",
    [jobId, projectId],
  );
  return result.rows[0] || null;
}

export async function getRunningJob(projectId: string, chapterNumber: number): Promise<GenerationJob | null> {
  const result = await query(
    `SELECT * FROM chapter_generation_jobs
     WHERE project_id = $1 AND chapter_number = $2 AND status = 'running'
     ORDER BY id DESC LIMIT 1`,
    [projectId, chapterNumber],
  );
  return result.rows[0] || null;
}

export async function createRunningJob(projectId: string, chapterNumber: number, model: string): Promise<{ job: GenerationJob; created: boolean }> {
  await expireStaleJobs();
  const existing = await getRunningJob(projectId, chapterNumber);
  if (existing) return { job: existing, created: false };

  try {
    const inserted = await query(
      `INSERT INTO chapter_generation_jobs (project_id, chapter_number, status, model, content_so_far)
       VALUES ($1, $2, 'running', $3, '')
       RETURNING *`,
      [projectId, chapterNumber, model],
    );
    return { job: inserted.rows[0], created: true };
  } catch (error: any) {
    const existingAfter = await getRunningJob(projectId, chapterNumber);
    if (existingAfter) return { job: existingAfter, created: false };
    throw error;
  }
}

export async function requestAbort(projectId: string, chapterNumber: number): Promise<GenerationJob | null> {
  const result = await query(
    `UPDATE chapter_generation_jobs
     SET abort_requested = TRUE, updated_at = NOW()
     WHERE project_id = $1 AND chapter_number = $2 AND status = 'running'
     RETURNING *`,
    [projectId, chapterNumber],
  );
  return result.rows[0] || null;
}

export async function isAbortRequested(jobId: number): Promise<boolean> {
  const result = await query(
    "SELECT abort_requested, status FROM chapter_generation_jobs WHERE id = $1",
    [jobId],
  );
  const row = result.rows[0];
  return Boolean(row?.abort_requested) || row?.status === "aborted";
}

export async function touchJob(jobId: number, fields: {
  content_so_far?: string;
  event_seq?: number;
  attempt?: number;
  finish_reason?: string | null;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  estimated_cost_usd?: number;
  chapter_id?: number | null;
  model?: string;
}) {
  const sets: string[] = ["updated_at = NOW()"];
  const values: any[] = [];
  let idx = 1;
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    sets.push(`${key} = $${idx}`);
    values.push(value);
    idx++;
  }
  values.push(jobId);
  await query(
    `UPDATE chapter_generation_jobs SET ${sets.join(", ")} WHERE id = $${idx}`,
    values,
  );
}

export async function finishJob(jobId: number, status: "completed" | "failed" | "aborted", extras: {
  error_message?: string | null;
  finish_reason?: string | null;
  content_so_far?: string;
  chapter_id?: number | null;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  estimated_cost_usd?: number;
} = {}) {
  await query(
    `UPDATE chapter_generation_jobs
     SET status = $1,
         error_message = COALESCE($2, error_message),
         finish_reason = COALESCE($3, finish_reason),
         content_so_far = COALESCE($4, content_so_far),
         chapter_id = COALESCE($5, chapter_id),
         prompt_tokens = COALESCE($6, prompt_tokens),
         completion_tokens = COALESCE($7, completion_tokens),
         total_tokens = COALESCE($8, total_tokens),
         estimated_cost_usd = COALESCE($9, estimated_cost_usd),
         updated_at = NOW()
     WHERE id = $10`,
    [
      status,
      extras.error_message ?? null,
      extras.finish_reason ?? null,
      extras.content_so_far ?? null,
      extras.chapter_id ?? null,
      extras.prompt_tokens ?? null,
      extras.completion_tokens ?? null,
      extras.total_tokens ?? null,
      extras.estimated_cost_usd ?? null,
      jobId,
    ],
  );
}

export async function addRevision(opts: {
  projectId: string;
  chapterNumber: number;
  chapterId?: number | null;
  jobId: number;
  source: string;
  content: string;
  wordCount: number;
}) {
  await query(
    `INSERT INTO chapter_revisions (project_id, chapter_id, chapter_number, job_id, source, content, word_count)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [opts.projectId, opts.chapterId ?? null, opts.chapterNumber, opts.jobId, opts.source, opts.content, opts.wordCount],
  );
}

export async function upsertGeneratingChapter(opts: {
  projectId: string;
  chapterNumber: number;
  title: string;
  content: string;
  status?: string;
}) {
  const wordCount = opts.content.trim() ? opts.content.trim().split(/\s+/).length : 0;
  const result = await query(
    `INSERT INTO chapters (project_id, chapter_number, title, content, word_count, status, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (project_id, chapter_number)
     DO UPDATE SET
       content = EXCLUDED.content,
       word_count = EXCLUDED.word_count,
       status = EXCLUDED.status,
       title = EXCLUDED.title,
       updated_at = NOW()
     RETURNING *`,
    [opts.projectId, opts.chapterNumber, opts.title, opts.content, wordCount, opts.status || "generating"],
  );
  return result.rows[0];
}
