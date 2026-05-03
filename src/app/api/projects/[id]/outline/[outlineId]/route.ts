import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string; outlineId: string }> }) {
  try {
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
    const { title, purpose, character_arc, tension_level, location, key_events, raw_notes, structural_role } = body;

    const tension =
      tension_level === undefined || tension_level === null || tension_level === ""
        ? null
        : Number(tension_level);

    const result = await query(
      `UPDATE chapter_outlines 
       SET title = COALESCE($1, title), 
           purpose = COALESCE($2, purpose), 
           character_arc = COALESCE($3, character_arc), 
           tension_level = COALESCE($4, tension_level),
           location = COALESCE($5, location),
           key_events = COALESCE($6, key_events),
           raw_notes = COALESCE($7, raw_notes),
           structural_role = COALESCE($8, structural_role)
       WHERE id = $9 AND project_id = $10
       RETURNING *`,
      [title ?? null, purpose ?? null, character_arc ?? null, tension, location ?? null, key_events ?? null, raw_notes ?? null, structural_role ?? null, outlineId, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Outline-Eintrag nicht gefunden" }, { status: 404 });
    }

    return NextResponse.json({ outline: result.rows[0] });
  } catch (error: any) {
    console.error("Outline PUT error:", error);
    return NextResponse.json(
      { error: `Speichern fehlgeschlagen: ${error?.message || "Unbekannter Fehler"}` },
      { status: 500 }
    );
  }
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
