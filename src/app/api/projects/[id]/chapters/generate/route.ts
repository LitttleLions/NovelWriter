import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { generateText, estimateCost } from "@/lib/openrouter";
import { PROMPTS } from "@/lib/prompts";

function formatStyleForPrompt(style_json: any, style_notes?: string): string {
  const parts: string[] = [];

  // --- Part 1: System-generated style profile (AI-analyzed or direct input) ---
  if (style_json) {
    const s = style_json;
    const profileLines: string[] = ["[A] KI-GENERIERTES STIL-PROFIL (systemseitig hinterlegt):"];

    if (s.raw_description) {
      profileLines.push(s.raw_description);
    } else {
      if (s.author_style && s.author_style !== "Benutzerdefiniert") {
        profileLines.push(`• Schreibstil orientiert sich an: ${s.author_style}`);
      }
      if (s.tone) profileLines.push(`• Grundton: ${s.tone}`);
      if (s.tense) {
        const tenseLabel = s.tense === "past" ? "Vergangenheit" : s.tense === "present" ? "Gegenwart" : s.tense;
        profileLines.push(`• Zeitform: ${tenseLabel} – verwende AUSSCHLIESSLICH diese Zeitform`);
      }
      if (s.pacing) profileLines.push(`• Erzähltempo: ${s.pacing}`);
      if (s.sentence_length_avg) {
        const len = Number(s.sentence_length_avg);
        const guidance =
          len <= 8 ? "Kurze, prägnante Sätze. Kein Satzbau über 12 Wörter." :
          len <= 14 ? "Mittellange Sätze. Variiere zwischen 6 und 18 Wörtern." :
          "Ausgedehnte, fließende Sätze mit Nebensätzen und Einschüben.";
        profileLines.push(`• Satzlänge: Ø ${len} Wörter – ${guidance}`);
      }
      if (s.vocabulary_complexity) {
        const complexity = Number(s.vocabulary_complexity);
        const label = complexity <= 3 ? "einfaches Alltagsvokabular" :
          complexity <= 6 ? "mittleres Bildungsvokabular" : "gehobenes, literarisches Vokabular";
        profileLines.push(`• Vokabular: ${label} (${complexity}/10)`);
      }
      if (s.description_density) {
        const density = Number(s.description_density);
        const guidance = density >= 7 ? "Reichhaltige sensorische Details – Gerüche, Geräusche, Texturen, Licht." :
          density >= 4 ? "Selektive, präzise Details an entscheidenden Momenten." :
          "Minimalistische Beschreibung – lass die Handlung sprechen.";
        profileLines.push(`• Beschreibungsdichte: ${density}/10 – ${guidance}`);
      }
      if (s.dialogue_ratio_percent) {
        const ratio = Number(s.dialogue_ratio_percent);
        const guidance = ratio >= 50 ? "Dialog dominiert das Kapitel." :
          ratio >= 25 ? "Ausgewogener Mix aus Dialog und Erzählung." :
          "Wenig Dialog – Erzählerstimme steht im Vordergrund.";
        profileLines.push(`• Dialog-Anteil: ca. ${ratio}% – ${guidance}`);
      }
      if (s.favorite_literary_devices?.length) {
        profileLines.push(`• PFLICHT-Stilmittel (mindestens 3× pro Kapitel verwenden): ${s.favorite_literary_devices.join(", ")}`);
      }
      if (s.example_sentence_patterns?.length) {
        profileLines.push(`\nSTIL-MASSTAB – so MUSS der Text klingen (exakt diesen Rhythmus und diese Satzstruktur verwenden):`);
        s.example_sentence_patterns.forEach((ex: string, i: number) => {
          profileLines.push(`  ${i + 1}. "${ex}"`);
        });
      }
    }

    parts.push(profileLines.join("\n"));
  } else {
    parts.push("[A] KI-GENERIERTES STIL-PROFIL: Kein Profil vorhanden – schreibe in einem klaren, literarischen Stil.");
  }

  // --- Part 2: Manual notes (user additions that override or extend the profile) ---
  if (style_notes?.trim()) {
    parts.push(`[B] MANUELLE ERGÄNZUNGEN & KORREKTUREN (haben Vorrang vor Teil A – direkt vom Autor vorgegeben):\n${style_notes.trim()}`);
  }

  return parts.join("\n\n");
}

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

  // Load characters: first try outline-specific, then fall back to all project characters
  let characterRows: any[] = [];
  let isFiltered = false;
  if (chapterOutline) {
    const assignedChars = await query(
      `SELECT pc.* FROM project_characters pc
       INNER JOIN outline_characters oc ON oc.character_id = pc.id
       WHERE oc.outline_id = $1
       ORDER BY pc.created_at`,
      [chapterOutline.id]
    );
    if (assignedChars.rows.length > 0) {
      characterRows = assignedChars.rows;
      isFiltered = true;
    }
  }
  if (!isFiltered) {
    const allChars = await query(
      "SELECT * FROM project_characters WHERE project_id = $1 ORDER BY pc.created_at",
      [id]
    );
    characterRows = allChars.rows;
  }

  function formatCharactersForPrompt(chars: any[]): string {
    if (chars.length === 0) return p.characters || "Nicht spezifiziert";
    return chars.map((c) => [
      `**${c.name}**${c.role ? ` (${c.role})` : ""}`,
      c.description ? `Beschreibung: ${c.description}` : "",
      c.traits ? `Eigenschaften: ${c.traits}` : "",
      c.backstory ? `Hintergrund: ${c.backstory}` : "",
      c.appearance ? `Aussehen: ${c.appearance}` : "",
      c.notes ? `Notizen: ${c.notes}` : "",
    ].filter(Boolean).join("\n")).join("\n\n");
  }

  try {
    const contextText = prevChapters.rows.length > 0
      ? prevChapters.rows.map((c: any) =>
          `--- Kapitel ${c.chapter_number}: ${c.title} ---\n${(c.content || "").substring(0, 2000)}...`
        ).join("\n\n")
      : "Dies ist das erste Kapitel.";

    const styleBlock = formatStyleForPrompt(p.style_json, p.style_notes);
    
    // Explicit Style Wrapper for the LLM
    const finalStyleInstruction = `
=== KRITISCHE STIL-VORGABE (DIESE REGELN ÜBERSCHREIBEN ALLES ANDERE) ===
${styleBlock}
======================================================================
`.trim();

    const totalCharsResult = await query("SELECT COUNT(*) FROM project_characters WHERE project_id = $1", [id]);
    const totalCharsCount = parseInt(totalCharsResult.rows[0].count);
    const characterLabel = isFiltered
      ? "Charaktere in diesem Kapitel (nur diese Figuren auftreten lassen)"
      : "Charaktere";

    const outlineBlock = chapterOutline ? `
Kapitel-Titel: ${chapterOutline.title || `Kapitel ${chapter_number}`}
Kapitel-Zweck: ${chapterOutline.purpose || "Handlung vorantreiben"}
${chapterOutline.character_arc ? `Charakter-Entwicklung: ${chapterOutline.character_arc}` : ""}
${chapterOutline.location ? `Ort & Zeit: ${chapterOutline.location}` : ""}
${chapterOutline.key_events ? `Schlüsselereignisse (MÜSSEN vorkommen): ${chapterOutline.key_events}` : ""}
${chapterOutline.tension_level ? `Spannungslevel: ${chapterOutline.tension_level}/10` : ""}
${chapterOutline.raw_notes ? `\nSzenen-Vorlage des Autors (inhaltlich bindend, wortgetreu umsetzen):\n${chapterOutline.raw_notes}` : ""}`.trim()
    : `Kapitel-Titel: Kapitel ${chapter_number}\nKapitel-Zweck: Handlung vorantreiben`;

    const userPrompt = `Kapitel-Nummer: ${chapter_number}

${finalStyleInstruction}

=== KAPITEL-VORGABE ===
${outlineBlock}

=== PROJEKT-KONTEXT ===
Gesamte Summary:
${p.summary || "Nicht vorhanden"}

${characterLabel}:
${formatCharactersForPrompt(characterRows)}

Sprache: ${p.language || "Deutsch"}

=== KONTEXT – LETZTE KAPITEL (für Kontinuität) ===
${contextText}

HINWEIS: Erinnere dich an die KRITISCHE STIL-VORGABE am Anfang dieses Prompts. Sie ist absolut bindend für den Rhythmus, die Wortwahl und die Atmosphäre dieses Kapitels.`;

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
