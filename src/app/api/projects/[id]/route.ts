import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { VALID_PROJECT_TYPES, VALID_SCREENPLAY_FORMATS, VALID_SCREENPLAY_PRESETS } from "@/lib/screenplay-presets";
import { validateProjectModel } from "@/lib/ai-settings";

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
  const latestAiActivity = await query(
    `SELECT action, details, created_at
     FROM generation_log
     WHERE project_id = $1
     ORDER BY created_at DESC, id DESC
     LIMIT 1`,
    [id]
  );

  return NextResponse.json({
    project: result.rows[0],
    chapters: chapters.rows,
    outlines: outlines.rows,
    latestAiActivity: latestAiActivity.rows[0] ?? null,
  });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  // Load the existing project so we can enforce immutability of the work-type
  // fields (project_type, screenplay_format) after creation. The user picks
  // Roman / Spielfilm / TV-Episode at creation; switching later would
  // invalidate prompt routing, page-vs-word units, and outline conventions.
  const existing = await query(
    "SELECT project_type, screenplay_format, ai_provider FROM projects WHERE id = $1 AND user_id = $2",
    [id, user.id]
  );
  if (existing.rows.length === 0) {
    return NextResponse.json({ error: "Projekt nicht gefunden" }, { status: 404 });
  }
  const current = existing.rows[0];

  let selectedModel: string | undefined;
  if (body.ai_provider !== undefined) {
    try {
      selectedModel = await validateProjectModel(body.ai_provider);
    } catch (error: any) {
      return NextResponse.json({ error: error?.message || "Ungültiges KI-Modell" }, { status: 400 });
    }
  }

  // Reject attempts to change project_type or screenplay_format on an
  // existing project. The screenplay style preset CAN still be changed
  // (that's a soft writing-style choice and is safe to swap mid-project).
  if (body.project_type !== undefined && body.project_type !== current.project_type) {
    return NextResponse.json(
      { error: "Werk-Typ (Roman/Drehbuch) kann nach der Anlage nicht mehr geändert werden." },
      { status: 400 }
    );
  }
  if (body.screenplay_format !== undefined && body.screenplay_format !== current.screenplay_format) {
    return NextResponse.json(
      { error: "Drehbuch-Format (Spielfilm/TV-Episode) kann nach der Anlage nicht mehr geändert werden." },
      { status: 400 }
    );
  }

  // Validate the screenplay-related fields against whitelists. (project_type
  // and screenplay_format are already locked above, but we still validate
  // screenplay_style_preset since it remains mutable.)
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
  if (current.project_type === "novel") {
    if (body.screenplay_style_preset !== undefined && body.screenplay_style_preset !== null) {
      return NextResponse.json({ error: "Roman-Projekte dürfen kein screenplay_style_preset setzen." }, { status: 400 });
    }
  }

  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;

  // project_type and screenplay_format are intentionally NOT in this list:
  // they are immutable after creation (enforced above).
  for (const key of ["title", "genre", "target_word_count", "language", "summary", "characters", "outline", "style_sample", "style_json", "style_notes", "status", "screenplay_style_preset"]) {
    if (body[key] !== undefined) {
      fields.push(`${key} = $${idx}`);
      values.push(key === "style_json" ? JSON.stringify(body[key]) : body[key]);
      idx++;
    }
  }
  if (selectedModel) {
    fields.push(`ai_provider = $${idx}`);
    values.push(selectedModel);
    idx++;
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
