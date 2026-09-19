import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  const { id } = await params;

  const project = await query(
    "SELECT id FROM projects WHERE id = $1 AND user_id = $2",
    [id, user.id]
  );
  if (project.rows.length === 0) {
    return NextResponse.json({ error: "Projekt nicht gefunden" }, { status: 404 });
  }

  const logs = await query(
    "SELECT * FROM generation_log WHERE project_id = $1 ORDER BY created_at DESC, id DESC",
    [id]
  );

  const totals = await query(
    `SELECT
       SUM(total_tokens) AS total_tokens,
       SUM(estimated_cost_usd) AS total_cost
     FROM generation_log WHERE project_id = $1`,
    [id]
  );

  return NextResponse.json({
    logs: logs.rows,
    totals: totals.rows[0],
  });
}
