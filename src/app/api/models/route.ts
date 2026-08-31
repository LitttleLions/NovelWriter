import { NextResponse } from "next/server";
import { getAvailableModels, getAiSettings } from "@/lib/ai-settings";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  try {
    const [models, settings] = await Promise.all([
      getAvailableModels(),
      getAiSettings(),
    ]);
    return NextResponse.json(
      { models, defaultModel: settings.default_model },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error: any) {
    console.error("Load AI models error:", error);
    return NextResponse.json(
      { error: "Die aktuelle OpenRouter-Modellliste konnte nicht geladen werden. Bitte versuche es erneut." },
      { status: 503 },
    );
  }
}
