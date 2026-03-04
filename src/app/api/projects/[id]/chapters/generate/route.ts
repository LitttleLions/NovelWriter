import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { generateText, estimateCost } from "@/lib/openrouter";
import { PROMPTS } from "@/lib/prompts";

function formatStyleForPrompt(style_json: any, style_notes?: string): string {
  const parts: string[] = [];

  if (style_json) {
    const s = style_json;
    const profileLines: string[] = ["[A] KI-GENERIERTES STIL-PROFIL:"];

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
        profileLines.push(`• PFLICHT-Stilmittel (mindestens 3× pro Kapitel): ${s.favorite_literary_devices.join(", ")}`);
      }
      if (s.example_sentence_patterns?.length) {
        profileLines.push(`\nSTIL-MASSSTAB (exakt diesen Rhythmus und diese Satzstruktur nachahmen):`);
        s.example_sentence_patterns.forEach((ex: string, i: number) => {
          profileLines.push(`  ${i + 1}. "${ex}"`);
        });
      }
    }
    parts.push(profileLines.join("\n"));
  } else {
    parts.push("[A] KI-GENERIERTES STIL-PROFIL: Kein Profil vorhanden – schreibe in einem klaren, literarischen Stil.");
  }

  if (style_notes?.trim()) {
    parts.push(`[B] MANUELLE STIL-DIREKTIVEN VOM AUTOR (höchste Priorität – überschreibt alles andere):\n${style_notes.trim()}`);
  }

  return parts.join("\n\n");
}

function buildDynamicSystemPrompt(styleBlock: string, lang: string): string {
  return `Du bist ein Weltklasse-Ghostwriter für New York Times Bestseller-Romane.

════════════════════════════════════════
SPRACH-GESETZ (nicht verhandelbar):
Das gesamte Kapitel MUSS auf ${lang.toUpperCase()} geschrieben sein. Kein einziges Wort auf Englisch oder einer anderen Sprache. Dialoge, Erzähltext, Ortsbezeichnungen, innere Monologe – alles auf ${lang}.
════════════════════════════════════════

════════════════════════════════════════
STIL-GESETZ (deine künstlerische Persönlichkeit für dieses Werk):
${styleBlock}

Diese Stilvorhaben sind dein Grundgesetz. Du hast keinen eigenen KI-Stil – du verkörperst ausschließlich den oben definierten Stil. Jeder Satz, jede Wortwahl, jede Rhythmusentscheidung folgt dieser Vorlage.
════════════════════════════════════════

ARBEITSWEISE:
1. SPRACHE → ${lang} ohne Ausnahme
2. STIL → Exakt wie oben definiert. Stilmittel, Zeitform, Satzlänge, Tonfall – alles bindend.
3. KONTINUITÄT → Das Narrativ-Gedächtnis im User-Prompt ist deine verbindliche Vorgeschichte. Baue nahtlos darauf auf.
4. INHALT → Alle Vorgaben aus der Kapitel-Anweisung präzise umsetzen.
5. QUALITÄT → Show don't tell, starke Verben, keine Klischees, kein generischer KI-Stil.

Schreibe 3.000–5.000 Wörter. Nur den reinen Kapiteltext – keine Überschriften, keine Metadaten, kein "Hier ist Kapitel X".`;
}

function formatCharactersForPrompt(chars: any[], tierMode = false): string {
  if (chars.length === 0) return "Keine spezifischen Figuren definiert.";
  return chars.map((c) => {
    const lines = [
      `**${c.name}**${c.role ? ` (${c.role})` : ""}`,
      c.description ? `Beschreibung: ${c.description}` : "",
      c.traits ? `Eigenschaften: ${c.traits}` : "",
      c.backstory ? `Hintergrund: ${c.backstory}` : "",
      c.appearance ? `Aussehen: ${c.appearance}` : "",
      c.notes ? `Notizen: ${c.notes}` : "",
    ].filter(Boolean);
    return lines.join("\n");
  }).join("\n\n");
}

async function generateNarrativeSummary(
  model: string,
  chapterContent: string,
  chapterNumber: number,
  chapterTitle: string,
  characterNames: string[]
): Promise<{ summary: string; character_states: any; last_scene_ending: string; open_plot_threads: string[] } | null> {
  try {
    const userPrompt = `Kapitel ${chapterNumber}: "${chapterTitle}"

Vorkommende Figuren: ${characterNames.join(", ") || "unbekannt"}

KAPITELTEXT:
${chapterContent.substring(0, 12000)}

Erstelle jetzt das Narrative Handoff-Dokument für das nächste Kapitel.`;

    const result = await generateText(model, PROMPTS.narrativeSummarizer, userPrompt, 2000);
    const cleaned = result.content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("Narrative summary generation failed:", e);
    return null;
  }
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
  const lang = p.language || "Deutsch";

  const outline = await query(
    "SELECT * FROM chapter_outlines WHERE project_id = $1 AND chapter_number = $2",
    [id, chapter_number]
  );
  const chapterOutline = outline.rows[0];

  // Load ALL previous chapters with their narrative summaries, ordered ascending
  const prevChapters = await query(
    `SELECT chapter_number, title, content, narrative_summary, character_states
     FROM chapters
     WHERE project_id = $1 AND chapter_number < $2
     ORDER BY chapter_number ASC`,
    [id, chapter_number]
  );

  // --- Build "Story So Far" block ---
  let storySoFarBlock = "";
  if (prevChapters.rows.length === 0) {
    storySoFarBlock = "Dies ist das erste Kapitel. Es gibt keine Vorgeschichte.";
  } else {
    const summaryLines: string[] = ["=== STORY SO FAR – Narrative Gedächtnisprotokoll ===\n"];

    // All previous chapters: use narrative_summary if available, otherwise truncate content
    for (const prev of prevChapters.rows) {
      const hasSummary = prev.narrative_summary && prev.narrative_summary.trim().length > 0;
      summaryLines.push(
        `── Kapitel ${prev.chapter_number}: "${prev.title}" ──\n` +
        (hasSummary
          ? prev.narrative_summary
          : `[Keine Zusammenfassung vorhanden – Rohtextauszug:]\n${(prev.content || "").substring(0, 800)}…`)
      );
    }

    // Add character states from the most recent chapter that has them
    const lastWithStates = [...prevChapters.rows].reverse().find(c => c.character_states);
    if (lastWithStates?.character_states) {
      summaryLines.push("\n=== AKTUELLER FIGURENSTATUS (Ende Kapitel " + lastWithStates.chapter_number + ") ===");
      const states = lastWithStates.character_states;
      for (const [name, state] of Object.entries(states as Record<string, any>)) {
        summaryLines.push(
          `${name}:\n` +
          (state.location ? `  Aufenthaltsort: ${state.location}\n` : "") +
          (state.emotional_state ? `  Zustand: ${state.emotional_state}\n` : "") +
          (state.open_threads ? `  Offene Fäden: ${state.open_threads}` : "")
        );
      }
    }

    // Full text of the immediately previous chapter (for style and seamless transition)
    const lastChapter = prevChapters.rows[prevChapters.rows.length - 1];
    if (lastChapter?.content) {
      const lastContent = lastChapter.content;
      // Take the last ~2500 chars to capture the ending of the previous chapter
      const snippet = lastContent.length > 2500 ? "…" + lastContent.slice(-2500) : lastContent;
      summaryLines.push(
        `\n=== VOLLTEXT-ENDE KAPITEL ${lastChapter.chapter_number} (für nahtlosen Übergang) ===\n${snippet}`
      );
    }

    storySoFarBlock = summaryLines.join("\n");
  }

  // --- Character loading with first_appears_chapter filter ---
  let characterRows: any[] = [];
  let isFiltered = false;
  let characterLabel = "Figuren";

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
      characterLabel = "Figuren in diesem Kapitel (NUR diese dürfen auftreten)";
    }
  }

  if (!isFiltered) {
    // Filter by first_appears_chapter: only show characters who have been introduced by this chapter
    const eligibleChars = await query(
      `SELECT * FROM project_characters
       WHERE project_id = $1
         AND (first_appears_chapter IS NULL OR first_appears_chapter <= $2)
       ORDER BY created_at`,
      [id, chapter_number]
    );
    characterRows = eligibleChars.rows;

    // Also check if there are future characters (for context about who NOT to include)
    const futureChars = await query(
      `SELECT name FROM project_characters
       WHERE project_id = $1 AND first_appears_chapter > $2
       ORDER BY first_appears_chapter`,
      [id, chapter_number]
    );
    if (futureChars.rows.length > 0) {
      characterLabel = `Figuren (bereits eingeführt bis Kapitel ${chapter_number}) – NICHT auftreten lassen: ${futureChars.rows.map((c: any) => c.name).join(", ")}`;
    } else {
      characterLabel = "Figuren";
    }
  }

  // Build the outline block
  const outlineBlock = chapterOutline ? `
Kapitel-Titel: ${chapterOutline.title || `Kapitel ${chapter_number}`}
Kapitel-Zweck: ${chapterOutline.purpose || "Handlung vorantreiben"}
${chapterOutline.character_arc ? `Charakter-Entwicklung: ${chapterOutline.character_arc}` : ""}
${chapterOutline.location ? `Ort & Zeit: ${chapterOutline.location}` : ""}
${chapterOutline.key_events ? `Schlüsselereignisse (MÜSSEN vorkommen): ${chapterOutline.key_events}` : ""}
${chapterOutline.tension_level ? `Spannungslevel: ${chapterOutline.tension_level}/10` : ""}
${chapterOutline.raw_notes ? `\nAutoren-Vorlage (inhaltlich bindend, wortgetreu umsetzen):\n${chapterOutline.raw_notes}` : ""}`.trim()
    : `Kapitel-Titel: Kapitel ${chapter_number}\nKapitel-Zweck: Handlung vorantreiben`;

  // Build the style block and dynamic system prompt
  const styleBlock = formatStyleForPrompt(p.style_json, p.style_notes);
  const dynamicSystemPrompt = buildDynamicSystemPrompt(styleBlock, lang);

  // Compose the user prompt
  const userPrompt = `KAPITEL ${chapter_number} SCHREIBEN

=== KAPITEL-ANWEISUNG ===
${outlineBlock}

=== PROJEKT-KONTEXT ===
Gesamte Handlung (Summary):
${p.summary || "Nicht vorhanden"}

${characterLabel}:
${formatCharactersForPrompt(characterRows)}

=== NARRATIVE VORGESCHICHTE ===
${storySoFarBlock}

---
ERINNERUNG: Schreibe ausschließlich auf ${lang.toUpperCase()}. Halte dich exakt an die Stil-Gesetze aus dem System-Prompt.`;

  try {
    const model = p.ai_provider || "anthropic/claude-sonnet-4-5";
    const result = await generateText(model, dynamicSystemPrompt, userPrompt, 16000);

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

    // Generate narrative summary in background (fire and await — ensures next chapter has memory)
    const characterNames = characterRows.map((c: any) => c.name);
    const handoff = await generateNarrativeSummary(
      model,
      result.content,
      chapter_number,
      chapterOutline?.title || `Kapitel ${chapter_number}`,
      characterNames
    );

    if (handoff) {
      await query(
        `UPDATE chapters SET narrative_summary = $1, character_states = $2 WHERE id = $3`,
        [handoff.summary, JSON.stringify(handoff.character_states), chapter.id]
      );
      await query(
        `INSERT INTO generation_log (project_id, action, model, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, chapter_number, details)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [id, "Narrative Zusammenfassung", model, 0, 0, 0, 0, chapter_number, "Auto-generiertes Handoff-Dokument"]
      );
    }

    return NextResponse.json({ chapter, tokens: result.total_tokens, cost });
  } catch (error: any) {
    console.error("Chapter generation error:", error);
    return NextResponse.json({ error: "Kapitel-Generierung fehlgeschlagen: " + error.message }, { status: 500 });
  }
}
