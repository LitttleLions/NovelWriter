import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { requireOwnedProject } from "@/lib/project-access";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  const { id, chapterId } = await params;
  const { content, title, narrative_summary } = await req.json();

  const project = await requireOwnedProject(id, user.id);
  if (!project) {
    return NextResponse.json({ error: "Projekt nicht gefunden" }, { status: 404 });
  }

  const wordCount = content ? content.trim().split(/\s+/).length : 0;

  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (content !== undefined) {
    fields.push(`content = $${idx}`);
    values.push(content);
    idx++;
    fields.push(`word_count = $${idx}`);
    values.push(wordCount);
    idx++;
  }
  if (title !== undefined) {
    fields.push(`title = $${idx}`);
    values.push(title);
    idx++;
  }
  if (narrative_summary !== undefined) {
    fields.push(`narrative_summary = $${idx}`);
    values.push(narrative_summary);
    idx++;
  }

  const finalIdxForId = idx;
  const finalIdxForProjectId = idx + 1;

  const result = await query(
    `UPDATE chapters SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $${finalIdxForId} AND project_id = $${finalIdxForProjectId} RETURNING *`,
    [...values, chapterId, id]
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Kapitel nicht gefunden" }, { status: 404 });
  }

  return NextResponse.json({ chapter: result.rows[0] });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  const { id, chapterId } = await params;
  const project = await requireOwnedProject(id, user.id);
  if (!project) {
    return NextResponse.json({ error: "Projekt nicht gefunden" }, { status: 404 });
  }

  const result = await query(
    "DELETE FROM chapters WHERE id = $1 AND project_id = $2 RETURNING id",
    [chapterId, id]
  );
  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Kapitel nicht gefunden" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
