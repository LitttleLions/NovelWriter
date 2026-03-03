import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { generateText, estimateCost } from "@/lib/openrouter";
import { PROMPTS } from "@/lib/prompts";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  const { id } = await params;
  const { chapter_number } = await req.json();

  const project = await query(
    "SELECT * FROM projects WHERE id = $1 AND user_id = $2",
    [id, user.id]
  );
  if (project.rows.length === 0) {
    return NextResponse.json({ error: "Projekt nicht gefunden" }, { status: 404 });
  }

  const p = project.rows[0];

  const outline = await query(
    "SELECT * FROM chapter_outlines WHERE project_id = $1 AND chapter_number = $2",
    [id, chapter_number]
  );

  const prevChapters = await query(
    "SELECT chapter_number, title, content FROM chapters WHERE project_id = $1 AND chapter_number < $2 ORDER BY chapter_number DESC LIMIT 2",
    [id, chapter_number]
  );

  const chapterOutline = outline.rows[0];

  try {
    const contextText = prevChapters.rows.length > 0
      ? prevChapters.rows.map((c: any) =>
          `--- Kapitel ${c.chapter_number}: ${c.title} ---\n${(c.content || "").substring(0, 2000)}...`
        ).join("\n\n")
      : "Dies ist das erste Kapitel.";

    const userPrompt = `Kapitel-Nummer: ${chapter_number}
Kapitel-Titel: ${chapterOutline?.title || `Kapitel ${chapter_number}`}
Kapitel-Zweck: ${chapterOutline?.purpose || "Handlung vorantreiben"}

Gesamte Summary:
${p.summary || "Nicht vorhanden"}

Charaktere:
${p.characters || "Aus der Summary ableiten"}

Sprache: ${p.language || "Deutsch"}

${p.style_json ? `Aktueller Stil (halte dich strikt daran):\n${JSON.stringify(p.style_json, null, 2)}` : "Kein spezieller Stil definiert."}

Kontext – Letzte Kapitel:
${contextText}`;

    const model = p.ai_provider || "anthropic/claude-sonnet-4-5";
    const result = await generateText(model, PROMPTS.chapterWriter, userPrompt, 16000);

    const wordCount = result.content.trim().split(/\s+/).length;
    const cost = estimateCost(model, result.prompt_tokens, result.completion_tokens);

    const existing = await query(
      "SELECT id FROM chapters WHERE project_id = $1 AND chapter_number = $2",
      [id, chapter_number]
    );

    let chapter;
    if (existing.rows.length > 0) {
      const updated = await query(
        `UPDATE chapters SET content = $1, title = $2, word_count = $3, status = 'generated', updated_at = NOW()
         WHERE id = $4 RETURNING *`,
        [result.content, chapterOutline?.title || `Kapitel ${chapter_number}`, wordCount, existing.rows[0].id]
      );
      chapter = updated.rows[0];
    } else {
      const inserted = await query(
        `INSERT INTO chapters (project_id, chapter_number, title, content, word_count, status)
         VALUES ($1, $2, $3, $4, $5, 'generated') RETURNING *`,
        [id, chapter_number, chapterOutline?.title || `Kapitel ${chapter_number}`, result.content, wordCount]
      );
      chapter = inserted.rows[0];
    }

    await query("UPDATE projects SET updated_at = NOW() WHERE id = $1", [id]);

    await query(
      `INSERT INTO generation_log (project_id, action, model, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, chapter_number, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id, "Kapitel generiert", model, result.prompt_tokens, result.completion_tokens, result.total_tokens, cost, chapter_number, chapterOutline?.title || `Kapitel ${chapter_number}`]
    );

    return NextResponse.json({ chapter, tokens: result.total_tokens, cost });
  } catch (error: any) {
    console.error("Chapter generation error:", error);
    return NextResponse.json({ error: "Kapitel-Generierung fehlgeschlagen: " + error.message }, { status: 500 });
  }
}
