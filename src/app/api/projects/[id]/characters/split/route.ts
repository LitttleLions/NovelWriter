import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { generateText } from "@/lib/openrouter";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  const { id } = await params;
  const { characters } = await req.json();

  const project = await query(
    "SELECT * FROM projects WHERE id = $1 AND user_id = $2",
    [id, user.id]
  );

  if (project.rows.length === 0) {
    return NextResponse.json({ error: "Projekt nicht gefunden" }, { status: 404 });
  }

  const p = project.rows[0];

  try {
    const prompt = `Analysiere die folgende Charakter-Liste und unterteile sie in übersichtliche Blöcke (einen Block pro Charakter). 
Jeder Block sollte mit dem Namen des Charakters beginnen und Details wie Rolle, Motivation und Aussehen enthalten.
Verwende ein klares Format, z.B. mit Überschriften oder Aufzählungszeichen.

Charaktere:
${characters}`;

    const result = await generateText(
      p.ai_provider || "anthropic/claude-3-opus",
      "Du bist ein erfahrener Roman-Editor.",
      prompt,
      4000
    );

    await query(
      "UPDATE projects SET characters = $1, updated_at = NOW() WHERE id = $2",
      [result, id]
    );

    return NextResponse.json({ characters: result });
  } catch (error: any) {
    console.error("Split characters error:", error);
    return NextResponse.json({ error: "Charakter-Splitting fehlgeschlagen: " + error.message }, { status: 500 });
  }
}
