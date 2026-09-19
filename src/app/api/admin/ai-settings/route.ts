import { NextResponse } from "next/server";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import {
  getAiSettings,
  getAvailableModels,
  MAX_ALLOWED_MODELS,
  MAX_ADDITIONAL_MODELS,
  setAiSettings,
} from "@/lib/ai-settings";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) return { response: NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 }) };
  if (!isAdmin(user)) return { response: NextResponse.json({ error: "Keine Admin-Berechtigung" }, { status: 403 }) };
  return { user };
}

export async function GET() {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  try {
    const [models, settings] = await Promise.all([
      getAvailableModels(),
      getAiSettings(),
    ]);
    return NextResponse.json({
      models,
      defaultModel: settings.default_model,
      allowedModels: settings.allowed_models,
      additionalModels: settings.allowed_models.filter((id: string) => id !== settings.default_model),
      maxAdditionalModels: MAX_ADDITIONAL_MODELS,
      maxModels: MAX_ALLOWED_MODELS,
    });
  } catch (error) {
    console.error("Load admin AI settings error:", error);
    return NextResponse.json(
      { error: "Die aktuelle OpenRouter-Modellliste konnte nicht geladen werden. Bitte erneut versuchen." },
      { status: 503 },
    );
  }
}

export async function PUT(req: Request) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json();
    const defaultModel = typeof body.defaultModel === "string"
      ? body.defaultModel.trim()
      : typeof body.model === "string"
        ? body.model.trim()
        : "";
    const additionalModels = Array.isArray(body.additionalModels) ? body.additionalModels : [];
    if (!defaultModel) {
      return NextResponse.json({ error: "Bitte ein Modell auswählen." }, { status: 400 });
    }
    const settings = await setAiSettings(defaultModel, additionalModels);
    const models = await getAvailableModels();
    return NextResponse.json({
      defaultModel: settings.default_model,
      allowedModels: settings.allowed_models,
      additionalModels: settings.allowed_models.filter((id) => id !== settings.default_model),
      model: models.find((model) => model.id === settings.default_model) || null,
    });
  } catch (error: any) {
    console.error("Update admin AI settings error:", error);
    return NextResponse.json(
      { error: error?.message || "Das Standardmodell konnte nicht gespeichert werden." },
      { status: 400 },
    );
  }
}