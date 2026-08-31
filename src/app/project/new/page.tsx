"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel,
} from "@/components/ui/select";
import { ThemeToggle } from "@/components/theme-toggle";
import { BookOpen, ArrowLeft, ArrowRight, Sparkles, Film, Tv, Info } from "lucide-react";
import { SCREENPLAY_STYLE_PRESETS } from "@/lib/screenplay-presets";
import { DEFAULT_TARGET_WORDS, pagesToWords, wordsToPages } from "@/lib/terms";

type ProjectType = "novel" | "screenplay";
type ScreenplayFormat = "feature" | "tv_episode";

export default function NewProjectPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-muted-foreground animate-pulse">Laden...</div>}>
      <NewProjectInner />
    </Suspense>
  );
}

function NewProjectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialType: ProjectType = searchParams?.get("type") === "screenplay" ? "screenplay" : "novel";
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [projectType, setProjectType] = useState<ProjectType>(initialType);
  const [screenplayFormat, setScreenplayFormat] = useState<ScreenplayFormat>("feature");
  const [screenplayStylePreset, setScreenplayStylePreset] = useState<string>("sorkin");
  const [styleNotes, setStyleNotes] = useState<string>("");
  const [styleNotesTouched, setStyleNotesTouched] = useState(false);

  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [targetWordCount, setTargetWordCount] = useState("80000");
  const [language, setLanguage] = useState("Deutsch");

  const [summary, setSummary] = useState("");
  const [characters, setCharacters] = useState("");
  const [outline, setOutline] = useState("");

  // Auto-prefill style_notes when a screenplay preset is chosen — only as long
  // as the user hasn't manually edited the textarea. After manual edits we
  // never overwrite their text again.
  useEffect(() => {
    if (projectType !== "screenplay") return;
    if (styleNotesTouched) return;
    const preset = SCREENPLAY_STYLE_PRESETS.find((p) => p.id === screenplayStylePreset);
    setStyleNotes(preset?.styleNotesText ?? "");
  }, [projectType, screenplayStylePreset, styleNotesTouched]);

  // When switching back to novel, clear any preset-prefilled notes (unless touched).
  useEffect(() => {
    if (projectType === "novel" && !styleNotesTouched) {
      setStyleNotes("");
    }
  }, [projectType, styleNotesTouched]);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => {
      if (d.error) router.push("/");
    });
  }, [router]);

  // Auto-Defaults wenn Projekt-Typ wechselt
  useEffect(() => {
    if (projectType === "novel") {
      setTargetWordCount(String(DEFAULT_TARGET_WORDS.novel));
    } else if (screenplayFormat === "feature") {
      setTargetWordCount(String(DEFAULT_TARGET_WORDS.feature));
    } else {
      setTargetWordCount(String(DEFAULT_TARGET_WORDS.tv_episode));
    }
  }, [projectType, screenplayFormat]);

  async function handleCreate() {
    setLoading(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          genre,
          target_word_count: parseInt(targetWordCount),
          language,
          summary,
          characters,
          outline: outline || null,
          project_type: projectType,
          screenplay_format: projectType === "screenplay" ? screenplayFormat : null,
          screenplay_style_preset: projectType === "screenplay" ? screenplayStylePreset : null,
          style_notes: projectType === "screenplay" && styleNotes.trim() ? styleNotes : null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push(`/project/${data.project.id}`);
      }
    } finally {
      setLoading(false);
    }
  }

  const novelGenres = [
    "Fantasy", "Dark Fantasy", "Science Fiction", "Thriller", "Krimi",
    "Romance", "Horror", "Historischer Roman", "Literarische Fiktion",
    "Young Adult", "Dystopie", "Urban Fantasy", "Erotik", "Abenteuer",
  ];
  const screenplayGenres = [
    "Drama", "Thriller", "Krimi", "Komödie", "Romantische Komödie",
    "Action", "Sci-Fi", "Horror", "Mystery", "Biopic",
    "Coming-of-Age", "Heist", "Historiendrama", "Familiendrama",
  ];
  const genres = projectType === "screenplay" ? screenplayGenres : novelGenres;

  const languages = ["Deutsch", "English", "Español", "Français", "Italiano", "Português"];

  const isScreenplay = projectType === "screenplay";
  const wordcountLabel = isScreenplay
    ? "Ziel-Länge (Drehbuchseiten)"
    : "Ziel-Wortzahl";
  const wordcountValue = isScreenplay
    ? String(wordsToPages(parseInt(targetWordCount) || 0))
    : targetWordCount;
  const handleWordcountChange = (v: string) => {
    if (isScreenplay) {
      const pages = parseInt(v) || 0;
      setTargetWordCount(String(pagesToWords(pages)));
    } else {
      setTargetWordCount(v);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/60 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container flex h-16 items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold">Neues Projekt</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Schritt {step} von 2</span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container max-w-2xl py-12">
        {step === 1 && (
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="text-2xl">Projekt-Details</CardTitle>
              <CardDescription>
                Wähle den Werk-Typ und definiere die Eckdaten
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Werk-Typ</Label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setProjectType("novel")}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      projectType === "novel"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <BookOpen className={`h-6 w-6 ${projectType === "novel" ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-sm font-medium ${projectType === "novel" ? "text-primary" : ""}`}>Roman</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setProjectType("screenplay"); setScreenplayFormat("feature"); }}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      projectType === "screenplay" && screenplayFormat === "feature"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <Film className={`h-6 w-6 ${projectType === "screenplay" && screenplayFormat === "feature" ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-sm font-medium ${projectType === "screenplay" && screenplayFormat === "feature" ? "text-primary" : ""}`}>Spielfilm</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setProjectType("screenplay"); setScreenplayFormat("tv_episode"); }}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      projectType === "screenplay" && screenplayFormat === "tv_episode"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <Tv className={`h-6 w-6 ${projectType === "screenplay" && screenplayFormat === "tv_episode" ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-sm font-medium ${projectType === "screenplay" && screenplayFormat === "tv_episode" ? "text-primary" : ""}`}>TV-Episode</span>
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {projectType === "novel" && "Klassischer Prosa-Roman, ~80.000 Wörter (~320 Seiten)."}
                  {projectType === "screenplay" && screenplayFormat === "feature" && "Spielfilm-Drehbuch, ~90 Seiten (~22.500 Wörter, 1 Seite ≈ 1 Min. Filmzeit)."}
                  {projectType === "screenplay" && screenplayFormat === "tv_episode" && "TV-Episode, ~55 Seiten (~14.000 Wörter, ca. 50–60 Min. Sendezeit)."}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Titel *</Label>
                <Input
                  id="title"
                  placeholder={isScreenplay ? "Der Titel deines Drehbuchs" : "Der Titel deines Romans"}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Genre</Label>
                  <Select value={genre} onValueChange={setGenre}>
                    <SelectTrigger>
                      <SelectValue placeholder="Genre wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {genres.map((g) => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Sprache</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((l) => (
                        <SelectItem key={l} value={l}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="wordcount">{wordcountLabel}</Label>
                <Input
                  id="wordcount"
                  type="number"
                  value={wordcountValue}
                  onChange={(e) => handleWordcountChange(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {isScreenplay
                    ? `≈ ${parseInt(targetWordCount).toLocaleString("de-DE")} Wörter (1 Drehbuchseite ≈ 250 Wörter ≈ 1 Min. Filmzeit)`
                    : "Standard: 80.000 Wörter (~320 Seiten)"}
                </p>
              </div>

              {isScreenplay && (
                <>
                  <div className="space-y-2">
                    <Label>Stil-Preset</Label>
                    <Select
                      value={screenplayStylePreset}
                      onValueChange={(v) => {
                        // Re-enable auto-prefill when the user picks a fresh preset.
                        setStyleNotesTouched(false);
                        setScreenplayStylePreset(v);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SCREENPLAY_STYLE_PRESETS.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {SCREENPLAY_STYLE_PRESETS.find((p) => p.id === screenplayStylePreset)?.description}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="style_notes">Stil-Direktiven (editierbar)</Label>
                    <Textarea
                      id="style_notes"
                      value={styleNotes}
                      onChange={(e) => {
                        setStyleNotes(e.target.value);
                        setStyleNotesTouched(true);
                      }}
                      rows={10}
                      placeholder="Vom Preset vorgefüllt — du kannst frei editieren, ergänzen oder löschen."
                      className="font-sans text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Diese Notizen werden bei jeder Szenen-Generierung als oberste Stil-Priorität in den Prompt eingehängt. Vorgefüllt vom gewählten Preset, jederzeit anpassbar.
                    </p>
                  </div>
                </>
              )}

              <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-4">
                <Label>KI-Modell</Label>
                {isScreenplay ? (
                  <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
                    <span>Das Standardmodell wird zentral von der Administration verwaltet und gilt für alle Projekte.</span>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Für alle KI-Funktionen wird das zentral konfigurierte Standardmodell verwendet.
                  </p>
                )}
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setStep(2)} disabled={!title}>
                  Weiter
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="text-2xl">Deine Assets</CardTitle>
              <CardDescription>
                Summary, {isScreenplay ? "Figuren" : "Charaktere"} und optionale {isScreenplay ? "Szenen-Liste" : "Outline"} – dein Startmaterial
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="summary">Summary *</Label>
                <Textarea
                  id="summary"
                  placeholder={isScreenplay
                    ? "Beschreibe die Handlung deines Drehbuchs. Logline, Pitch, Aktstruktur – je detaillierter, desto besser..."
                    : "Beschreibe die Handlung deines Romans. Je detaillierter, desto besser das Ergebnis..."}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={8}
                />
                <p className="text-xs text-muted-foreground">
                  Mindestens 200 Wörter empfohlen für beste Ergebnisse
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="characters">{isScreenplay ? "Figuren" : "Charaktere"}</Label>
                <Textarea
                  id="characters"
                  placeholder={`Beschreibe deine ${isScreenplay ? "Hauptfiguren" : "Hauptcharaktere"}:\n\nName: Max Müller\nAlter: 35\nRolle: Protagonist\n${isScreenplay ? "Voice: trocken, ironisch, Hamburger Slang" : "Charakterzüge: stur, loyal, humorvoll"}\nHintergrund: ...`}
                  value={characters}
                  onChange={(e) => setCharacters(e.target.value)}
                  rows={8}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="outline">{isScreenplay ? "Szenen-Liste (optional)" : "Outline (optional)"}</Label>
                <Textarea
                  id="outline"
                  placeholder={isScreenplay
                    ? "Szene 1: INNEN. KÜCHE - TAG. Sarah konfrontiert ihren Vater...\nSzene 2: AUSSEN. PARKHAUS - NACHT. Verfolgungsjagd...\n\nOder lass die KI eine Szenen-Struktur erstellen."
                    : "Kapitelüberschriften und kurze Beschreibungen – oder lass die KI eine erstellen..."}
                  value={outline}
                  onChange={(e) => setOutline(e.target.value)}
                  rows={6}
                />
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="h-4 w-4" />
                  Zurück
                </Button>
                <Button onClick={handleCreate} disabled={loading || !summary}>
                  {loading ? "Wird erstellt..." : "Projekt erstellen"}
                  <Sparkles className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
