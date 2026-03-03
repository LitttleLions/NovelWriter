import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string; outlineId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  const { id, outlineId } = await params;

  const project = await query(
    "SELECT id FROM projects WHERE id = $1 AND user_id = $2",
    [id, user.id]
  );
  if (project.rows.length === 0) {
    return NextResponse.json({ error: "Projekt nicht gefunden" }, { status: 404 });
  }

  const body = await req.json();
  const { title, purpose, character_arc, tension_level } = body;

  const result = await query(
    `UPDATE chapter_outlines 
     SET title = COALESCE($1, title), 
         purpose = COALESCE($2, purpose), 
         character_arc = COALESCE($3, character_arc), 
         tension_level = COALESCE($4, tension_level)
     WHERE id = $5 AND project_id = $6
     RETURNING *`,
    [title, purpose, character_arc, tension_level, outlineId, id]
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Outline-Eintrag nicht gefunden" }, { status: 404 });
  }

  return NextResponse.json({ outline: result.rows[0] });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string; outlineId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  const { id, outlineId } = await params;

  const project = await query(
    "SELECT id FROM projects WHERE id = $1 AND user_id = $2",
    [id, user.id]
  );
  if (project.rows.length === 0) {
    return NextResponse.json({ error: "Projekt nicht gefunden" }, { status: 404 });
  }

  await query("DELETE FROM chapter_outlines WHERE id = $1 AND project_id = $2", [outlineId, id]);

  return NextResponse.json({ success: true });
}
