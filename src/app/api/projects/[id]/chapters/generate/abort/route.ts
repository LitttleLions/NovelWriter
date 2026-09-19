import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { requireOwnedProject } from "@/lib/project-access";
import { ensureGenerationSchema } from "@/lib/generation/schema";
import { requestAbort } from "@/lib/generation/jobs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  const { id } = await params;
  const project = await requireOwnedProject(id, user.id);
  if (!project) return NextResponse.json({ error: "Projekt nicht gefunden" }, { status: 404 });

  await ensureGenerationSchema();
  const body = await req.json().catch(() => ({}));
  const chapter_number = Number(body.chapter_number);
  if (!chapter_number) {
    return NextResponse.json({ error: "chapter_number fehlt" }, { status: 400 });
  }

  const job = await requestAbort(id, chapter_number);
  if (!job) {
    return NextResponse.json({ error: "Kein laufender Job für dieses Kapitel." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, job_id: job.id });
}
