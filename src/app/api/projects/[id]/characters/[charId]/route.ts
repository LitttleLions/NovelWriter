import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string; charId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  const { id, charId } = await params;
  const project = await query("SELECT id FROM projects WHERE id = $1 AND user_id = $2", [id, user.id]);
  if (project.rows.length === 0) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  const body = await req.json();
  const { name, role, description, traits, backstory, appearance, notes, first_appears_chapter } = body;

  const result = await query(
    `UPDATE project_characters
     SET name = COALESCE($1, name),
         role = COALESCE($2, role),
         description = COALESCE($3, description),
         traits = COALESCE($4, traits),
         backstory = COALESCE($5, backstory),
         appearance = COALESCE($6, appearance),
         notes = COALESCE($7, notes),
         first_appears_chapter = COALESCE($8, first_appears_chapter),
         updated_at = NOW()
     WHERE id = $9 AND project_id = $10
     RETURNING *`,
    [name, role, description, traits, backstory, appearance, notes, first_appears_chapter ?? null, charId, id]
  );

  if (result.rows.length === 0) return NextResponse.json({ error: "Charakter nicht gefunden" }, { status: 404 });
  return NextResponse.json({ character: result.rows[0] });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string; charId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  const { id, charId } = await params;
  const project = await query("SELECT id FROM projects WHERE id = $1 AND user_id = $2", [id, user.id]);
  if (project.rows.length === 0) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  await query("DELETE FROM project_characters WHERE id = $1 AND project_id = $2", [charId, id]);
  return NextResponse.json({ success: true });
}
