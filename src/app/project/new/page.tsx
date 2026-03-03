"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel,
} from "@/components/ui/select";
import { BookOpen, ArrowLeft, ArrowRight, Sparkles } from "lucide-react";

interface Model {
  id: string;
  name: string;
  provider: string;
  description: string;
}

export default function NewProjectPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState<Model[]>([]);

  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [targetWordCount, setTargetWordCount] = useState("80000");
  const [language, setLanguage] = useState("Deutsch");
  const [aiProvider, setAiProvider] = useState("anthropic/claude-sonnet-4-5");

  const [summary, setSummary] = useState("");
  const [characters, setCharacters] = useState("");
  const [outline, setOutline] = useState("");

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => {
      if (d.error) router.push("/");
    });
    fetch("/api/models").then((r) => r.json()).then((d) => {
      setModels(d.models || []);
    });
  }, [router]);

  const groupedModels = models.reduce((acc, m) => {
    if (!acc[m.provider]) acc[m.provider] = [];
    acc[m.provider].push(m);
    return acc;
  }, {} as Record<string, Model[]>);

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
          ai_provider: aiProvider,
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

  const genres = [
    "Fantasy", "Dark Fantasy", "Science Fiction", "Thriller", "Krimi",
    "Romance", "Horror", "Historischer Roman", "Literarische Fiktion",
    "Young Adult", "Dystopie", "Urban Fantasy", "Erotik", "Abenteuer",
  ];

  const languages = ["Deutsch", "English", "Español", "Français", "Italiano", "Português"];

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
          <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
            Schritt {step} von 2
          </div>
        </div>
      </header>

      <main className="container max-w-2xl py-8">
        {step === 1 && (
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle>Projekt-Details</CardTitle>
              <CardDescription>
                Grundlegende Informationen zu deinem Roman
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="title">Titel *</Label>
                <Input
                  id="title"
                  placeholder="Der Titel deines Romans"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
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
                <div>
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

              <div>
                <Label htmlFor="wordcount">Ziel-Wortzahl</Label>
                <Input
                  id="wordcount"
                  type="number"
                  value={targetWordCount}
                  onChange={(e) => setTargetWordCount(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Standard: 80.000 Wörter (~320 Seiten)
                </p>
              </div>

              <div>
                <Label>KI-Modell (via OpenRouter)</Label>
                <Select value={aiProvider} onValueChange={setAiProvider}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(groupedModels).map(([provider, providerModels]) => (
                      <SelectGroup key={provider}>
                        <SelectLabel>{provider}</SelectLabel>
                        {providerModels.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name} – {m.description}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Wähle den KI-Anbieter und das Modell, das du nutzen möchtest
                </p>
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
              <CardTitle>Deine Assets</CardTitle>
              <CardDescription>
                Summary, Charaktere und optionale Outline – dein Startmaterial
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="summary">Summary *</Label>
                <Textarea
                  id="summary"
                  placeholder="Beschreibe die Handlung deines Romans. Je detaillierter, desto besser das Ergebnis..."
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={8}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Mindestens 200 Wörter empfohlen für beste Ergebnisse
                </p>
              </div>

              <div>
                <Label htmlFor="characters">Charaktere</Label>
                <Textarea
                  id="characters"
                  placeholder={`Beschreibe deine Hauptcharaktere:\n\nName: Max Müller\nAlter: 35\nRolle: Protagonist\nCharakterzüge: stur, loyal, humorvoll\nHintergrund: ...`}
                  value={characters}
                  onChange={(e) => setCharacters(e.target.value)}
                  rows={8}
                />
              </div>

              <div>
                <Label htmlFor="outline">Outline (optional)</Label>
                <Textarea
                  id="outline"
                  placeholder="Kapitelüberschriften und kurze Beschreibungen – oder lass die KI eine erstellen..."
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
