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
  const body = await req.json();
  const { title, purpose, chapter_number } = body;

  try {
    const model = p.ai_provider || "anthropic/claude-sonnet-4-5";
    
    // Prompt zur Überarbeitung/Vervollständigung des manuellen Punkts
    const refinePrompt = `Überarbeite und vervollständige den folgenden Kapitel-Punkt für das Projekt "${p.title}" (Genre: ${p.genre}).
Sorge für Einheitlichkeit mit dem restlichen Projekt.

Eingabe:
Titel: ${title}
Zweck: ${purpose}

Antworte NUR mit einem validen JSON-Objekt im folgenden Format:
{
  "title": "Verfeinerter Titel",
  "purpose": "Detaillierter Zweck (1 Satz)",
  "character_arc": "Geplante Charakterentwicklung",
  "location": "Ort und Zeit",
  "key_events": "Wichtigste Ereignisse (kommagetrennt)",
  "tension_level": 5
}`;

    const result = await generateText(model, "Du bist ein präziser Buch-Architekt.", refinePrompt, 2000);
    let refined = { title, purpose, character_arc: "", location: "", key_events: "", tension_level: 5 };
    
    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        refined = { ...refined, ...JSON.parse(jsonMatch[0]) };
      }
    } catch (e) {
      console.error("Refine parsing error:", e);
    }

    const insertResult = await query(
      `INSERT INTO chapter_outlines (project_id, chapter_number, title, purpose, character_arc, tension_level, location, key_events, raw_notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        id, 
        chapter_number, 
        refined.title, 
        refined.purpose, 
        refined.character_arc, 
        refined.tension_level, 
        refined.location, 
        refined.key_events, 
        `Manuell hinzugefügt: ${title} - ${purpose}`
      ]
    );

    const cost = estimateCost(model, result.prompt_tokens, result.completion_tokens);
    await query(
      `INSERT INTO generation_log (project_id, action, model, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, "Outline-Punkt verfeinert", model, result.prompt_tokens, result.completion_tokens, result.total_tokens, cost, `Kapitel ${chapter_number}: ${refined.title}`]
    );

    return NextResponse.json({ outline: insertResult.rows[0] });
  } catch (error: any) {
    console.error("Outline add error:", error);
    return NextResponse.json({ error: "Fehler beim Hinzufügen des Punkts" }, { status: 500 });
  }
}
