import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { validateScreenplayFields } from "@/lib/screenplay-presets";
import { validateProjectModel } from "@/lib/ai-settings";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  const result = await query(
    `SELECT p.*, 
      (SELECT COUNT(*) FROM chapters c WHERE c.project_id = p.id) as chapter_count,
      (SELECT COALESCE(SUM(c.word_count), 0) FROM chapters c WHERE c.project_id = p.id) as total_words
    FROM projects p WHERE p.user_id = $1 ORDER BY p.updated_at DESC`,
    [user.id]
  );

  return NextResponse.json({ projects: result.rows });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  try {
    const {
      title, genre, target_word_count, language, summary, characters, outline,
      project_type, screenplay_format, screenplay_style_preset, style_notes, ai_provider,
    } = await req.json();

    if (!title) {
      return NextResponse.json({ error: "Titel erforderlich" }, { status: 400 });
    }

    let validated;
    try {
      validated = validateScreenplayFields({ project_type, screenplay_format, screenplay_style_preset });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || "Ungültige Werk-Typ-Felder" }, { status: 400 });
    }

    let selectedModel: string;
    try {
      selectedModel = await validateProjectModel(ai_provider);
    } catch (error: any) {
      return NextResponse.json(
        { error: error?.message || "Ungültiges KI-Modell" },
        { status: 400 },
      );
    }
    const result = await query(
      `INSERT INTO projects (user_id, title, genre, target_word_count, language, summary, characters, outline, ai_provider, project_type, screenplay_format, screenplay_style_preset, style_notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        user.id, title, genre || null,
        target_word_count || 80000, language || "Deutsch",
        summary || null, characters || null, outline || null, selectedModel,
        validated.project_type, validated.screenplay_format, validated.screenplay_style_preset,
        (typeof style_notes === "string" && style_notes.trim()) ? style_notes : null,
      ]
    );

    return NextResponse.json({ project: result.rows[0] });
  } catch (error: any) {
    console.error("Create project error:", error);
    return NextResponse.json({ error: "Projekt konnte nicht erstellt werden" }, { status: 500 });
  }
}
