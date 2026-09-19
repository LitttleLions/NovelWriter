import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { estimateCost, describeAiError, streamTextChunks } from "@/lib/openrouter";
import { resolveModel } from "@/lib/ai-settings";
import { PROMPTS } from "@/lib/prompts";
import { getScreenplayStylePreset, getSluglineVocab } from "@/lib/screenplay-presets";
import { ensureGenerationSchema } from "@/lib/generation/schema";
import { generateNarrativeSummary } from "@/lib/generation/handoff";
import { remainingKeyEvents, stitchContinuation, wordCountOf } from "@/lib/generation/stitch";
import { buildContinuationUserPrompt } from "@/lib/generation/continuation-prompt";
import { isIncompleteFinishReason, validateCandidateText } from "@/lib/generation/quality";
import {
  addRevision,
  createRunningJob,
  finalizeGeneratedChapter,
  finishJob,
  getJob,
  getRunningJob,
  isAbortRequested,
  resumeGenerationJob,
  touchJob,
} from "@/lib/generation/jobs";

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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function streamHeaders() {
  return {
    "Content-Type": "text/plain; charset=utf-8",
    "Transfer-Encoding": "chunked",
    "Cache-Control": "no-cache, no-store",
    "X-Accel-Buffering": "no",
  };
}

function createNdjsonStream(work: (send: (obj: Record<string, unknown>) => void) => Promise<void>) {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      const send = (obj: Record<string, unknown>) => {
        try { controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n")); } catch {}
      };
      const pingInterval = setInterval(() => send({ type: "ping" }), 10_000);
      try {
        await work(send);
      } finally {
        clearInterval(pingInterval);
        try { controller.close(); } catch {}
      }
    },
  });
}

async function tailExistingJob(projectId: string, jobId: number, send: (obj: Record<string, unknown>) => void) {
  let sentLen = 0;
  let seq = 0;
  send({ type: "job", job_id: jobId, seq: seq++ });
  for (let i = 0; i < 240; i++) {
    const job = await getJob(jobId, projectId);
    if (!job) {
      send({ type: "error", error: "Generierungsjob nicht gefunden." });
      return;
    }
    const next = job.content_so_far || "";
    if (next.length > sentLen) {
      send({ type: "delta", text: next.slice(sentLen), seq: seq++ });
      sentLen = next.length;
    }
    if (job.status === "completed") {
      const chapter = await query(
        "SELECT * FROM chapters WHERE project_id = $1 AND chapter_number = $2",
        [projectId, job.chapter_number],
      );
      send({
        type: "done",
        chapter: chapter.rows[0] || null,
        tokens: job.total_tokens,
        cost: Number(job.estimated_cost_usd || 0),
        job_id: job.id,
        narrativeSummaryGenerated: Boolean(chapter.rows[0]?.narrative_summary),
      });
      return;
    }
    if (job.status === "failed" || job.status === "aborted") {
      send({ type: "error", error: job.error_message || "Kapitel-Generierung abgebrochen." });
      return;
    }
    await sleep(500);
  }
  send({ type: "error", error: "Reconnect-Timeout. Der Job läuft ggf. noch im Hintergrund – bitte Seite neu laden." });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const chapter_number = body.chapter_number;
  const reconnectJobId = Number(body.job_id) || null;
  const resumeJobId = Number(body.resume_job_id) || null;

  await ensureGenerationSchema();

  const project = await query(
    "SELECT * FROM projects WHERE id = $1 AND user_id = $2",
    [id, user.id]
  );
  if (project.rows.length === 0) {
    return NextResponse.json({ error: "Projekt nicht gefunden" }, { status: 404 });
  }

  if (reconnectJobId) {
    const owned = await getJob(reconnectJobId, id);
    if (!owned) return NextResponse.json({ error: "Job nicht gefunden" }, { status: 404 });
    const stream = createNdjsonStream((send) => tailExistingJob(id, reconnectJobId, send));
    return new Response(stream, { headers: streamHeaders() });
  }

  if (!chapter_number) {
    return NextResponse.json({ error: "chapter_number fehlt" }, { status: 400 });
  }

  const running = await getRunningJob(id, chapter_number);
  if (running && !body.force_new) {
    const stream = createNdjsonStream((send) => tailExistingJob(id, running.id, send));
    return new Response(stream, { headers: streamHeaders() });
  }
  if (running && body.force_new) {
    return NextResponse.json({ error: "Für dieses Kapitel läuft bereits eine Generierung." }, { status: 409 });
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
  const _unitNoun = unitNoun;
  const _keyEvents = chapterOutline?.key_events || "";
  const _chapterTitle = chapterOutline?.title || `Kapitel ${chapter_number}`;
  const _resumeJobId = resumeJobId;
  const _continuationContext = [
    `KAPITEL-ANWEISUNG:\n${outlineBlock}`,
    `FIGUREN:\n${formatCharactersForPrompt(characterRows)}`,
    `KONTEXT-ENDE:\n${storySoFarBlock.slice(-3500)}`,
    manualNotesTrimmed ? `MANUELLE STIL-DIREKTIVEN:\n${manualNotesTrimmed}` : "",
  ].filter(Boolean).join("\n\n");
  const minimumChapterWords = isScreenplay ? 300 : 1800;

  const stream = createNdjsonStream(async (send) => {
    let jobId: number | null = null;
    let assembled = "";
    let finishReason: string | null = null;
    let promptTokens = 0;
    let completionTokens = 0;
    try {
      const model = await resolveModel(_p.ai_provider);
      const maxTokens = _p.project_type === "screenplay" ? 6000 : 16000;
      const resumedJob = _resumeJobId
        ? await resumeGenerationJob(_resumeJobId, _id, _chapter_number, model)
        : null;
      if (_resumeJobId && !resumedJob) {
        send({ type: "error", error: "Dieser Job kann nicht fortgesetzt werden. Der gespeicherte Abschnitt fehlt oder der Job läuft bereits." });
        return;
      }
      const createdJob = resumedJob
        ? { job: resumedJob, created: true }
        : await createRunningJob(_id, _chapter_number, model);
      const job = createdJob.job;
      jobId = job.id;
      if (!createdJob.created) {
        await tailExistingJob(_id, job.id, send);
        return;
      }

      let seq = 0;
      const MAX_CONTINUATIONS = 3;
      send({ type: "job", job_id: job.id, chapter_number: _chapter_number, seq: seq++ });
      const resuming = Boolean(resumedJob);
      const startingAttempt = resuming
        ? Math.min(MAX_CONTINUATIONS, Math.max(1, Number(job.attempt || 1)))
        : 0;
      if (resuming) {
        assembled = job.content_so_far || "";
        if (assembled) send({ type: "delta", text: assembled, seq: seq++ });
      }

      const checkpoint = async (source: string) => {
        await touchJob(job.id, {
          content_so_far: assembled,
          event_seq: seq,
          attempt: source === "continue" ? 1 : 0,
          finish_reason: finishReason,
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: promptTokens + completionTokens,
          chapter_id: null,
        });
        await addRevision({
          projectId: _id,
          chapterNumber: _chapter_number,
          chapterId: null,
          jobId: job.id,
          source,
          content: assembled,
          wordCount: wordCountOf(assembled),
        });
        send({ type: "checkpoint", word_count: wordCountOf(assembled), seq: seq++ });
      };

      for (let attempt = startingAttempt; attempt <= MAX_CONTINUATIONS; attempt++) {
        if (await isAbortRequested(job.id)) {
          await finishJob(job.id, "aborted", { content_so_far: assembled, error_message: "Vom Nutzer abgebrochen." });
          send({ type: "error", error: "Generierung abgebrochen." });
          return;
        }

        send({ type: "status", phase: attempt === 0 ? "writing" : "continuing", attempt, seq: seq++ });
        const prompt = attempt === 0
          ? _userPrompt
          : buildContinuationUserPrompt({
              chapterNumber: _chapter_number,
              written: assembled,
              remainingEvents: remainingKeyEvents(_keyEvents, assembled),
              lang: _lang,
              unitNoun: _unitNoun,
              context: _continuationContext,
              remainingWords: Math.max(0, minimumChapterWords - wordCountOf(assembled)),
            });

        let piece = "";
        finishReason = null;
        let chunkCount = 0;
        const remainingWords = Math.max(500, minimumChapterWords - wordCountOf(assembled));
        const requestMaxTokens = attempt === 0
          ? maxTokens
          : Math.min(maxTokens, Math.max(1800, Math.ceil(remainingWords * 1.7)));
        for await (const chunk of streamTextChunks(model, _dynamicSystemPrompt, prompt, requestMaxTokens)) {
          chunkCount++;
          if (chunkCount % 8 === 0 && await isAbortRequested(job.id)) {
            await checkpoint("aborted");
            await finishJob(job.id, "aborted", { content_so_far: assembled, error_message: "Vom Nutzer abgebrochen." });
            send({ type: "error", error: "Generierung abgebrochen." });
            return;
          }
          if (chunk.text) {
            piece += chunk.text;
            // Continuation overlap is not sent raw: it may repeat the last
            // sentence in the browser even though stitching will remove it.
            if (attempt === 0) send({ type: "delta", text: chunk.text, seq: seq++ });
          }
          if (chunk.finish_reason) finishReason = chunk.finish_reason;
          if (chunk.usage) {
            promptTokens += chunk.usage.prompt_tokens;
            completionTokens += chunk.usage.completion_tokens;
          }
          if (chunkCount % 12 === 0) {
            // Keep the job alive without persisting an unvalidated fragment.
            await touchJob(job.id, { event_seq: seq });
          }
        }

        piece = stripMetaCommentary(piece);
        const previousAssembled = assembled;
        const candidate = attempt === 0 ? piece : stitchContinuation(assembled, piece);
        const candidateQuality = validateCandidateText(candidate, _lang);
        if (!candidateQuality.ok) {
          await finishJob(job.id, "failed", {
            content_so_far: assembled,
            error_message: `Abschnitt ${attempt + 1} wurde wegen schlechter Textqualität verworfen: ${candidateQuality.reason}`,
            finish_reason: finishReason,
            prompt_tokens: promptTokens,
            completion_tokens: completionTokens,
            total_tokens: promptTokens + completionTokens,
          });
          send({ type: "error", error: `Ein Generierungsabschnitt wurde wegen schlechter Textqualität verworfen. ${candidateQuality.reason}` });
          return;
        }
        assembled = candidate;
        if (attempt > 0 && candidate.startsWith(previousAssembled)) {
          const appended = candidate.slice(previousAssembled.length);
          if (appended) send({ type: "delta", text: appended, seq: seq++ });
        }
        await checkpoint(attempt === 0 ? "checkpoint" : "continue");
        const needsContinuation =
          isIncompleteFinishReason(finishReason) ||
          wordCountOf(assembled) < minimumChapterWords;
        if (!needsContinuation) break;
        if (attempt === MAX_CONTINUATIONS) {
          send({ type: "status", phase: "truncated", seq: seq++ });
        }
      }

      const cleanedContent = stripMetaCommentary(assembled);
      const finalQuality = validateCandidateText(cleanedContent, _lang, { minimumWords: minimumChapterWords });
      const incompleteFinish = isIncompleteFinishReason(finishReason);
      if (!finalQuality.ok || incompleteFinish) {
        const qualityReason = finalQuality.ok
          ? `Der Provider hat den Lauf mit "${finishReason || "unbekannt"}" beendet, bevor ein vollständiger Abschluss bestätigt wurde.`
          : finalQuality.reason;
        await finishJob(job.id, "failed", {
          content_so_far: cleanedContent,
          error_message: qualityReason,
          finish_reason: finishReason,
        });
        send({
          type: "error",
          error: `Das Modell "${model}" hat keinen vollständigen Kapiteltext erzeugt: ${qualityReason} Bitte versuche es erneut oder setze den Lauf fort.`,
        });
        return;
      }

      const cost = estimateCost(model, promptTokens, completionTokens);

      send({ type: "status", phase: "handoff", seq: seq++ });
      const characterNames = _characterRows.map((c: any) => c.name);
      const handoff = await generateNarrativeSummary(
        model,
        cleanedContent,
        _chapter_number,
        _chapterTitle,
        characterNames,
        _keyEvents,
      );

      // Promote the candidate, handoff and completed-job marker together.
      // Intermediate drafts remain in the job/revision tables and cannot
      // replace an already generated chapter.
      const saved = await finalizeGeneratedChapter({
        projectId: _id,
        chapterNumber: _chapter_number,
        title: _chapterTitle,
        content: cleanedContent,
        jobId: job.id,
        model,
        promptTokens,
        completionTokens,
        estimatedCostUsd: cost,
        finishReason,
        handoff,
      });

      send({
        type: "done",
        chapter: saved,
        tokens: promptTokens + completionTokens,
        cost,
        job_id: job.id,
        narrativeSummaryGenerated: !!handoff,
        finish_reason: finishReason,
      });
    } catch (error: any) {
      console.error("Chapter generation error:", error);
      const { message } = describeAiError(error);
      if (jobId) {
        await finishJob(jobId, "failed", {
          error_message: message,
          content_so_far: assembled,
          finish_reason: finishReason,
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: promptTokens + completionTokens,
        }).catch(() => {});
      }
      send({ type: "error", error: `Kapitel-Generierung fehlgeschlagen. ${message}` });
    }
  });

  return new Response(stream, { headers: streamHeaders() });
}
