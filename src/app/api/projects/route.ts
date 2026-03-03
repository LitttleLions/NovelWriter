import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

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
    const { title, genre, target_word_count, language, summary, characters, outline, ai_provider } = await req.json();

    if (!title) {
      return NextResponse.json({ error: "Titel erforderlich" }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO projects (user_id, title, genre, target_word_count, language, summary, characters, outline, ai_provider)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        user.id, title, genre || null,
        target_word_count || 80000, language || "Deutsch",
        summary || null, characters || null, outline || null,
        ai_provider || "anthropic/claude-sonnet-4-5",
      ]
    );

    return NextResponse.json({ project: result.rows[0] });
  } catch (error: any) {
    console.error("Create project error:", error);
    return NextResponse.json({ error: "Projekt konnte nicht erstellt werden" }, { status: 500 });
  }
}
