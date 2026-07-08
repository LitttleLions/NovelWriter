import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, PageBreak,
} from "docx";
import { buildScreenplayPdf } from "@/lib/screenplay-pdf";
import { buildScreenplayFdx } from "@/lib/screenplay-fdx";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  const { id } = await params;
  const url = new URL(req.url);
  const format = url.searchParams.get("format") || "markdown";
  const includeSceneNumbers = url.searchParams.get("includeSceneNumbers") === "true";

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
  const safeTitle = p.title.replace(/[^a-zA-Z0-9äöüÄÖÜß ]/g, "");
  const unitLabel = p.project_type === "screenplay" ? "Szene" : "Kapitel";

  function chapterHeading(ch: { chapter_number: number; title?: string | null }): string {
    const title = ch.title || `${unitLabel} ${ch.chapter_number}`;
    return includeSceneNumbers ? `${ch.chapter_number}. ${title}` : title;
  }

  if (format === "docx") {
    const docChildren: Paragraph[] = [];

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: p.title, bold: true, size: 56, font: "Georgia" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      })
    );

    if (p.genre) {
      docChildren.push(
        new Paragraph({
          children: [new TextRun({ text: `Genre: ${p.genre}`, italics: true, size: 24, color: "666666", font: "Georgia" })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 600 },
        })
      );
    }

    for (const ch of chapters.rows) {
      docChildren.push(
        new Paragraph({
          children: [new PageBreak()],
        })
      );

      docChildren.push(
        new Paragraph({
          text: chapterHeading(ch),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 300 },
        })
      );

      const content = ch.content || "(Noch nicht geschrieben)";
      const paragraphs = content.split(/\n\n+/);

      for (const para of paragraphs) {
        if (!para.trim()) continue;
        docChildren.push(
          new Paragraph({
            children: [new TextRun({ text: para.trim(), size: 24, font: "Georgia" })],
            spacing: { after: 200 },
            alignment: AlignmentType.JUSTIFIED,
          })
        );
      }
    }

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children: docChildren,
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    const uint8 = new Uint8Array(buffer);

    return new NextResponse(uint8, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${safeTitle}.docx"`,
      },
    });
  }

  if (format === "markdown") {
    let md = `# ${p.title}\n\n`;
    if (p.genre) md += `*Genre: ${p.genre}*\n\n`;
    md += `---\n\n`;

    for (const ch of chapters.rows) {
      md += `## ${chapterHeading(ch)}\n\n`;
      md += `${ch.content || "(Noch nicht geschrieben)"}\n\n`;
      md += `---\n\n`;
    }

    return new NextResponse(md, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeTitle}.md"`,
      },
    });
  }

  if (format === "txt") {
    let txt = `${p.title}\n${"=".repeat(p.title.length)}\n\n`;

    for (const ch of chapters.rows) {
      txt += `${chapterHeading(ch)}\n${"-".repeat(40)}\n\n`;
      txt += `${ch.content || "(Noch nicht geschrieben)"}\n\n\n`;
    }

    return new NextResponse(txt, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeTitle}.txt"`,
      },
    });
  }

  if (format === "pdf" || format === "fdx") {
    if (p.project_type !== "screenplay") {
      return NextResponse.json(
        { error: "PDF/FDX-Export ist nur für Drehbuch-Projekte verfügbar" },
        { status: 400 }
      );
    }
    type ChapterRow = { chapter_number: number; title: string | null; content: string | null };
    const scenes = (chapters.rows as ChapterRow[]).map((ch) => ({
      heading: includeSceneNumbers ? chapterHeading(ch) : (ch.title || undefined),
      content: ch.content || "",
    }));

    if (format === "pdf") {
      const bytes = await buildScreenplayPdf({
        title: p.title,
        author: user.name || user.email || null,
        scenes,
        language: p.language,
      });
      const pdfBuf = new Uint8Array(bytes);
      return new NextResponse(pdfBuf, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${safeTitle}.pdf"`,
        },
      });
    }

    const xml = buildScreenplayFdx({
      title: p.title,
      author: user.name || user.email || null,
      scenes,
      language: p.language,
    });
    return new NextResponse(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeTitle}.fdx"`,
      },
    });
  }

  return NextResponse.json({ error: "Unbekanntes Format" }, { status: 400 });
}
