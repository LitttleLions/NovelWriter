import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { VALID_PROJECT_TYPES, VALID_SCREENPLAY_FORMATS, VALID_SCREENPLAY_PRESETS } from "@/lib/screenplay-presets";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  const { id } = await params;
  const result = await query(
    "SELECT * FROM projects WHERE id = $1 AND user_id = $2",
    [id, user.id]
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Projekt nicht gefunden" }, { status: 404 });
  }

  const chapters = await query(
    "SELECT * FROM chapters WHERE project_id = $1 ORDER BY chapter_number",
    [id]
  );

  const outlines = await query(
    "SELECT * FROM chapter_outlines WHERE project_id = $1 ORDER BY chapter_number",
    [id]
  );

  return NextResponse.json({
    project: result.rows[0],
    chapters: chapters.rows,
    outlines: outlines.rows,
  });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  // Validate the screenplay-related fields against whitelists.
  if (body.project_type !== undefined && !VALID_PROJECT_TYPES.includes(body.project_type)) {
    return NextResponse.json({ error: `Ungültiger Werk-Typ: ${body.project_type}` }, { status: 400 });
  }
  if (body.screenplay_format !== undefined && body.screenplay_format !== null
      && !VALID_SCREENPLAY_FORMATS.includes(body.screenplay_format)) {
    return NextResponse.json({ error: `Ungültiges Drehbuch-Format: ${body.screenplay_format}` }, { status: 400 });
  }
  if (body.screenplay_style_preset !== undefined && body.screenplay_style_preset !== null
      && !VALID_SCREENPLAY_PRESETS.includes(body.screenplay_style_preset)) {
    return NextResponse.json({ error: `Ungültiges Drehbuch-Stil-Preset: ${body.screenplay_style_preset}` }, { status: 400 });
  }
  // Cross-field consistency: novel projects cannot carry screenplay-only data.
  if (body.project_type === "novel") {
    if (body.screenplay_format !== undefined && body.screenplay_format !== null) {
      return NextResponse.json({ error: "Roman-Projekte dürfen kein screenplay_format setzen." }, { status: 400 });
    }
    if (body.screenplay_style_preset !== undefined && body.screenplay_style_preset !== null) {
      return NextResponse.json({ error: "Roman-Projekte dürfen kein screenplay_style_preset setzen." }, { status: 400 });
    }
  }

  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;

  for (const key of ["title", "genre", "target_word_count", "language", "summary", "characters", "outline", "style_sample", "style_json", "style_notes", "ai_provider", "status", "project_type", "screenplay_format", "screenplay_style_preset"]) {
    if (body[key] !== undefined) {
      fields.push(`${key} = $${idx}`);
      values.push(key === "style_json" ? JSON.stringify(body[key]) : body[key]);
      idx++;
    }
  }

  if (fields.length === 0) {
    return NextResponse.json({ error: "Keine Änderungen" }, { status: 400 });
  }

  fields.push(`updated_at = NOW()`);
  values.push(id, user.id);

  const result = await query(
    `UPDATE projects SET ${fields.join(", ")} WHERE id = $${idx} AND user_id = $${idx + 1} RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Projekt nicht gefunden" }, { status: 404 });
  }

  return NextResponse.json({ project: result.rows[0] });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  const { id } = await params;
  await query("DELETE FROM projects WHERE id = $1 AND user_id = $2", [id, user.id]);
  return NextResponse.json({ success: true });
}
