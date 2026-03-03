import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { title, purpose, character_arc, tension_level, chapter_number } = body;

  const result = await query(
    `INSERT INTO chapter_outlines (project_id, chapter_number, title, purpose, character_arc, tension_level)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [id, chapter_number, title, purpose, character_arc, tension_level || 5]
  );

  return NextResponse.json({ outline: result.rows[0] });
}
