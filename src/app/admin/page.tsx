"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, RefreshCw, Search, Settings, ShieldAlert, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ThemeToggle } from "@/components/theme-toggle";

interface AiModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  prompt_price_per_million: number;
  completion_price_per_million: number;
  context_length: number;
  supports_vision: boolean;
}

function formatPrice(value: number) {
  if (value === 0) return "Kostenlos";
  if (value < 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(2)}`;
}

function formatContext(value: number) {
  if (!value) return "—";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} Mio.`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return value.toLocaleString("de-DE");
}

export default function AdminPage() {
  const router = useRouter();
  const [models, setModels] = useState<AiModel[]>([]);
  const [defaultModel, setDefaultModel] = useState("");
  const [additionalModels, setAdditionalModels] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [unavailableModels, setUnavailableModels] = useState<string[]>([]);
  const [forbidden, setForbidden] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/ai-settings", { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        router.push("/");
        return;
      }
      if (response.status === 403) {
        setForbidden(true);
        return;
      }
      if (!response.ok) {
        throw new Error(data.error || "Die Modellliste konnte nicht geladen werden.");
      }
      setModels(data.models || []);
      setDefaultModel(data.defaultModel || "");
      const liveModelIds = new Set((data.models || []).map((model: AiModel) => model.id));
      const configuredModels = [
        data.defaultModel,
        ...(data.additionalModels || []),
      ].filter((id: unknown): id is string => typeof id === "string" && id.length > 0);
      setUnavailableModels(
        [...new Set(configuredModels.filter((id) => !liveModelIds.has(id)))],
      );
      setAdditionalModels(
        (data.additionalModels || [])
          .filter((id: string) => id !== data.defaultModel && liveModelIds.has(id))
          .slice(0, 4),
      );
    } catch (err: any) {
      setError(err?.message || "Die Modellliste konnte nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  async function saveSettings() {
    if (!defaultModel) return;
    setSaving("settings");
    setError("");
    try {
      const response = await fetch("/api/admin/ai-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultModel, additionalModels }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Das Standardmodell konnte nicht gespeichert werden.");
      setDefaultModel(data.defaultModel || defaultModel);
      setAdditionalModels(data.additionalModels || []);
      setUnavailableModels([]);
    } catch (err: any) {
      setError(err?.message || "Die Modellfreigaben konnten nicht gespeichert werden.");
    } finally {
      setSaving(null);
    }
  }

  function toggleAdditionalModel(modelId: string) {
    if (modelId === defaultModel) return;
    setAdditionalModels((current) =>
      current.includes(modelId)
        ? current.filter((id) => id !== modelId)
        : current.length < 4
          ? [...current, modelId]
          : current,
    );
  }

  const filteredModels = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return models;
    return models.filter((model) =>
      `${model.name} ${model.id} ${model.provider} ${model.description}`.toLowerCase().includes(needle),
    );
  }, [models, search]);

  if (forbidden) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <ShieldAlert className="h-8 w-8 text-destructive mb-2" />
            <CardTitle>Kein Admin-Zugriff</CardTitle>
            <CardDescription>Diese Seite ist nur für berechtigte Administratoren verfügbar.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              <ArrowLeft className="h-4 w-4" /> Zum Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/60 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container flex h-16 items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")} title="Zum Dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <div>
              <h1 className="font-bold leading-tight">KI-Einstellungen</h1>
              <p className="text-xs text-muted-foreground">Zentrales Standardmodell</p>
            </div>
          </div>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container max-w-6xl py-8 space-y-6">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex flex-col md:flex-row md:items-center gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">Empfohlenes Standardmodell</p>
                <Badge variant="outline">Für neue Projekte</Badge>
              </div>
              <p className="truncate text-lg font-bold">
                {models.find((model) => model.id === defaultModel)?.name ||
                  defaultModel ||
                  (loading ? "Wird geladen …" : "Automatische Auswahl")}
              </p>
              {defaultModel && models.find((model) => model.id === defaultModel) && (
                <p className="truncate text-xs text-muted-foreground">{defaultModel}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Neue Projekte starten damit. Bestehende Projekte behalten ihre eigene gültige Auswahl und können jederzeit zurücksetzen.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[340px]">
              <label className="text-xs font-medium text-muted-foreground">Standardmodell festlegen</label>
              <Select
                value={models.some((model) => model.id === defaultModel) ? defaultModel : ""}
                onValueChange={(value) => {
                  setDefaultModel(value);
                  setAdditionalModels((current) => current.filter((id) => id !== value));
                }}
                disabled={saving !== null || loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Standardmodell auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name} · {model.provider}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {defaultModel && !models.some((model) => model.id === defaultModel) && (
                <p className="text-xs text-destructive">
                  Das bisherige Standardmodell ist live nicht mehr verfügbar. Bitte ein neues auswählen.
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 sm:self-end">
              <Badge variant="secondary">{additionalModels.length} / 4 Zusatzmodelle</Badge>
              <Button onClick={saveSettings} disabled={saving !== null || !defaultModel || !models.some((model) => model.id === defaultModel)}>
                {saving === "settings" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Standard & Freigaben speichern
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Verfügbare Modelle</CardTitle>
              <CardDescription>
                Angezeigt werden Modelle der unterstützten Anbieter bis zum Preislimit von 20 USD pro 1 Mio. Tokens;
                bekannte Legacy-OpenAI-Familien werden ausgeblendet. Das Standardmodell ist immer freigegeben.
                Zusätzlich kannst du bis zu vier Modelle für Projekte freigeben.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Modelle suchen …"
                  className="pl-9 w-full md:w-64"
                />
              </div>
              <Button variant="outline" size="icon" onClick={loadSettings} disabled={loading} title="Modellliste aktualisieren">
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {unavailableModels.length > 0 && (
              <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
                <p className="font-medium text-destructive">Gespeicherte Modellfreigaben aktualisieren</p>
                <p className="mt-1 text-muted-foreground">
                  Diese Modelle sind im aktuellen OpenRouter-Katalog nicht mehr verfügbar oder nicht mehr zugelassen:
                  {" "}{unavailableModels.join(", ")}. Bitte ein neues Standardmodell auswählen und die Freigaben speichern.
                </p>
              </div>
            )}
            {error && (
              <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
                <p className="flex-1 text-destructive">{error}</p>
                <Button variant="outline" size="sm" onClick={loadSettings} disabled={loading}>
                  <RefreshCw className="h-3.5 w-3.5" /> Erneut versuchen
                </Button>
              </div>
            )}
            {loading ? (
              <div className="py-16 text-center text-sm text-muted-foreground animate-pulse">Aktuelle Modellliste wird geladen …</div>
            ) : filteredModels.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                {models.length === 0 ? "Keine zulässigen Modelle verfügbar." : "Keine Modelle für diese Suche gefunden."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="pb-3 pr-4 font-medium">Modell</th>
                      <th className="pb-3 pr-4 font-medium">Prompt / Completion</th>
                      <th className="pb-3 pr-4 font-medium">Kontext</th>
                      <th className="pb-3 pr-4 font-medium">Fähigkeiten</th>
                      <th className="pb-3 text-right font-medium">Auswahl</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredModels.map((model) => {
                      const isDefault = model.id === defaultModel;
                      const isAdditional = additionalModels.includes(model.id);
                      return (
                        <tr key={model.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="py-4 pr-4">
                            <div className="font-medium">{model.name}</div>
                            <div className="text-xs text-muted-foreground">{model.provider} · {model.id}</div>
                            {model.description && (
                              <div className="mt-1 max-w-lg text-xs text-muted-foreground line-clamp-2">{model.description}</div>
                            )}
                          </td>
                          <td className="py-4 pr-4 whitespace-nowrap">
                            {formatPrice(model.prompt_price_per_million)} / {formatPrice(model.completion_price_per_million)}
                          </td>
                          <td className="py-4 pr-4 whitespace-nowrap">{formatContext(model.context_length)} Tokens</td>
                          <td className="py-4 pr-4">
                            <div className="flex flex-wrap gap-1">
                              {isDefault && <Badge>Standard</Badge>}
                              {isAdditional && <Badge variant="outline">Freigegeben</Badge>}
                              {model.supports_vision ? <Badge variant="outline">Bildfähig</Badge> : <span className="text-muted-foreground">Text</span>}
                            </div>
                          </td>
                          <td className="py-4 text-right">
                            <Button
                              size="sm"
                              variant={isAdditional ? "default" : "outline"}
                              disabled={isDefault || saving !== null || (!isAdditional && additionalModels.length >= 4)}
                              onClick={() => toggleAdditionalModel(model.id)}
                            >
                              {isAdditional && <Check className="h-3.5 w-3.5" />}
                              {isAdditional ? "Freigegeben" : isDefault ? "Standard" : "Freigeben"}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}