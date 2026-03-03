import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  const { id } = await params;
  const url = new URL(req.url);
  const format = url.searchParams.get("format") || "markdown";

  const project = await query(
    "SELECT * FROM projects WHERE id = $1 AND user_id = $2",
    [id, user.id]
  );
  if (project.rows.length === 0) {
    return NextResponse.json({ error: "Projekt nicht gefunden" }, { status: 404 });
  }

  const chapters = await query(
    "SELECT * FROM chapters WHERE project_id = $1 ORDER BY chapter_number",
    [id]
  );

  const p = project.rows[0];

  if (format === "markdown") {
    let md = `# ${p.title}\n\n`;
    if (p.genre) md += `*Genre: ${p.genre}*\n\n`;
    md += `---\n\n`;

    for (const ch of chapters.rows) {
      md += `## ${ch.title || `Kapitel ${ch.chapter_number}`}\n\n`;
      md += `${ch.content || "(Noch nicht geschrieben)"}\n\n`;
      md += `---\n\n`;
    }

    return new NextResponse(md, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${p.title.replace(/[^a-zA-Z0-9äöüÄÖÜß ]/g, "")}.md"`,
      },
    });
  }

  if (format === "txt") {
    let txt = `${p.title}\n${"=".repeat(p.title.length)}\n\n`;

    for (const ch of chapters.rows) {
      txt += `${ch.title || `Kapitel ${ch.chapter_number}`}\n${"-".repeat(40)}\n\n`;
      txt += `${ch.content || "(Noch nicht geschrieben)"}\n\n\n`;
    }

    return new NextResponse(txt, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${p.title.replace(/[^a-zA-Z0-9äöüÄÖÜß ]/g, "")}.txt"`,
      },
    });
  }

  return NextResponse.json({ error: "Unbekanntes Format" }, { status: 400 });
}
