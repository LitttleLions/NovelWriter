import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { generateText, estimateCost } from "@/lib/openrouter";

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
  const { freetext, chapter_number_start } = body;

  if (!freetext?.trim()) {
    return NextResponse.json({ error: "Kein Text angegeben" }, { status: 400 });
  }

  // Load existing outlines for context
  const existingOutlines = await query(
    "SELECT chapter_number, title, purpose FROM chapter_outlines WHERE project_id = $1 ORDER BY chapter_number",
    [id]
  );
  const existingContext = existingOutlines.rows.length > 0
    ? existingOutlines.rows.map((o: any) => `  Kapitel ${o.chapter_number}: ${o.title} – ${o.purpose}`).join("\n")
    : "  (noch keine Kapitel vorhanden)";

  const isScreenplay = p.project_type === "screenplay";
  const unitLabel = isScreenplay ? "Szenen" : "Kapitel";
  const unitLabelSingular = isScreenplay ? "Szene" : "Kapitel";
  const titleGuidance = isScreenplay
    ? `prägnanter, beschreibender Titel der Szene auf Deutsch (3-7 Wörter, KEINE Slugline) – z.B. "Bud findet die Spur", "Wilfrieds Zweifel"`
    : `prägnanter Kapitel-Titel`;
  const locationGuidance = isScreenplay
    ? `Slugline im Drehbuch-Format (INNEN./AUSSEN. ORT - TAG/NACHT) – z.B. "INNEN. BUDS BÜRO - TAG"`
    : `Ort und Zeit`;

  const prompt = `Du bist ein ${isScreenplay ? "Drehbuch" : "Buch"}-Architekt. Analysiere den folgenden Freitext und extrahiere daraus eine oder mehrere strukturierte ${unitLabel}-Einträge für das Projekt "${p.title}" (Genre: ${p.genre}, Sprache: ${p.language || "Deutsch"}).

Bestehende Outline (für Konsistenz):
${existingContext}

Freitext des Autors:
---
${freetext}
---

Regeln:
- Erstelle so viele ${unitLabel}-Einträge wie im Text erkennbar sind (mindestens 1, maximal 20)
- Erhalte den Geist und den Inhalt des Originals – fasse NICHTS weg
- "title" MUSS gesetzt sein, niemals leer
- raw_notes enthält den Originaltext der jeweiligen ${unitLabelSingular}, wortgetreu
- Passe Stil und Terminologie an die bestehende Outline an
- Antworte NUR mit einem validen JSON-Array, ohne Markdown-Code-Fences

Format:
[
  {
    "title": "${titleGuidance}",
    "purpose": "Zweck der ${unitLabelSingular} in einem Satz",
    "character_arc": "Charakterentwicklung in dieser ${unitLabelSingular}",
    "location": "${locationGuidance}",
    "key_events": "Wichtigste Ereignisse, kommagetrennt",
    "tension_level": 5,
    "raw_notes": "Originaltext dieser ${unitLabelSingular} aus dem Freitext"
  }
]`;

  try {
    const model = p.ai_provider || "anthropic/claude-sonnet-4.6";
    // 8000 Tokens statt 4000 — verhindert abgeschnittene JSON-Arrays bei langen Outlines
    const result = await generateText(model, "Du bist ein präziser Buch-Architekt.", prompt, 8000);

    let chapters: any[] = [];
    try {
      // 1. Rohen JSON-Bereich aus der Antwort extrahieren
      const rawJson = result.content.match(/\[[\s\S]*\]/)?.[0] ?? "";

      // 2. Steuerzeichen in JSON-Strings bereinigen (rohe Newlines, Tabs, \r etc.)
      //    Ersetzt U+0000–U+001F innerhalb von String-Literalen durch sichere Escape-Sequenzen
      const sanitized = rawJson.replace(
        /"(?:[^"\\]|\\.)*"/g,
        (match) => match.replace(/[\x00-\x1F]/g, (c) => {
          if (c === "\n") return "\\n";
          if (c === "\r") return "\\r";
          if (c === "\t") return "\\t";
          return "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0");
        })
      );

      // 3. Direktes Parsen versuchen
      try {
        chapters = JSON.parse(sanitized);
      } catch {
        // 4. Fallback: Truncated-JSON-Repair — extrahiere alle vollständigen Objekte
        //    Funktioniert wenn das Modell bei Token-Limit mitten in einem Objekt abbricht
        const objects: any[] = [];
        let depth = 0;
        let inString = false;
        let escape = false;
        let start = -1;

        for (let i = 0; i < sanitized.length; i++) {
          const ch = sanitized[i];
          if (escape) { escape = false; continue; }
          if (ch === "\\" && inString) { escape = true; continue; }
          if (ch === '"') { inString = !inString; continue; }
          if (inString) continue;
          if (ch === "{") {
            if (depth === 0) start = i;
            depth++;
          } else if (ch === "}") {
            depth--;
            if (depth === 0 && start !== -1) {
              try {
                objects.push(JSON.parse(sanitized.slice(start, i + 1)));
              } catch {}
              start = -1;
            }
          }
        }
        chapters = objects;
        if (chapters.length > 0) {
          console.log(`JSON-Repair erfolgreich: ${chapters.length} vollständige Objekte aus truncated JSON extrahiert.`);
        }
      }
    } catch (e) {
      console.error("Parsing error:", e);
      return NextResponse.json({ error: "KI-Antwort konnte nicht verarbeitet werden" }, { status: 500 });
    }

    if (!Array.isArray(chapters) || chapters.length === 0) {
      return NextResponse.json({ error: "Keine Kapitel erkannt" }, { status: 500 });
    }

    const insertedOutlines = [];
    for (let i = 0; i < chapters.length; i++) {
      const ch = chapters[i];
      const chapterNum = (chapter_number_start || 1) + i;
      const insertResult = await query(
        `INSERT INTO chapter_outlines (project_id, chapter_number, title, purpose, character_arc, tension_level, location, key_events, raw_notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          id,
          chapterNum,
          (ch.title && String(ch.title).trim()) || `${isScreenplay ? "Szene" : "Kapitel"} ${chapterNum}`,
          ch.purpose || "",
          ch.character_arc || "",
          ch.tension_level || 5,
          ch.location || "",
          ch.key_events || "",
          ch.raw_notes || freetext,
        ]
      );
      insertedOutlines.push(insertResult.rows[0]);
    }

    const cost = estimateCost(model, result.prompt_tokens, result.completion_tokens);
    await query(
      `INSERT INTO generation_log (project_id, action, model, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, "Outline-Punkte aus Freitext", model, result.prompt_tokens, result.completion_tokens, result.total_tokens, cost, `${insertedOutlines.length} Kapitel aus Freitext erstellt`]
    );

    return NextResponse.json({ outlines: insertedOutlines });
  } catch (error: any) {
    console.error("Outline add error:", error);
    const status = error?.status || 500;
    let message = "Fehler beim Hinzufügen des Punkts";
    if (status === 429) {
      message = "Das KI-Modell ist gerade überlastet (Rate-Limit). Bitte in 1–2 Minuten erneut versuchen oder im Projekt ein anderes Modell wählen.";
    } else if (error?.error?.message || error?.message) {
      message = `KI-Fehler: ${error?.error?.message || error.message}`;
    }
    return NextResponse.json({ error: message }, { status });
  }
}
