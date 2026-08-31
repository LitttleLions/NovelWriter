import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { generateText, estimateCost, describeAiError, detectDegeneration } from "@/lib/openrouter";
import { resolveModel } from "@/lib/ai-settings";
import { PROMPTS } from "@/lib/prompts";
import { getScreenplayStylePreset, getSluglineVocab } from "@/lib/screenplay-presets";

function formatStyleForPrompt(style_json: any, style_notes?: string): string {
  const parts: string[] = [];

  // [A] MANUELLE DIREKTIVEN ZUERST – höchste Priorität, oberstes Gesetz
  const trimmedNotes = style_notes?.trim();
  if (trimmedNotes) {
    parts.push(
`════════════════════════════════════════
[A] MANUELLE STIL-DIREKTIVEN DES AUTORS
════════════════════════════════════════
DIESE ANWEISUNGEN SIND DAS OBERSTE GESETZ. Sie überschreiben jede einzelne Vorgabe aus dem KI-Stil-Profil [B] sowie deinen eigenen Schreibreflex. Wenn eine manuelle Direktive einer anderen Regel widerspricht, gewinnt IMMER die manuelle Direktive – ohne Ausnahme, ohne Interpretation, ohne stillen Kompromiss. Lies diese Direktiven vor jedem Absatz erneut und prüfe aktiv, ob du sie umsetzt:

${trimmedNotes}

(Ende der manuellen Direktiven – hierauf folgt das nachgeordnete KI-Stil-Profil [B].)
════════════════════════════════════════`
    );
  }

  if (style_json) {
    const s = style_json;
    const headerLabel = trimmedNotes
      ? "[B] KI-GENERIERTES STIL-PROFIL (nachgeordnet – nur dort anwenden, wo [A] schweigt):"
      : "[A] KI-GENERIERTES STIL-PROFIL:";
    const profileLines: string[] = [headerLabel];

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
      if (s.style_essence) {
        profileLines.push(`\n• STIL-ESSENZ (literarisches Gesamtbild):\n  ${s.style_essence}`);
      }
      if (s.narrative_perspective) {
        profileLines.push(`• Erzählperspektive: ${s.narrative_perspective}`);
      }
      if (s.sentence_length_variance) {
        profileLines.push(`• Satzlängen-Varianz: ${s.sentence_length_variance}`);
      }
      if (s.vocabulary_signature) {
        profileLines.push(`• Vokabular-Signatur: ${s.vocabulary_signature}`);
      }
      if (s.sensory_palette) {
        profileLines.push(`• Sinnes-Palette: ${s.sensory_palette}`);
      }
      if (s.paragraph_rhythm) {
        profileLines.push(`• Absatz-Rhythmus: ${s.paragraph_rhythm}`);
      }
      if (s.dialogue_style) {
        profileLines.push(`• Dialog-Charakter: ${s.dialogue_style}`);
      }
      if (s.metaphor_style) {
        profileLines.push(`• Metaphern-Einsatz: ${s.metaphor_style}`);
      }
      if (s.scene_opening_style) {
        profileLines.push(`• Szenen-/Kapitel-Anfänge: ${s.scene_opening_style}`);
      }
      if (s.scene_ending_style) {
        profileLines.push(`• Szenen-/Kapitel-Enden: ${s.scene_ending_style}`);
      }
      if (s.rhythm_devices) {
        profileLines.push(`• Rhythmus-Mittel: ${s.rhythm_devices}`);
      }
      if (s.favorite_literary_devices?.length) {
        profileLines.push(`• PFLICHT-Stilmittel (mindestens 3× pro Kapitel): ${s.favorite_literary_devices.join(", ")}`);
      }
      if (s.signature_techniques?.length) {
        profileLines.push(`• Signatur-Techniken (mindestens 2 davon pro Kapitel sichtbar): ${s.signature_techniques.join(" | ")}`);
      }
      if (s.forbidden_moves?.length) {
        profileLines.push(`• ABSOLUT VERBOTEN (Anti-Stilmittel dieses Autors): ${s.forbidden_moves.join(" | ")}`);
      }
      if (s.example_sentence_patterns?.length) {
        profileLines.push(`\nSTIL-MASSSTAB (exakt diesen Rhythmus und diese Satzstruktur nachahmen):`);
        s.example_sentence_patterns.forEach((ex: string, i: number) => {
          profileLines.push(`  ${i + 1}. "${ex}"`);
        });
      }
    }
    parts.push(profileLines.join("\n"));
  } else if (!trimmedNotes) {
    parts.push("[A] KI-GENERIERTES STIL-PROFIL: Kein Profil vorhanden – schreibe in einem klaren, literarischen Stil.");
  }

  return parts.join("\n\n");
}

function buildManualNotesPreamble(manualNotes?: string | null): string {
  const trimmed = manualNotes?.trim();
  if (!trimmed) return "";
  return `╔══════════════════════════════════════════════════════════╗
║  OBERSTES GESETZ – MANUELLE STIL-DIREKTIVEN DES AUTORS  ║
╚══════════════════════════════════════════════════════════╝
Dies sind die einzigen verbindlichen Stil-Vorgaben für dieses Werk. Es gibt KEIN konkurrierendes KI-Stilprofil. Du musst JEDE einzelne Direktive umsetzen – nicht "im Geiste", nicht "ungefähr", sondern konkret und nachweisbar im fertigen Kapitel.

${trimmed}

PFLICHT-SELBSTPRÜFUNG vor dem ersten Wort:
1. Lies die Direktiven oben Punkt für Punkt durch.
2. Prüfe für jeden Punkt: "Wie genau setze ich das in DIESEM Kapitel um?"
3. Wenn ein Punkt unklar ist, wähle die literarisch ambitionierteste Lesart – niemals die generische.
4. Beim Schreiben jedes Absatzes: blicke zurück, ob mindestens eine Direktive aktiv eingelöst wurde.

Wenn dein KI-Schreibreflex eine andere Richtung will – ignoriere ihn. Diese Direktiven gewinnen IMMER, ohne Ausnahme, ohne Interpretation, ohne stillen Kompromiss.
══════════════════════════════════════════════════════════

`;
}

function buildDynamicSystemPrompt(
  styleBlock: string,
  lang: string,
  options: {
    projectType?: string;
    screenplayFormat?: string;
    targetWordsPerChapter?: { min: number; max: number };
    manualNotes?: string | null;
  } = {}
): string {
  const { projectType = "novel", screenplayFormat, targetWordsPerChapter, manualNotes } = options;
  const preamble = buildManualNotesPreamble(manualNotes);

  if (projectType === "screenplay") {
    const baseSystem = screenplayFormat === "tv_episode" ? PROMPTS.screenplayTvWriter : PROMPTS.screenplayWriter;
    const vocab = getSluglineVocab(lang);
    return `${preamble}${baseSystem}

════════════════════════════════════════
SPRACH-GESETZ (nicht verhandelbar):
Das gesamte Drehbuch-Material MUSS auf ${lang.toUpperCase()} geschrieben sein. Sluglines, Action-Lines, Dialoge, parentheticals, Figurennamen – alles auf ${lang}.
Slugline-Vokabular für diese Sprache: Innenraum = "${vocab.interior}", Außen = "${vocab.exterior}", Tageszeiten = "${vocab.day}", "${vocab.night}", "${vocab.morning}", "${vocab.evening}". Beispiel-Slugline: "${vocab.example}".
════════════════════════════════════════

════════════════════════════════════════
STIL-GESETZ (deine künstlerische Persönlichkeit für dieses Drehbuch):
${styleBlock}

Diese Stilvorhaben sind dein Grundgesetz – sie überschreiben deinen generischen KI-Schreibreflex.
════════════════════════════════════════

ARBEITSWEISE:
1. SPRACHE → ${lang} ohne Ausnahme.
2. FORMAT → Industrie-Drehbuchformat: SLUGLINE → Action-Lines → DIALOG-BLOCK. Niemals abweichen.
3. STIL → Stil-Direktiven oben sind bindend.
4. KONTINUITÄT → Das Narrativ-Gedächtnis im User-Prompt ist verbindliche Vorgeschichte.
5. INHALT → Alle key_events der Szenen-Anweisung MÜSSEN vorkommen.

Beginne direkt mit der Slugline der Szene. Höre direkt mit dem letzten Beat auf.`;
  }

  const range = targetWordsPerChapter ?? { min: 3000, max: 5000 };
  return `${preamble}Du bist ein Weltklasse-Ghostwriter für New York Times Bestseller-Romane.

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

AUSGABE-REGELN (kompromisslos):
• Schreibe ${range.min.toLocaleString("de-DE")}–${range.max.toLocaleString("de-DE")} Wörter reinen Kapitel-Fließtext.
• KEINE Markdown-Überschriften (kein #, ##, ###).
• KEINE einleitende Zeile wie "Hier ist Kapitel X" oder "Hier kommt Kapitel X".
• KEINE Meta-Kommentare am Ende: keine "Schlüsselelemente, die umgesetzt wurden", keine "Anmerkungen", keine "Hinweise", keine "Wortzahl", keine "Zusammenfassung der Änderungen", keine Erklärungen über deine eigene Vorgehensweise.
• KEIN abschließender Reflexions-Absatz wie "Dieses Kapitel wurde ...", "Dieser Text wurde ...", "In diesem Kapitel habe ich ...", "Der Text folgt dem Prinzip ..." – verboten in JEDER Form, mit oder ohne ---, mit oder ohne Überschrift.
• KEINE horizontale Trennlinie (---, ***, ___) am Ende des Kapitels. Der Kapiteltext endet mit dem letzten Erzähl-Satz, Punkt.
• KEINE Markdown-Listen (•, -, 1.) als Strukturierungsmittel – nur literarische Prosa.
• Beginne direkt mit dem ersten Satz der Erzählung. Höre direkt mit dem letzten Satz der Szene auf.
• Wenn du einen Meta-Block schreibst, hast du die Aufgabe verfehlt.`;
}

function stripMetaCommentary(raw: string): string {
  let text = (raw || "").trim();

  // Strip markdown code fences if AI wrapped the chapter
  text = text.replace(/^```[a-z]*\n/i, "").replace(/\n```\s*$/i, "").trim();

  // Cut everything from the first meta-section header onwards.
  // Matches German + English headers the AI tends to emit AFTER the actual chapter.
  const cutMarkers = [
    /\n\s*#{1,6}\s*(Schlüsselelemente|Schlüssel-Elemente|Kernelemente|Anmerkung(?:en)?|Hinweis(?:e)?|Zusammenfassung der Änderungen|Erklärung|Notizen?(?: zum Kapitel)?|Stilanalyse|Stil-?Analyse|Was wurde umgesetzt|Umgesetzte Elemente|Umsetzung der Vorgaben|Wortzahl|Wortanzahl|Word ?count|Notes?|Author'?s? notes?|Summary of changes|Key elements?|Implementation notes?|Translation notes?)[^\n]*/i,
    /\n\s*\*\*\s*(Schlüsselelemente|Anmerkung(?:en)?|Hinweis(?:e)?|Wortzahl|Notes?|Word ?count|Key elements?)[^*]*\*\*/i,
    /\n\s*---+\s*\n\s*(?:\*\*)?(Schlüsselelemente|Anmerkung(?:en)?|Hinweis(?:e)?|Wortzahl|Notes?|Word ?count)/i,
  ];
  for (const re of cutMarkers) {
    const m = text.match(re);
    if (m && m.index !== undefined) {
      text = text.substring(0, m.index).trim();
    }
  }

  // Cut at a trailing horizontal rule (---, ***, ___) if what follows is meta-prose.
  // The AI loves to drop "---\n\nDieses Kapitel wurde unter strikter Anwendung ..."
  const metaProseSignals = [
    "dieses kapitel wurde", "dieser text wurde", "diese szene wurde", "dieses werk wurde",
    "der text wurde", "der vorliegende text", "die vorliegende szene",
    "in diesem kapitel habe ich", "in dieser szene habe ich",
    "ich habe versucht", "ich habe darauf geachtet", "ich habe mich bemüht",
    "strikter anwendung", "unter berücksichtigung", "unter einhaltung",
    "von ihnen vorgegeben", "ihrer vorgaben", "der vorgegebenen regeln",
    "szene & sequel", "show, don't tell", "show don't tell",
    "die szenenstruktur folgt", "die dialoge sind darauf ausgelegt",
    "this chapter was", "this scene was", "this text was",
    "i have tried", "i made sure", "following the principles",
  ];
  const hrSplit = text.match(/^([\s\S]*?)\n\s*(?:-{3,}|\*{3,}|_{3,})\s*\n([\s\S]*)$/);
  if (hrSplit) {
    const tail = hrSplit[2].toLowerCase();
    if (metaProseSignals.some((s) => tail.includes(s))) {
      text = hrSplit[1].trim();
    }
  }

  // Trailing meta-paragraph without horizontal rule: drop the LAST paragraph if it
  // starts with a self-reflective opener AND contains meta vocabulary.
  const paragraphs = text.split(/\n{2,}/);
  if (paragraphs.length > 1) {
    const last = paragraphs[paragraphs.length - 1].trim().toLowerCase();
    const startsMeta = /^(\(?\*?\*?)?(dieses kapitel|dieser text|diese szene|dieses werk|der vorliegende text|die vorliegende szene|in diesem kapitel habe ich|in dieser szene habe ich|ich habe (?:versucht|darauf|mich)|hinweis|anmerkung|wortzahl|wortanzahl|note:|notes:|word ?count)/i.test(last);
    const hasMetaVocab = metaProseSignals.some((s) => last.includes(s)) ||
      /\b(stil|prinzip|vorgabe|regel|umgesetzt|umsetzung|anwendung|charakterentwicklung|spannung|atmosphäre|leser|verbindung)\b/i.test(last);
    if (startsMeta && hasMetaVocab) {
      paragraphs.pop();
      text = paragraphs.join("\n\n").trim();
    }
  }

  // Drop trailing horizontal rule if the chapter ends with one
  text = text.replace(/\n\s*(?:-{3,}|\*{3,}|_{3,})\s*$/g, "").trim();

  // Remove trailing single-line meta lines like "(Anmerkung: ...)", "Hinweis: ...", "Wortzahl: 4123"
  text = text.replace(/\n\s*\(?(Anmerkung|Hinweis|Wortzahl|Wortanzahl|Word ?count|Note)[:\s][^\n]*\)?\s*$/gi, "").trim();

  // Remove a "Hier ist Kapitel X" / "Here is chapter X" prefix line if present
  text = text.replace(/^\s*(Hier (?:ist|kommt|folgt) (?:das )?Kapitel[^\n]*\n+|Here is (?:the )?chapter[^\n]*\n+)/i, "").trim();

  return text;
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

/** Robuster JSON-Parser für den Narrative-Summarizer:
 *  1. Direkt parsen
 *  2. Steuerzeichen in Strings bereinigen + nochmal parsen
 *  3. Letztes vollständiges {…}-Objekt per Stack extrahieren
 *  4. Abgeschnittene JSON-Objekte durch Anhängen von Klammern reparieren
 */
function safeParseNarrativeJson(raw: string): Record<string, any> | null {
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  // Versuch 1: direktes Parsen
  try { return JSON.parse(cleaned); } catch {}

  // Versuch 2: Steuerzeichen bereinigen
  const sanitized = cleaned.replace(/"(?:[^"\\]|\\.)*"/g, (m) =>
    m.replace(/[\x00-\x1F]/g, (c) => {
      if (c === "\n") return "\\n";
      if (c === "\r") return "\\r";
      if (c === "\t") return "\\t";
      return "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0");
    })
  );
  try { return JSON.parse(sanitized); } catch {}

  // Versuch 3: vollständiges äußerstes {…} extrahieren
  const firstBrace = sanitized.indexOf("{");
  if (firstBrace !== -1) {
    let depth = 0, inStr = false, esc = false, lastClose = -1;
    for (let i = firstBrace; i < sanitized.length; i++) {
      const ch = sanitized[i];
      if (esc) { esc = false; continue; }
      if (ch === "\\" && inStr) { esc = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (ch === "{") depth++;
      else if (ch === "}") { depth--; if (depth === 0) { lastClose = i; break; } }
    }
    if (lastClose !== -1) {
      try { return JSON.parse(sanitized.slice(firstBrace, lastClose + 1)); } catch {}
    }

    // Versuch 4: Abgeschnittenes JSON durch Anhängen von Klammern reparieren
    const partial = sanitized.slice(firstBrace);
    for (const tail of ["}", "}}", "]}}", "}]}", "}}"]) {
      try { return JSON.parse(partial + tail); } catch {}
    }
  }

  return null;
}

async function generateNarrativeSummary(
  model: string,
  chapterContent: string,
  chapterNumber: number,
  chapterTitle: string,
  characterNames: string[]
): Promise<{ summary: string; character_states: any; last_scene_ending: string; open_plot_threads: string[] } | null> {
  const userPrompt = `Kapitel ${chapterNumber}: "${chapterTitle}"

Vorkommende Figuren: ${characterNames.join(", ") || "unbekannt"}

KAPITELTEXT:
${chapterContent.substring(0, 12000)}

Erstelle jetzt das Narrative Handoff-Dokument für das nächste Kapitel.`;

  // Versuch 1 + 2: bis zu 2 Versuche mit dem vollständigen JSON-Format
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const result = await generateText(model, PROMPTS.narrativeSummarizer, userPrompt, 3000);
      const parsed = safeParseNarrativeJson(result.content);
      if (parsed && parsed.summary) return parsed as any;
      console.warn(`Narrative summary attempt ${attempt}: JSON unvollständig oder leer.`);
    } catch (e) {
      console.warn(`Narrative summary attempt ${attempt} failed:`, e);
    }
  }

  // Fallback: vereinfachter Prompt, der nur eine Textzusammenfassung zurückgibt
  try {
    const fallbackResult = await generateText(
      model,
      "Du bist ein Romanarchiv-Assistent. Fasse das Kapitel in 200-250 Wörtern auf Deutsch zusammen. Nur Fließtext, kein JSON, keine Überschriften.",
      `Kapitel ${chapterNumber}: "${chapterTitle}"\n\nKAPITELTEXT:\n${chapterContent.substring(0, 8000)}\n\nSchreibe jetzt die Zusammenfassung.`,
      800
    );
    const fallbackSummary = fallbackResult.content.trim();
    if (fallbackSummary.length > 50) {
      console.log("Narrative summary: Fallback-Textzusammenfassung erfolgreich.");
      return {
        summary: fallbackSummary,
        character_states: {},
        last_scene_ending: "",
        open_plot_threads: [],
      };
    }
  } catch (e) {
    console.error("Narrative summary fallback failed:", e);
  }

  return null;
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
    // first_appears_chapter <= 0 means they are available for all chapters
    const eligibleChars = await query(
      `SELECT * FROM project_characters
       WHERE project_id = $1
         AND (first_appears_chapter IS NULL OR first_appears_chapter <= 0 OR first_appears_chapter <= $2)
       ORDER BY created_at`,
      [id, chapter_number]
    );
    characterRows = eligibleChars.rows;
    characterLabel = `Figuren (bereits eingeführt bis Kapitel ${chapter_number})`;
  }

  // ALWAYS compute future characters and add a hard prohibition — regardless of whether the outline has assigned chars
  const futureChars = await query(
    `SELECT name, first_appears_chapter FROM project_characters
     WHERE project_id = $1 AND first_appears_chapter > 0 AND first_appears_chapter > $2
     ORDER BY first_appears_chapter`,
    [id, chapter_number]
  );

  // Build the outline block. Labels switch to "Szenen-*" for screenplay projects.
  const isScreenplayProject = p.project_type === "screenplay";
  const labelTitle = isScreenplayProject ? "Szenen-Titel" : "Kapitel-Titel";
  const labelPurpose = isScreenplayProject ? "Szenen-Zweck" : "Kapitel-Zweck";
  const labelLocation = isScreenplayProject ? "Slugline" : "Ort & Zeit";
  const labelFallbackUnit = isScreenplayProject ? "Szene" : "Kapitel";
  const outlineBlock = chapterOutline ? `
${labelTitle}: ${chapterOutline.title || `${labelFallbackUnit} ${chapter_number}`}
${labelPurpose}: ${chapterOutline.purpose || "Handlung vorantreiben"}
${chapterOutline.character_arc ? `Charakter-Entwicklung: ${chapterOutline.character_arc}` : ""}
${chapterOutline.location ? `${labelLocation}: ${chapterOutline.location}` : ""}
${chapterOutline.key_events ? `Schlüsselereignisse (MÜSSEN vorkommen): ${chapterOutline.key_events}` : ""}
${chapterOutline.tension_level ? `Spannungslevel: ${chapterOutline.tension_level}/10` : ""}
${chapterOutline.raw_notes ? `\nAutoren-Vorlage (inhaltlich bindend, wortgetreu umsetzen):\n${chapterOutline.raw_notes}` : ""}`.trim()
    : `${labelTitle}: ${labelFallbackUnit} ${chapter_number}\n${labelPurpose}: Handlung vorantreiben`;

  // Build the style block. For screenplays, prepend the selected style preset (Sorkin etc.)
  // as a top-priority directive, BEFORE manual notes & KI style profile.
  const isScreenplay = p.project_type === "screenplay";
  const screenplayPreset = isScreenplay ? getScreenplayStylePreset(p.screenplay_style_preset) : null;
  let styleBlock = formatStyleForPrompt(p.style_json, p.style_notes);
  if (screenplayPreset && screenplayPreset.prompt) {
    styleBlock = `════════════════════════════════════════
[S] DREHBUCH-STIL-PRESET (oberste Priorität, vor [A] und [B]):
════════════════════════════════════════
${screenplayPreset.prompt}
════════════════════════════════════════

${styleBlock}`;
  }
  const dynamicSystemPrompt = buildDynamicSystemPrompt(styleBlock, lang, {
    projectType: p.project_type,
    screenplayFormat: p.screenplay_format,
    manualNotes: p.style_notes,
  });

  // Manual style directives are echoed verbatim at the END of the user prompt
  // to counteract recency-bias and ensure they are top-of-mind during generation.
  const manualNotesTrimmed = p.style_notes?.trim();
  const manualNotesEcho = manualNotesTrimmed
    ? `\n\n════════════════════════════════════════
LETZTE ERINNERUNG – MANUELLE STIL-DIREKTIVEN DES AUTORS (HÖCHSTE PRIORITÄT):
════════════════════════════════════════
${manualNotesTrimmed}
════════════════════════════════════════
Setze JEDE einzelne dieser Direktiven aktiv um. Beim ersten Absatz, beim mittleren Absatz, beim letzten Absatz. Wenn dein Schreibreflex eine andere Richtung will – ignoriere ihn. Diese Direktiven gewinnen IMMER.`
    : "";

  // Build future characters prohibition block
  const futureCharsBlock = futureChars.rows.length > 0
    ? `\n════════════════════════════════════════
ABSOLUTES VERBOT – NOCH NICHT EINGEFÜHRTE FIGUREN:
Die folgenden Figuren treten erst in späteren Kapiteln auf und DÜRFEN in diesem Kapitel NICHT erwähnt, angedeutet oder sonstwie eingebaut werden. Auch keine indirekten Hinweise, Gerüchte, oder Erwähnungen durch Dritte:
${futureChars.rows.map((c: any) => `  • ${c.name} (erscheint erst ab Kapitel ${c.first_appears_chapter})`).join("\n")}
════════════════════════════════════════`
    : "";

  // Compose the user prompt – screenplays get a different framing label.
  const unitNoun = isScreenplay ? "SZENE" : "KAPITEL";
  const sluglineLine = isScreenplay && chapterOutline?.location
    ? `\nSLUGLINE (verbindlich als ALLERERSTE Zeile deiner Szene): ${chapterOutline.location}`
    : "";
  const screenplayFormatReminder = isScreenplay
    ? `\nFORMAT-ERINNERUNG: Industrie-Drehbuchformat. Slugline → Action-Lines → DIALOG-BLOCK. Keine literarische Prosa, kein innerer Monolog, keine Markdown-Listen.`
    : "";

  const manualNotesTopEcho = manualNotesTrimmed
    ? `\n════════════════════════════════════════
ERSTE ERINNERUNG – MANUELLE STIL-DIREKTIVEN DES AUTORS (OBERSTES GESETZ):
════════════════════════════════════════
${manualNotesTrimmed}
════════════════════════════════════════
Diese Direktiven sind das EINZIGE Stil-Gesetz für dieses Werk. Setze JEDE einzelne aktiv um.
\n`
    : "";

  const userPrompt = `${unitNoun} ${chapter_number} SCHREIBEN
${sluglineLine}
${manualNotesTopEcho}
=== ${unitNoun}-ANWEISUNG ===
${outlineBlock}

=== PROJEKT-KONTEXT ===
Gesamte Handlung (Summary):
${p.summary || "Nicht vorhanden"}

${characterLabel}:
${formatCharactersForPrompt(characterRows)}
${futureCharsBlock}

=== NARRATIVE VORGESCHICHTE ===
${storySoFarBlock}

---
ERINNERUNG: Schreibe ausschließlich auf ${lang.toUpperCase()}. Halte dich exakt an die Stil-Gesetze aus dem System-Prompt.${screenplayFormatReminder}${manualNotesEcho}`;

  // Capture variables needed inside the stream closure
  const _id = id;
  const _chapter_number = chapter_number;
  const _lang = lang;
  const _p = p;
  const _chapterOutline = chapterOutline;
  const _characterRows = characterRows;
  const _dynamicSystemPrompt = dynamicSystemPrompt;
  const _userPrompt = userPrompt;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: Record<string, unknown>) => {
        try { controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n")); } catch {}
      };

      // Heartbeat every 10 s keeps the Replit proxy from cutting the connection
      const pingInterval = setInterval(() => send({ type: "ping" }), 10_000);

      try {
        const model = await resolveModel();
        // Drehbuch-Szenen sind viel kürzer als Roman-Kapitel (1-5 Seiten ≈ 300-1000 Wörter).
        // 6000 Tokens verhindert unnötig lange Wartezeiten und Timeouts bei Screenplay-Projekten.
        const maxTokens = _p.project_type === "screenplay" ? 6000 : 16000;
        const result = await generateText(model, _dynamicSystemPrompt, _userPrompt, maxTokens);

        const cleanedContent = stripMetaCommentary(result.content);

        const degeneration = detectDegeneration(cleanedContent, _lang);
        if (!degeneration.ok) {
          send({
            type: "error",
            error: `Das Modell "${model}" hat einen kaputten Output erzeugt: ${degeneration.reason} Bitte wechsle in den Projekt-Einstellungen das KI-Modell (z.B. zu Claude Sonnet 4.6, DeepSeek V4 Flash oder Gemini 3 Pro) und versuche es erneut.`,
          });
          return;
        }

        const wordCount = cleanedContent.trim().split(/\s+/).length;
        const cost = estimateCost(model, result.prompt_tokens, result.completion_tokens);

        const existing = await query(
          "SELECT id FROM chapters WHERE project_id = $1 AND chapter_number = $2",
          [_id, _chapter_number]
        );

        let chapter;
        if (existing.rows.length > 0) {
          const updated = await query(
            `UPDATE chapters SET content = $1, title = $2, word_count = $3, status = 'generated', updated_at = NOW()
             WHERE id = $4 RETURNING *`,
            [cleanedContent, _chapterOutline?.title || `Kapitel ${_chapter_number}`, wordCount, existing.rows[0].id]
          );
          chapter = updated.rows[0];
        } else {
          const inserted = await query(
            `INSERT INTO chapters (project_id, chapter_number, title, content, word_count, status)
             VALUES ($1, $2, $3, $4, $5, 'generated') RETURNING *`,
            [_id, _chapter_number, _chapterOutline?.title || `Kapitel ${_chapter_number}`, cleanedContent, wordCount]
          );
          chapter = inserted.rows[0];
        }

        await query("UPDATE projects SET updated_at = NOW() WHERE id = $1", [_id]);

        await query(
          `INSERT INTO generation_log (project_id, action, model, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, chapter_number, details)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [_id, "Kapitel generiert", model, result.prompt_tokens, result.completion_tokens, result.total_tokens, cost, _chapter_number, _chapterOutline?.title || `Kapitel ${_chapter_number}`]
        );

        // Narrative summary (second AI call — also slow, covered by same heartbeat)
        const characterNames = _characterRows.map((c: any) => c.name);
        const handoff = await generateNarrativeSummary(
          model,
          cleanedContent,
          _chapter_number,
          _chapterOutline?.title || `Kapitel ${_chapter_number}`,
          characterNames
        );

        if (handoff) {
          const updated = await query(
            `UPDATE chapters SET narrative_summary = $1, character_states = $2 WHERE id = $3 RETURNING *`,
            [handoff.summary, JSON.stringify(handoff.character_states), chapter.id]
          );
          chapter = updated.rows[0];
          await query(
            `INSERT INTO generation_log (project_id, action, model, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, chapter_number, details)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [_id, "Narrative Zusammenfassung", model, 0, 0, 0, 0, _chapter_number, "Auto-generiertes Handoff-Dokument"]
          );
        }

        send({ type: "done", chapter, tokens: result.total_tokens, cost, narrativeSummaryGenerated: !!handoff });
      } catch (error: any) {
        console.error("Chapter generation error:", error);
        const { message } = describeAiError(error);
        send({ type: "error", error: `Kapitel-Generierung fehlgeschlagen. ${message}` });
      } finally {
        clearInterval(pingInterval);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache, no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
