import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { generateText, estimateCost } from "@/lib/openrouter";
import { PROMPTS } from "@/lib/prompts";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  const { id } = await params;
  const project = await query(
    "SELECT * FROM projects WHERE id = $1 AND user_id = $2",
    [id, user.id]
  );

  if (project.rows.length === 0) {
    return NextResponse.json({ error: "Projekt nicht gefunden" }, { status: 404 });
  }

  const p = project.rows[0];

  if (!p.summary) {
    return NextResponse.json({ error: "Summary ist erforderlich" }, { status: 400 });
  }

  const { custom_outline } = await req.json().catch(() => ({}));

  try {
    const model = p.ai_provider || "anthropic/claude-sonnet-4-5";
    let result;
    let chapters;

    if (custom_outline) {
      const architectPrompt = `Wandle die folgende manuelle Outline in ein valides JSON-Array um, das für die Kapitel-Struktur genutzt werden kann.

Outline:
${custom_outline}

${PROMPTS.chapterArchitect}`;

      result = await generateText(model, "Du bist ein Master Book Architect.", architectPrompt, 8000);
      const jsonMatch = result.content.match(/\[[\s\S]*\]/);
      chapters = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(result.content);
    } else {
      const userPrompt = `Titel: ${p.title}
Genre: ${p.genre || "Nicht angegeben"}
Gesamtlänge: ${p.target_word_count} Wörter
Sprache: ${p.language}
Akt-Struktur: 3-Akt

Summary:
${p.summary}

Charaktere:
${p.characters || "Werden aus der Summary abgeleitet"}

${p.outline ? `Vorhandene Outline:\n${p.outline}` : "Keine Outline vorhanden – erstelle eine komplett neue."}

${p.style_json ? `Stil-Vorgaben:\n${JSON.stringify(p.style_json)}` : ""}`;

      result = await generateText(model, PROMPTS.chapterArchitect, userPrompt, 8000);
      const jsonMatch = result.content.match(/\[[\s\S]*\]/);
      chapters = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(result.content);
    }

    await query("DELETE FROM chapters WHERE project_id = $1", [id]);
    await query("DELETE FROM chapter_outlines WHERE project_id = $1", [id]);

    for (const ch of chapters) {
      await query(
        `INSERT INTO chapter_outlines (project_id, chapter_number, title, purpose, character_arc, tension_level)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, ch.chapter_number, ch.title, ch.purpose, ch.character_arc, ch.tension_level || 5]
      );
    }

    await query("UPDATE projects SET updated_at = NOW() WHERE id = $1", [id]);

    const cost = estimateCost(model, result.prompt_tokens, result.completion_tokens);
    await query(
      `INSERT INTO generation_log (project_id, action, model, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, "Outline generiert", model, result.prompt_tokens, result.completion_tokens, result.total_tokens, cost, `${chapters.length} Kapitel-Punkte`]
    );

    const outlines = await query(
      "SELECT * FROM chapter_outlines WHERE project_id = $1 ORDER BY chapter_number",
      [id]
    );

    return NextResponse.json({ outlines: outlines.rows });
  } catch (error: any) {
    console.error("Outline generation error:", error);
    return NextResponse.json({ error: "Outline-Generierung fehlgeschlagen: " + error.message }, { status: 500 });
  }
}
