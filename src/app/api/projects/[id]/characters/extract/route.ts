import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { generateText, estimateCost } from "@/lib/openrouter";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  const { id } = await params;
  const project = await query("SELECT * FROM projects WHERE id = $1 AND user_id = $2", [id, user.id]);
  if (project.rows.length === 0) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  const p = project.rows[0];
  const body = await req.json();
  const sourceText = body.text || p.characters || p.summary || "";

  if (!sourceText.trim()) {
    return NextResponse.json({ error: "Kein Text vorhanden" }, { status: 400 });
  }

  const prompt = `Analysiere den folgenden Text und extrahiere ALLE Figuren/Charaktere als strukturiertes JSON-Array.
Jede Figur bekommt einen eigenen Eintrag. Schreibe in der Sprache des Projekts (${p.language || "Deutsch"}).

Text:
---
${sourceText}
---

Antworte NUR mit einem JSON-Array:
[
  {
    "name": "Vollständiger Name der Figur",
    "role": "Hauptfigur / Nebenfigur / Antagonist / Mentor / etc.",
    "description": "Kurzbeschreibung der Figur (2–3 Sätze)",
    "traits": "Charaktereigenschaften, kommagetrennt",
    "backstory": "Hintergrundgeschichte, soweit aus dem Text erkennbar",
    "appearance": "Äußerliche Beschreibung",
    "notes": "Besonderheiten, Beziehungen zu anderen Figuren"
  }
]

Wichtig: Lass nichts weg – jede genannte Figur muss einen eigenen Eintrag bekommen.`;

  try {
    const model = p.ai_provider || "anthropic/claude-sonnet-4-5";
    const result = await generateText(model, "Du bist ein präziser Literaturanalyse-Experte.", prompt, 6000);

    let characters: any[] = [];
    try {
      const jsonMatch = result.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) characters = JSON.parse(jsonMatch[0]);
    } catch (e) {
      return NextResponse.json({ error: "Antwort konnte nicht verarbeitet werden" }, { status: 500 });
    }

    // Clear existing characters for this project and re-insert
    if (body.replace) {
      await query("DELETE FROM project_characters WHERE project_id = $1", [id]);
    }

    const inserted = [];
    for (const ch of characters) {
      const r = await query(
        `INSERT INTO project_characters (project_id, name, role, description, traits, backstory, appearance, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [id, ch.name || "Unbekannt", ch.role || null, ch.description || null,
         ch.traits || null, ch.backstory || null, ch.appearance || null, ch.notes || null]
      );
      inserted.push(r.rows[0]);
    }

    const cost = estimateCost(model, result.prompt_tokens, result.completion_tokens);
    await query(
      `INSERT INTO generation_log (project_id, action, model, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, "Charaktere extrahiert", model, result.prompt_tokens, result.completion_tokens, result.total_tokens, cost, `${inserted.length} Figuren angelegt`]
    );

    return NextResponse.json({ characters: inserted });
  } catch (error: any) {
    console.error("Character extract error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
