"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  CircleDot,
  Eye,
  Layers3,
  RefreshCw,
  Search,
  Settings,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";
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
  created_at: string | null;
  expiration_date: string | null;
  freshness: ModelFreshness;
}

type VisionFilter = "all" | "vision" | "text";
type PriceRange = "all" | "free" | "under-2" | "2-10" | "10-20" | "over-20";
type ModelFreshness = "current" | "older" | "unknown";
type FreshnessFilter = "current" | "older" | "unknown" | "all";

const PRICE_RANGE_LABELS: Record<PriceRange, string> = {
  all: "Alle Preisbereiche",
  free: "Kostenlos",
  "under-2": "Bis 2 USD",
  "2-10": "Über 2 bis 10 USD",
  "10-20": "Über 10 bis 20 USD",
  "over-20": "Über 20 USD",
};

const FRESHNESS_FILTER_LABELS: Record<FreshnessFilter, string> = {
  current: "Aktuelle Modelle",
  older: "Ältere Varianten (12–24 Monate)",
  unknown: "Alter unbekannt",
  all: "Alle verfügbaren Altersstufen",
};

const FRESHNESS_BADGE_LABELS: Record<ModelFreshness, string> = {
  current: "Aktuell",
  older: "Ältere Variante",
  unknown: "Alter unbekannt",
};

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

function modelTotalPrice(model: AiModel) {
  return model.prompt_price_per_million + model.completion_price_per_million;
}

function isInPriceRange(model: AiModel, range: PriceRange) {
  const totalPrice = modelTotalPrice(model);
  switch (range) {
    case "free":
      return totalPrice === 0;
    case "under-2":
      return totalPrice > 0 && totalPrice <= 2;
    case "2-10":
      return totalPrice > 2 && totalPrice <= 10;
    case "10-20":
      return totalPrice > 10 && totalPrice <= 20;
    case "over-20":
      return totalPrice > 20;
    default:
      return true;
  }
}

function isInFreshnessFilter(model: AiModel, filter: FreshnessFilter) {
  return filter === "all" || model.freshness === filter;
}

export default function AdminPage() {
  const router = useRouter();
  const [models, setModels] = useState<AiModel[]>([]);
  const [defaultModel, setDefaultModel] = useState("");
  const [additionalModels, setAdditionalModels] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState("all");
  const [visionFilter, setVisionFilter] = useState<VisionFilter>("all");
  const [priceRange, setPriceRange] = useState<PriceRange>("all");
  const [freshnessFilter, setFreshnessFilter] = useState<FreshnessFilter>("current");
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
      if (!response.ok) throw new Error(data.error || "Die Modellliste konnte nicht geladen werden.");
      setModels(data.models || []);
      setDefaultModel(data.defaultModel || "");
      const selectableModelIds = new Set(
        (data.models || [])
          .filter((model: AiModel) => model.freshness === "current")
          .map((model: AiModel) => model.id),
      );
      const configuredModels = [data.defaultModel, ...(data.additionalModels || [])].filter(
        (id: unknown): id is string => typeof id === "string" && id.length > 0,
      );
      setUnavailableModels([...new Set(configuredModels.filter((id) => !selectableModelIds.has(id)))]);
      setAdditionalModels(
        (data.additionalModels || [])
          .filter((id: string) => id !== data.defaultModel && selectableModelIds.has(id))
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

  const providers = useMemo(
    () => [...new Set(models.map((model) => model.provider))].sort((a, b) => a.localeCompare(b, "de")),
    [models],
  );

  const filteredModels = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return models.filter((model) => {
      const matchesSearch = !needle ||
        `${model.name} ${model.id} ${model.provider} ${model.description}`.toLowerCase().includes(needle);
      const matchesProvider = providerFilter === "all" || model.provider === providerFilter;
      const matchesVision = visionFilter === "all" ||
        (visionFilter === "vision" ? model.supports_vision : !model.supports_vision);

      return matchesSearch &&
        matchesProvider &&
        matchesVision &&
        isInPriceRange(model, priceRange) &&
        isInFreshnessFilter(model, freshnessFilter);
    });
  }, [models, search, providerFilter, visionFilter, priceRange, freshnessFilter]);

  const hasActiveFilters = Boolean(search.trim()) ||
    providerFilter !== "all" ||
    visionFilter !== "all" ||
    priceRange !== "all" ||
    freshnessFilter !== "current";

  function resetAllFilters() {
    setSearch("");
    setProviderFilter("all");
    setVisionFilter("all");
    setPriceRange("all");
    setFreshnessFilter("current");
  }

  const selectableModels = models.filter((model) => model.freshness === "current");
  const configuredDefault = models.find((model) => model.id === defaultModel);
  const selectedDefault = selectableModels.find((model) => model.id === defaultModel);

  if (forbidden) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-hero-radial">
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
    <div className="min-h-screen bg-hero-radial">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="container flex h-16 items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")} title="Zum Dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Settings className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold leading-tight tracking-tight">KI-Leitstand</h1>
            <p className="text-[11px] text-muted-foreground">Globale Modellfreigaben</p>
          </div>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container max-w-6xl space-y-5 py-6 md:py-8">
        <div className="flex flex-col gap-1.5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">RomanForge AI / Admin</p>
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">KI-Modelle zentral verwalten</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Ein Standard für neue Projekte, bis zu vier Alternativen für kreative Freiheit.
            </p>
          </div>
          <Badge variant="outline" className="w-fit gap-1.5 py-1.5">
            <CircleDot className="h-3 w-3 text-success" /> {models.length} live im Katalog
          </Badge>
        </div>

        <Card className="overflow-hidden border-primary/25 bg-card/90">
          <CardContent className="p-0">
            <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
              <div className="relative p-5 md:p-6">
                <div className="absolute bottom-0 left-0 top-0 w-1 bg-primary" />
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Globaler Standard</p>
                      <Badge variant="success">Für neue Projekte</Badge>
                    </div>
                    <p className="mt-2 truncate text-xl font-bold tracking-tight">
                      {configuredDefault?.name || defaultModel || (loading ? "Wird geladen …" : "Noch nicht festgelegt")}
                    </p>
                    <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                      {configuredDefault?.id || defaultModel || "Kein Modell ausgewählt"}
                    </p>
                    <p className="mt-3 max-w-xl text-xs leading-relaxed text-muted-foreground">
                      Dieser Standard steht neuen Projekten zur Verfügung. Bestehende Projekte behalten ihre gültige Auswahl.
                    </p>
                  </div>
                </div>
              </div>
              <div className="border-t bg-muted/25 p-5 md:border-l md:border-t-0 md:p-6">
                <label htmlFor="default-model" className="mb-2 block text-xs font-semibold text-muted-foreground">
                  Standardmodell festlegen
                </label>
                <Select
                  value={selectableModels.some((model) => model.id === defaultModel) ? defaultModel : ""}
                  onValueChange={(value) => {
                    setDefaultModel(value);
                    setAdditionalModels((current) => current.filter((id) => id !== value));
                  }}
                  disabled={saving !== null || loading}
                >
                  <SelectTrigger id="default-model" className="rounded-xl bg-background">
                    <SelectValue placeholder="Standardmodell auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectableModels.map((model) => (
                      <SelectItem key={model.id} value={model.id}>{model.name} · {model.provider}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {defaultModel && !selectedDefault && (
                  <p className="mt-2 text-xs leading-relaxed text-destructive">
                   Das bisherige Standardmodell ist nicht mehr aktuell oder nicht mehr verfügbar. Bitte ein aktuelles Modell auswählen und speichern.
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-3 border-t bg-primary/[0.035] px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between md:px-6">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Layers3 className="h-4 w-4 text-primary" />
                <span><strong className="text-foreground">{additionalModels.length} / 4</strong> optionale Modelle freigegeben</span>
              </div>
              <Button onClick={saveSettings} disabled={saving !== null || !defaultModel || !selectedDefault} size="sm">
                {saving === "settings" ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Änderungen speichern
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gap-4 border-b p-5 md:flex-row md:items-center md:justify-between md:p-6">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">Modellkatalog</CardTitle>
                <Badge variant="secondary" aria-live="polite">
                  {hasActiveFilters ? `${filteredModels.length} von ${models.length}` : models.length} sichtbar
                </Badge>
              </div>
              <CardDescription className="mt-1 max-w-2xl text-xs leading-relaxed">
                Durchsuche und vergleiche die Modelle, bevor du bis zu vier davon zusätzlich zum Standard freigibst.
              </CardDescription>
            </div>
            <div className="w-full space-y-2 md:w-auto">
              <div className="flex w-full gap-2 md:w-auto">
                <div className="relative min-w-0 flex-1 md:w-72">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    aria-label="Modellkatalog durchsuchen"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Katalog durchsuchen …"
                    className="h-10 rounded-xl bg-background pl-9"
                  />
                </div>
                <Button variant="outline" size="icon" onClick={loadSettings} disabled={loading} title="Modellliste aktualisieren">
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
              </div>
               <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                 <Select value={freshnessFilter} onValueChange={(value) => setFreshnessFilter(value as FreshnessFilter)}>
                   <SelectTrigger aria-label="Nach Aktualität filtern" className="rounded-xl bg-background">
                     <SelectValue placeholder="Aktualität" />
                   </SelectTrigger>
                   <SelectContent>
                     {Object.entries(FRESHNESS_FILTER_LABELS).map(([value, label]) => (
                       <SelectItem key={value} value={value}>{label}</SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
                <Select value={providerFilter} onValueChange={setProviderFilter}>
                  <SelectTrigger aria-label="Nach Anbieter filtern" className="rounded-xl bg-background">
                    <SelectValue placeholder="Anbieter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Anbieter</SelectItem>
                    {providers.map((provider) => <SelectItem key={provider} value={provider}>{provider}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={visionFilter} onValueChange={(value) => setVisionFilter(value as VisionFilter)}>
                  <SelectTrigger aria-label="Nach Bildfähigkeit filtern" className="rounded-xl bg-background">
                    <SelectValue placeholder="Bildfähigkeit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Fähigkeiten</SelectItem>
                    <SelectItem value="vision">Bildfähig</SelectItem>
                    <SelectItem value="text">Nur Text</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={priceRange} onValueChange={(value) => setPriceRange(value as PriceRange)}>
                  <SelectTrigger aria-label="Nach Preisbereich filtern" className="rounded-xl bg-background">
                    <SelectValue placeholder="Preisbereich" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRICE_RANGE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Preisbereich: Prompt- und Completion-Kosten zusammen pro 1 Mio. Tokens.
              </p>
            </div>
          </CardHeader>
          <CardContent className="p-3 md:p-4">
            {unavailableModels.length > 0 && (
              <div className="mb-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
                <p className="font-medium text-destructive">Gespeicherte Modellfreigaben aktualisieren</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Ersatzbedarf für gespeicherte Modellfreigaben: <span className="font-mono">{unavailableModels.join(", ")}</span>. Diese Auswahlwerte bleiben erhalten, bis du ein aktuelles Modell wählst und speicherst.
                </p>
              </div>
            )}
            {error && (
              <div className="mb-3 flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm sm:flex-row sm:items-center">
                <p className="flex-1 text-destructive">{error}</p>
                <Button variant="outline" size="sm" onClick={loadSettings} disabled={loading}><RefreshCw className="h-3.5 w-3.5" /> Erneut versuchen</Button>
              </div>
            )}
            {hasActiveFilters && (
              <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border bg-muted/25 p-3">
                <span className="text-xs font-medium text-muted-foreground">Aktive Filter:</span>
                {search.trim() && (
                  <Button variant="secondary" size="sm" onClick={() => setSearch("")}>
                    Suche: „{search.trim()}“ <X className="h-3.5 w-3.5" />
                  </Button>
                )}
                {providerFilter !== "all" && (
                  <Button variant="secondary" size="sm" onClick={() => setProviderFilter("all")}>
                    Anbieter: {providerFilter} <X className="h-3.5 w-3.5" />
                  </Button>
                )}
                {visionFilter !== "all" && (
                  <Button variant="secondary" size="sm" onClick={() => setVisionFilter("all")}>
                    {visionFilter === "vision" ? "Bildfähig" : "Nur Text"} <X className="h-3.5 w-3.5" />
                  </Button>
                )}
                {priceRange !== "all" && (
                  <Button variant="secondary" size="sm" onClick={() => setPriceRange("all")}>
                    {PRICE_RANGE_LABELS[priceRange]} <X className="h-3.5 w-3.5" />
                  </Button>
                )}
                {freshnessFilter !== "current" && (
                  <Button variant="secondary" size="sm" onClick={() => setFreshnessFilter("current")}>
                    {FRESHNESS_FILTER_LABELS[freshnessFilter]} <X className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={resetAllFilters} className="ml-auto">
                  Alle zurücksetzen
                </Button>
              </div>
            )}
            {loading ? (
              <div className="grid gap-3 md:grid-cols-2">
                {[1, 2, 3, 4].map((item) => <div key={item} className="h-44 animate-pulse rounded-xl bg-muted/60" />)}
              </div>
            ) : filteredModels.length === 0 ? (
              <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
                {models.length === 0 ? (
                  "Keine zulässigen Modelle verfügbar."
                ) : (
                  <div className="space-y-3">
                    <p>Keine Modelle entsprechen deiner Suche oder den ausgewählten Filtern.</p>
                    <Button variant="outline" size="sm" onClick={resetAllFilters}>Filter zurücksetzen</Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {filteredModels.map((model) => {
                  const isDefault = model.id === defaultModel;
                  const isAdditional = additionalModels.includes(model.id);
                  const isAtLimit = !isAdditional && additionalModels.length >= 4;
                  const isSelectable = model.freshness === "current";
                  return (
                    <div key={model.id} className={`group rounded-xl border p-4 transition-colors duration-200 ${isDefault ? "border-primary/50 bg-primary/[0.045]" : "bg-card hover:border-primary/35 hover:bg-muted/20"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate font-semibold">{model.name}</h3>
                            <Badge variant={model.freshness === "current" ? "success" : "outline"} className="shrink-0">
                              {FRESHNESS_BADGE_LABELS[model.freshness]}
                            </Badge>
                            {isDefault && <Badge className="shrink-0">Standard</Badge>}
                            {isAdditional && <Badge variant="success" className="shrink-0">Freigegeben</Badge>}
                          </div>
                          <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">{model.provider} · {model.id}</p>
                        </div>
                        <Button
                          size="sm"
                          variant={isAdditional ? "default" : "outline"}
                           disabled={isDefault || saving !== null || isAtLimit || !isSelectable}
                          onClick={() => toggleAdditionalModel(model.id)}
                          className="shrink-0"
                           title={!isSelectable ? "Nur aktuelle Modelle können neu freigegeben werden." : isAtLimit ? "Maximal vier Zusatzmodelle" : undefined}
                        >
                          {isAdditional && <Check className="h-3.5 w-3.5" />}
                           {isAdditional ? "Entfernen" : isDefault ? "Standard" : isSelectable ? "Freigeben" : "Nicht freigebbar"}
                        </Button>
                      </div>
                      {model.description && <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{model.description}</p>}
                      <div className="mt-4 grid grid-cols-2 gap-2 border-t pt-3 text-xs sm:grid-cols-4">
                        <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Prompt</p><p className="mt-0.5 font-medium">{formatPrice(model.prompt_price_per_million)}</p></div>
                        <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Completion</p><p className="mt-0.5 font-medium">{formatPrice(model.completion_price_per_million)}</p></div>
                        <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Kontext</p><p className="mt-0.5 font-medium">{formatContext(model.context_length)}</p></div>
                        <div className="flex items-end justify-start sm:justify-end">{model.supports_vision ? <Badge variant="outline" className="gap-1"><Eye className="h-3 w-3" /> Bildfähig</Badge> : <span className="text-muted-foreground">Nur Text</span>}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}