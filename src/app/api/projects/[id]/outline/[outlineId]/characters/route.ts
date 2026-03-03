import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(req: Request, { params }: { params: Promise<{ id: string; outlineId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  const { id, outlineId } = await params;
  const project = await query("SELECT id FROM projects WHERE id = $1 AND user_id = $2", [id, user.id]);
  if (project.rows.length === 0) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  const result = await query(
    `SELECT pc.* FROM project_characters pc
     INNER JOIN outline_characters oc ON oc.character_id = pc.id
     WHERE oc.outline_id = $1`,
    [outlineId]
  );
  return NextResponse.json({ characters: result.rows });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string; outlineId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  const { id, outlineId } = await params;
  const project = await query("SELECT id FROM projects WHERE id = $1 AND user_id = $2", [id, user.id]);
  if (project.rows.length === 0) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  const { character_ids } = await req.json();

  // Replace all assignments for this outline
  await query("DELETE FROM outline_characters WHERE outline_id = $1", [outlineId]);

  if (Array.isArray(character_ids) && character_ids.length > 0) {
    for (const charId of character_ids) {
      await query(
        "INSERT INTO outline_characters (outline_id, character_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [outlineId, charId]
      );
    }
  }

  const updated = await query(
    `SELECT pc.* FROM project_characters pc
     INNER JOIN outline_characters oc ON oc.character_id = pc.id
     WHERE oc.outline_id = $1`,
    [outlineId]
  );
  return NextResponse.json({ characters: updated.rows });
}
