import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import pool from "@/lib/db";
import { resolveModel } from "@/lib/ai-settings";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  const { id } = await params;

  // Single client + transaction so a partial duplicate (project without
  // outlines, or outlines without chapters) cannot end up in the DB.
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const sourceRes = await client.query(
      "SELECT * FROM projects WHERE id = $1 AND user_id = $2",
      [id, user.id]
    );
    if (sourceRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Projekt nicht gefunden" }, { status: 404 });
    }
    const src = sourceRes.rows[0];
    // Historical projects may reference a model that is no longer live or
    // allowlisted. Resolve it through the current policy so duplication
    // remains usable while never carrying an unapproved model forward.
    const selectedModel = await resolveModel(src.ai_provider);

    const newTitle = `${src.title} (Kopie)`;

    const created = await client.query(
      `INSERT INTO projects (
         user_id, title, genre, target_word_count, language,
         summary, characters, outline,
         style_sample, style_json, style_notes,
         ai_provider, status,
         project_type, screenplay_format, screenplay_style_preset
       ) VALUES (
         $1, $2, $3, $4, $5,
         $6, $7, $8,
         $9, $10, $11,
         $12, 'draft',
         $13, $14, $15
       )
       RETURNING *`,
      [
        user.id,
        newTitle,
        src.genre,
        src.target_word_count,
        src.language,
        src.summary,
        src.characters,
        src.outline,
        src.style_sample,
        src.style_json,
        src.style_notes,
        selectedModel,
        src.project_type,
        src.screenplay_format,
        src.screenplay_style_preset,
      ]
    );
    const newProject = created.rows[0];

    // Outlines kopieren — der eigentliche "Reststoff" zum Testen.
    await client.query(
      `INSERT INTO chapter_outlines (
         project_id, chapter_number, title, purpose, character_arc,
         tension_level, location, key_events, raw_notes, structural_role
       )
       SELECT $1, chapter_number, title, purpose, character_arc,
              tension_level, location, key_events, raw_notes, structural_role
       FROM chapter_outlines
       WHERE project_id = $2
       ORDER BY chapter_number`,
      [newProject.id, src.id]
    );

    // Bereits geschriebene Kapitel ebenfalls kopieren — inkl. narrative_summary
    // und character_states, damit das Story-Memory in der Kopie sofort
    // weiterläuft. Status der Kapitel selbst bleibt unverändert.
    await client.query(
      `INSERT INTO chapters (
         project_id, chapter_number, title, purpose, content,
         word_count, status, narrative_summary, character_states
       )
       SELECT $1, chapter_number, title, purpose, content,
              word_count, status, narrative_summary, character_states
       FROM chapters
       WHERE project_id = $2
       ORDER BY chapter_number`,
      [newProject.id, src.id]
    );

    // Strukturierte Charaktere (Figurenprofile mit Rolle, Backstory, Traits)
    // mit kopieren — sonst wäre der Figuren-Tab in der Kopie leer und das
    // Story-Memory könnte sich beim Weiter-Generieren nicht auf etablierte
    // Figuren stützen.
    await client.query(
      `INSERT INTO project_characters (
         project_id, name, role, description, traits,
         backstory, appearance, notes, first_appears_chapter
       )
       SELECT $1, name, role, description, traits,
              backstory, appearance, notes, first_appears_chapter
       FROM project_characters
       WHERE project_id = $2
       ORDER BY id`,
      [newProject.id, src.id]
    );

    // generation_log absichtlich NICHT kopieren — Kosten/Token-Log startet
    // für die Kopie bei null. Sonst würde man identische Tokens doppelt zählen.

    await client.query("COMMIT");
    return NextResponse.json({ project: newProject });
  } catch (err: any) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Duplicate project error:", err);
    return NextResponse.json(
      { error: "Projekt konnte nicht dupliziert werden" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
