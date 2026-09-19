import { generateText, type JsonSchemaFormat } from "@/lib/openrouter";
import { PROMPTS } from "@/lib/prompts";

export const NARRATIVE_HANDOFF_SCHEMA: JsonSchemaFormat = {
  type: "json_schema",
  json_schema: {
    name: "narrative_handoff",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        summary: { type: "string" },
        last_scene_ending: { type: "string" },
        open_plot_threads: { type: "array", items: { type: "string" } },
        key_events: { type: "array", items: { type: "string" } },
        character_states: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              name: { type: "string" },
              location: { type: "string" },
              emotional_state: { type: "string" },
              key_decisions: { type: "string" },
              open_threads: { type: "string" },
            },
            required: ["name", "location", "emotional_state", "key_decisions", "open_threads"],
          },
        },
      },
      required: ["summary", "last_scene_ending", "open_plot_threads", "key_events", "character_states"],
    },
  },
};

export interface NarrativeHandoff {
  summary: string;
  character_states: Record<string, any>;
  last_scene_ending: string;
  open_plot_threads: string[];
  key_events: string[];
}

export function selectHandoffSource(
  chapterContent: string,
  keyEvents?: string,
  contextChars = 100_000,
): { text: string; mode: "full" | "head_tail_events" } {
  const events = keyEvents?.trim() ? `\n\nOUTLINE-EREIGNISSE (verbindlich):\n${keyEvents.trim()}` : "";
  if (chapterContent.length <= contextChars) {
    return { text: chapterContent + events, mode: "full" };
  }
  const head = chapterContent.slice(0, 8000);
  const tail = chapterContent.slice(-8000);
  return {
    text: `${head}\n\n[… mittlerer Teil gekürzt …]\n\n${tail}${events}`,
    mode: "head_tail_events",
  };
}

export function safeParseNarrativeJson(raw: string): Record<string, any> | null {
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  try { return JSON.parse(cleaned); } catch {}

  const sanitized = cleaned.replace(/"(?:[^"\\]|\\.)*"/g, (m) =>
    m.replace(/[\x00-\x1F]/g, (c) => {
      if (c === "\n") return "\\n";
      if (c === "\r") return "\\r";
      if (c === "\t") return "\\t";
      return "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0");
    }),
  );
  try { return JSON.parse(sanitized); } catch {}

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
    const partial = sanitized.slice(firstBrace);
    for (const tail of ["}", "}}", "]}}", "}]}", "}}"]) {
      try { return JSON.parse(partial + tail); } catch {}
    }
  }

  return null;
}

export function normalizeHandoff(parsed: Record<string, any> | null): NarrativeHandoff | null {
  if (!parsed || !parsed.summary) return null;
  const states: Record<string, any> = {};
  if (Array.isArray(parsed.character_states)) {
    for (const row of parsed.character_states) {
      if (row?.name) {
        states[row.name] = {
          location: row.location || "",
          emotional_state: row.emotional_state || "",
          key_decisions: row.key_decisions || "",
          open_threads: row.open_threads || "",
        };
      }
    }
  } else if (parsed.character_states && typeof parsed.character_states === "object") {
    Object.assign(states, parsed.character_states);
  }
  return {
    summary: String(parsed.summary),
    character_states: states,
    last_scene_ending: String(parsed.last_scene_ending || ""),
    open_plot_threads: Array.isArray(parsed.open_plot_threads) ? parsed.open_plot_threads.map(String) : [],
    key_events: Array.isArray(parsed.key_events) ? parsed.key_events.map(String) : [],
  };
}

export async function generateNarrativeSummary(
  model: string,
  chapterContent: string,
  chapterNumber: number,
  chapterTitle: string,
  characterNames: string[],
  keyEvents?: string,
): Promise<NarrativeHandoff | null> {
  const source = selectHandoffSource(chapterContent, keyEvents);
  const userPrompt = `Kapitel ${chapterNumber}: "${chapterTitle}"

Vorkommende Figuren: ${characterNames.join(", ") || "unbekannt"}

KAPITELTEXT (${source.mode}):
${source.text}

Erstelle jetzt das Narrative Handoff-Dokument für das nächste Kapitel.`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const result = await generateText(model, PROMPTS.narrativeSummarizer, userPrompt, 3000, {
        responseFormat: NARRATIVE_HANDOFF_SCHEMA,
      });
      const parsed = normalizeHandoff(safeParseNarrativeJson(result.content));
      if (parsed) return parsed;
      console.warn(`Narrative summary attempt ${attempt}: JSON unvollständig oder leer.`);
    } catch (e) {
      console.warn(`Narrative summary attempt ${attempt} failed:`, e);
      try {
        const fallback = await generateText(model, PROMPTS.narrativeSummarizer, userPrompt, 3000);
        const parsed = normalizeHandoff(safeParseNarrativeJson(fallback.content));
        if (parsed) return parsed;
      } catch (inner) {
        console.warn(`Narrative summary plaintext JSON attempt ${attempt} failed:`, inner);
      }
    }
  }

  try {
    const fallbackResult = await generateText(
      model,
      "Du bist ein Romanarchiv-Assistent. Fasse das Kapitel in 200-250 Wörtern auf Deutsch zusammen. Nur Fließtext, kein JSON, keine Überschriften.",
      `Kapitel ${chapterNumber}: "${chapterTitle}"\n\nKAPITELTEXT:\n${source.text}\n\nSchreibe jetzt die Zusammenfassung.`,
      800,
    );
    const fallbackSummary = fallbackResult.content.trim();
    if (fallbackSummary.length > 50) {
      return {
        summary: fallbackSummary,
        character_states: {},
        last_scene_ending: "",
        open_plot_threads: [],
        key_events: [],
      };
    }
  } catch (e) {
    console.error("Narrative summary fallback failed:", e);
  }

  return null;
}
