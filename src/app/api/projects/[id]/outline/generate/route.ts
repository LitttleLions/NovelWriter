import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { generateText, estimateCost, describeAiError } from "@/lib/openrouter";
import { PROMPTS } from "@/lib/prompts";

const CHUNK_SIZE = 25;

function splitOutlineIntoScenes(text: string): string[] {
  // Verbesserter Splitter: Teilt bei Orten, Tagen oder expliziten Szenen-Markern
  const lines = text.split("\n");
  const scenes: string[] = [];
  let current: string[] = [];

  const isNewScene = (line: string) => {
    const l = line.trim();
    return /^(?:\d+\.\s|Chapter\s+\d+|Kapitel\s+\d+|Scene\s+\d+|Szene\s+\d+|ACT\s+|PART\s+|Day\s+\d+|Tag\s+\d+|[A-Z][A-Za-z\s]+,\s+Day|[A-Z][A-Za-z\s]+,\s+Tag)/i.test(l);
  };

  for (const line of lines) {
    if (isNewScene(line) && current.length > 0) {
      scenes.push(current.join("\n").trim());
      current = [];
    }
    if (line.trim()) {
      current.push(line);
    }
  }

  if (current.length > 0) {
    scenes.push(current.join("\n").trim());
  }

  // Fallback: Wenn kein Marker gefunden wurde, teile nach Absätzen
  if (scenes.length <= 1) {
    return text.split(/\n{2,}/).filter(s => s.trim().length > 10);
  }

  return scenes;
}

async function convertChunk(
  model: string,
  chunk: string[],
  startNumber: number,
  language: string = "Deutsch",
  projectType: string = "novel"
): Promise<{ chapters: any[]; tokens: { prompt: number; completion: number; total: number } }> {
  const chunkText = chunk.join("\n\n---SZENE---\n\n");

  const screenplayHint = projectType === "screenplay"
    ? `

DIES IST EIN DREHBUCH-PROJEKT. WICHTIG für das Feld "location":
- "location" muss eine korrekte SLUGLINE im Industriestandard sein, in der Zielsprache.
- Format Deutsch: "<INNEN./AUSSEN.> ORT - <TAG/NACHT/MORGEN/ABEND>" – Beispiele: "INNEN. KÜCHE - TAG", "AUSSEN. PARKHAUS - NACHT".
- Format Englisch: "<INT./EXT.> LOCATION - <DAY/NIGHT/MORNING/EVENING>" – Beispiele: "INT. KITCHEN - DAY".
- Wenn die Vorlage nur einen Ort liefert (z.B. "Küche, abends"), forme ihn in eine korrekte Slugline um ("INNEN. KÜCHE - ABEND").
- "title" ist ein kurzer Szenenname (3–8 Wörter), KEINE Slugline.
- "key_events" und "raw_notes" enthalten weiterhin die dramaturgische Substanz der Szene.`
    : "";

  const userPrompt = `Wandle die folgenden ${chunk.length} Szenen in JSON um.
Die Szenen sind durch "---SZENE---" getrennt.
chapter_number beginnt bei ${startNumber}.
ZIELSPRACHE: ${language} (Bitte alle Felder außer raw_notes in dieser Sprache ausgeben).
BEHALTE jeden einzelnen Satz aus "raw_notes" 1:1 – kürze NICHTS.${screenplayHint}

${chunkText}`;

  const result = await generateText(model, PROMPTS.customOutlineConverter, userPrompt, 32000);

  let chapters: any[] = [];
  try {
    const jsonMatch = result.content.match(/\[[\s\S]*\]/);
    chapters = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(result.content);
  } catch {
    const partialMatch = result.content.match(/\{[\s\S]*?\}/g);
    if (partialMatch) {
      chapters = partialMatch.map((m: string, i: number) => {
        try {
          return JSON.parse(m);
        } catch {
          return { chapter_number: startNumber + i, title: `Szene ${startNumber + i}`, purpose: "", character_arc: "", tension_level: 5, raw_notes: chunk[i] || "" };
        }
      });
    }
  }

  chapters = chapters.map((ch, i) => ({
    ...ch,
    chapter_number: startNumber + i,
  }));

  return {
    chapters,
    tokens: { prompt: result.prompt_tokens, completion: result.completion_tokens, total: result.total_tokens },
  };
}

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

  if (!p.summary && !await req.clone().json().then((b: any) => b?.custom_outline).catch(() => false)) {
    return NextResponse.json({ error: "Summary ist erforderlich" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const { custom_outline } = body;

  try {
    const model = p.ai_provider || "anthropic/claude-sonnet-4.6";
    let allChapters: any[] = [];
    let totalTokens = { prompt: 0, completion: 0, total: 0 };

    if (custom_outline) {
      const scenes = splitOutlineIntoScenes(custom_outline);

      if (scenes.length === 0) {
        return NextResponse.json({ error: "Keine Szenen in der Outline erkannt" }, { status: 400 });
      }

      const chunks: string[][] = [];
      for (let i = 0; i < scenes.length; i += CHUNK_SIZE) {
        chunks.push(scenes.slice(i, i + CHUNK_SIZE));
      }

      let chapterCounter = 1;
      for (const chunk of chunks) {
        const { chapters, tokens } = await convertChunk(model, chunk, chapterCounter, p.language || "Deutsch", p.project_type || "novel");
        allChapters = [...allChapters, ...chapters];
        chapterCounter += chapters.length;
        totalTokens.prompt += tokens.prompt;
        totalTokens.completion += tokens.completion;
        totalTokens.total += tokens.total;
      }
    } else {
      const isScreenplay = p.project_type === "screenplay";
      const formatLabel = isScreenplay
        ? (p.screenplay_format === "tv_episode" ? "TV-Episode (Drehbuch)" : "Spielfilm (Drehbuch)")
        : "Roman";
      const lengthLine = isScreenplay
        ? `Gesamtlänge: ca. ${Math.round((p.target_word_count || 22500) / 250)} Drehbuchseiten (1 Seite ≈ 250 Wörter ≈ 1 Min. Filmzeit)`
        : `Gesamtlänge: ${p.target_word_count} Wörter`;
      const structureLine = isScreenplay
        ? "Struktur: Klassische 3-Akt-Drehbuchstruktur. Erstelle Szenen (KEINE Romankapitel) – jede Szene mit eigener Slugline im Feld 'location' (Format Deutsch: 'INNEN./AUSSEN. ORT - TAG/NACHT'; Format Englisch: 'INT./EXT. LOCATION - DAY/NIGHT'). 'title' ist ein kurzer Szenenname, keine Slugline. 'key_events' enthält die Action-Beats."
        : "Akt-Struktur: 3-Akt";

      const userPrompt = `Werk-Typ: ${formatLabel}
Titel: ${p.title}
Genre: ${p.genre || "Nicht angegeben"}
${lengthLine}
Sprache: ${p.language}
${structureLine}

Summary:
${p.summary}

Charaktere:
${p.characters || "Werden aus der Summary abgeleitet"}

${p.outline ? `Vorhandene Outline:\n${p.outline}` : "Keine Outline vorhanden – erstelle eine komplett neue."}

${p.style_json ? `Stil-Vorgaben:\n${JSON.stringify(p.style_json)}` : ""}`;

      const result = await generateText(model, PROMPTS.chapterArchitect, userPrompt, 32000);
      const jsonMatch = result.content.match(/\[[\s\S]*\]/);
      allChapters = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(result.content);
      totalTokens = { prompt: result.prompt_tokens, completion: result.completion_tokens, total: result.total_tokens };
    }

    await query("DELETE FROM chapters WHERE project_id = $1", [id]);
    await query("DELETE FROM chapter_outlines WHERE project_id = $1", [id]);

    for (const ch of allChapters) {
      await query(
        `INSERT INTO chapter_outlines
           (project_id, chapter_number, title, purpose, character_arc, tension_level, location, key_events, raw_notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          id,
          ch.chapter_number,
          ch.title || `Szene ${ch.chapter_number}`,
          ch.purpose || "",
          ch.character_arc || "",
          ch.tension_level || 5,
          ch.location || "",
          ch.key_events || "",
          ch.raw_notes || "",
        ]
      );
    }

    await query("UPDATE projects SET updated_at = NOW() WHERE id = $1", [id]);

    const cost = estimateCost(model, totalTokens.prompt, totalTokens.completion);
    await query(
      `INSERT INTO generation_log (project_id, action, model, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, "Outline generiert", model, totalTokens.prompt, totalTokens.completion, totalTokens.total, cost, `${allChapters.length} Szenen`]
    );

    const outlines = await query(
      "SELECT * FROM chapter_outlines WHERE project_id = $1 ORDER BY chapter_number",
      [id]
    );

    return NextResponse.json({ outlines: outlines.rows });
  } catch (error: any) {
    console.error("Outline generation error:", error);
    const { message, status } = describeAiError(error);
    return NextResponse.json({ error: `Outline-Generierung fehlgeschlagen. ${message}` }, { status });
  }
}
