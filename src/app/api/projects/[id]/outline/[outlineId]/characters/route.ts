import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { requireOwnedProject } from "@/lib/project-access";

async function requireOwnedOutline(projectId: string, outlineId: string, userId: number) {
  const project = await requireOwnedProject(projectId, userId);
  if (!project) return null;
  const outline = await query(
    "SELECT id FROM chapter_outlines WHERE id = $1 AND project_id = $2",
    [outlineId, projectId],
  );
  if (outline.rows.length === 0) return null;
  return outline.rows[0];
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string; outlineId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  const { id, outlineId } = await params;
  const outline = await requireOwnedOutline(id, outlineId, user.id);
  if (!outline) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  const result = await query(
    `SELECT pc.* FROM project_characters pc
     INNER JOIN outline_characters oc ON oc.character_id = pc.id
     WHERE oc.outline_id = $1 AND pc.project_id = $2`,
    [outlineId, id]
  );
  return NextResponse.json({ characters: result.rows });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string; outlineId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  const { id, outlineId } = await params;
  const outline = await requireOwnedOutline(id, outlineId, user.id);
  if (!outline) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  const { character_ids } = await req.json();

  // Replace all assignments for this outline (bound to this project)
  await query(
    `DELETE FROM outline_characters
     WHERE outline_id = $1
       AND outline_id IN (SELECT id FROM chapter_outlines WHERE project_id = $2)`,
    [outlineId, id]
  );

  if (Array.isArray(character_ids) && character_ids.length > 0) {
    const owned = await query(
      `SELECT id FROM project_characters WHERE project_id = $1 AND id = ANY($2::int[])`,
      [id, character_ids.map((value: unknown) => Number(value)).filter((n: number) => Number.isInteger(n) && n > 0)]
    );
    for (const row of owned.rows) {
      await query(
        "INSERT INTO outline_characters (outline_id, character_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [outlineId, row.id]
      );
    }
  }

  const updated = await query(
    `SELECT pc.* FROM project_characters pc
     INNER JOIN outline_characters oc ON oc.character_id = pc.id
     WHERE oc.outline_id = $1 AND pc.project_id = $2`,
    [outlineId, id]
  );
  return NextResponse.json({ characters: updated.rows });
}
