import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  const { id } = await params;
  const project = await query("SELECT id FROM projects WHERE id = $1 AND user_id = $2", [id, user.id]);
  if (project.rows.length === 0) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  const result = await query(
    "SELECT * FROM project_characters WHERE project_id = $1 ORDER BY created_at ASC",
    [id]
  );
  return NextResponse.json({ characters: result.rows });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  const { id } = await params;
  const project = await query("SELECT id FROM projects WHERE id = $1 AND user_id = $2", [id, user.id]);
  if (project.rows.length === 0) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  const body = await req.json();
  const { name, role, description, traits, backstory, appearance, notes } = body;

  if (!name?.trim()) return NextResponse.json({ error: "Name erforderlich" }, { status: 400 });

  const result = await query(
    `INSERT INTO project_characters (project_id, name, role, description, traits, backstory, appearance, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [id, name, role || null, description || null, traits || null, backstory || null, appearance || null, notes || null]
  );
  return NextResponse.json({ character: result.rows[0] });
}
