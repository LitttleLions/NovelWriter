import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  const { id } = await params;

  const project = await query(
    "SELECT id FROM projects WHERE id = $1 AND user_id = $2",
    [id, user.id]
  );
  if (project.rows.length === 0) {
    return NextResponse.json({ error: "Projekt nicht gefunden" }, { status: 404 });
  }

  const { orderedIds } = await req.json();

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return NextResponse.json({ error: "orderedIds ist erforderlich" }, { status: 400 });
  }

  for (let i = 0; i < orderedIds.length; i++) {
    await query(
      "UPDATE chapter_outlines SET chapter_number = $1 WHERE id = $2 AND project_id = $3",
      [i + 1, orderedIds[i], id]
    );
  }

  const outlines = await query(
    "SELECT * FROM chapter_outlines WHERE project_id = $1 ORDER BY chapter_number",
    [id]
  );

  return NextResponse.json({ outlines: outlines.rows });
}
