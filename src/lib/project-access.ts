import { query } from "@/lib/db";

export async function requireOwnedProject(projectId: string, userId: number) {
  const project = await query(
    "SELECT id FROM projects WHERE id = $1 AND user_id = $2",
    [projectId, userId],
  );
  if (project.rows.length === 0) return null;
  return project.rows[0];
}
