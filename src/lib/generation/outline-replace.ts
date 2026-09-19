import { withTransaction } from "@/lib/db";
import type { PoolClient } from "pg";

export async function replaceProjectOutline(
  projectId: string,
  chapters: any[],
  normalizeStructuralRole: (value: unknown) => string | null,
): Promise<void> {
  if (!Array.isArray(chapters) || chapters.length === 0) {
    throw new Error("Keine gültige Outline – bestehende Kapitel und Outlines bleiben unverändert.");
  }

  await withTransaction(async (client: PoolClient) => {
    await client.query("DELETE FROM chapters WHERE project_id = $1", [projectId]);
    await client.query("DELETE FROM chapter_outlines WHERE project_id = $1", [projectId]);

    for (const ch of chapters) {
      await client.query(
        `INSERT INTO chapter_outlines
           (project_id, chapter_number, title, purpose, character_arc, tension_level, location, key_events, raw_notes, structural_role)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          projectId,
          ch.chapter_number,
          ch.title || `Szene ${ch.chapter_number}`,
          ch.purpose || "",
          ch.character_arc || "",
          ch.tension_level || 5,
          ch.location || "",
          ch.key_events || "",
          ch.raw_notes || "",
          normalizeStructuralRole(ch.structural_role),
        ],
      );
    }
  });
}
