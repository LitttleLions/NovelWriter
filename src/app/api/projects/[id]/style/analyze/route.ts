import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { generateText } from "@/lib/openrouter";
import { PROMPTS } from "@/lib/prompts";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  const { id } = await params;
  const { style_sample, mode } = await req.json();

  const project = await query(
    "SELECT * FROM projects WHERE id = $1 AND user_id = $2",
    [id, user.id]
  );

  if (project.rows.length === 0) {
    return NextResponse.json({ error: "Projekt nicht gefunden" }, { status: 404 });
  }

  const p = project.rows[0];
  const sampleText = style_sample || p.style_sample;

  if (!sampleText) {
    return NextResponse.json({ error: "Kein Stil-Text vorhanden" }, { status: 400 });
  }

  if (mode === "direct") {
    const styleJson = {
      author_style: "Benutzerdefiniert",
      raw_description: sampleText,
      source: "direct_input",
    };

    await query(
      "UPDATE projects SET style_sample = $1, style_json = $2, updated_at = NOW() WHERE id = $3",
      [sampleText, JSON.stringify(styleJson), id]
    );

    return NextResponse.json({ style: styleJson });
  }

  try {
    const result = await generateText(
      p.ai_provider || "anthropic/claude-sonnet-4-5",
      PROMPTS.styleAnalyzer,
      `Analysiere den folgenden Text:\n\n${sampleText}`,
      4000
    );

    let styleJson;
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      styleJson = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(result);
    } catch {
      styleJson = { raw_analysis: result };
    }

    styleJson.source = "analyzed";

    await query(
      "UPDATE projects SET style_sample = $1, style_json = $2, updated_at = NOW() WHERE id = $3",
      [sampleText, JSON.stringify(styleJson), id]
    );

    return NextResponse.json({ style: styleJson });
  } catch (error: any) {
    console.error("Style analysis error:", error);
    return NextResponse.json({ error: "Stil-Analyse fehlgeschlagen: " + error.message }, { status: 500 });
  }
}
