"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel,
} from "@/components/ui/select";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  BookOpen, ArrowLeft, Sparkles, Layers, PenTool, Download,
  RefreshCw, Check, AlertCircle, ChevronDown, ChevronUp, Save,
  Upload, FileText, ClipboardPaste, ArrowUp, ArrowDown, Pencil, X,
  AlertTriangle, Type, Wand2,
} from "lucide-react";

interface Project {
  id: number;
  title: string;
  genre: string;
  language: string;
  target_word_count: number;
  summary: string;
  characters: string;
  outline: string;
  style_sample: string;
  style_json: any;
  ai_provider: string;
  status: string;
}

interface Chapter {
  id: number;
  chapter_number: number;
  title: string;
  content: string;
  word_count: number;
  status: string;
}

interface ChapterOutline {
  id: number;
  chapter_number: number;
  title: string;
  purpose: string;
  character_arc: string;
  tension_level: number;
}

interface Model {
  id: string;
  name: string;
  provider: string;
  description: string;
}

export default function ProjectPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id;

  const [project, setProject] = useState<Project | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [outlines, setOutlines] = useState<ChapterOutline[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const [styleSample, setStyleSample] = useState("");
  const [styleInputMode, setStyleInputMode] = useState<"sample" | "direct" | "upload">("sample");
  const [analyzingStyle, setAnalyzingStyle] = useState(false);
  const [generatingOutline, setGeneratingOutline] = useState(false);
  const [generatingChapter, setGeneratingChapter] = useState<number | null>(null);
  const [editingChapter, setEditingChapter] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [expandedChapter, setExpandedChapter] = useState<number | null>(null);
  const [savingChapter, setSavingChapter] = useState(false);

  const [editingOutline, setEditingOutline] = useState<number | null>(null);
  const [outlineEditData, setOutlineEditData] = useState<{ title: string; purpose: string; character_arc: string; tension_level: number }>({ title: "", purpose: "", character_arc: "", tension_level: 5 });
  const [savingOutline, setSavingOutline] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);

  const loadProject = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}`);
    const data = await res.json();
    if (data.error) {
      router.push("/dashboard");
      return;
    }
    setProject(data.project);
    setChapters(data.chapters || []);
    setOutlines(data.outlines || []);
    setStyleSample(data.project.style_sample || "");
    setLoading(false);
  }, [projectId, router]);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => {
      if (d.error) router.push("/");
    });
    fetch("/api/models").then((r) => r.json()).then((d) => setModels(d.models || []));
    loadProject();
  }, [router, loadProject]);

  const groupedModels = models.reduce((acc, m) => {
    if (!acc[m.provider]) acc[m.provider] = [];
    acc[m.provider].push(m);
    return acc;
  }, {} as Record<string, Model[]>);

  async function analyzeStyle() {
    if (!styleSample.trim()) return;
    setAnalyzingStyle(true);
    try {
      const mode = styleInputMode === "direct" ? "direct" : "analyze";
      const res = await fetch(`/api/projects/${projectId}/style/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style_sample: styleSample, mode }),
      });
      const data = await res.json();
      if (res.ok) {
        setProject((prev) => prev ? { ...prev, style_json: data.style, style_sample: styleSample } : null);
      } else {
        alert(data.error || "Stil-Analyse fehlgeschlagen");
      }
    } finally {
      setAnalyzingStyle(false);
    }
  }

  async function generateOutline() {
    if (chapters.length > 0 && !showRegenerateConfirm) {
      setShowRegenerateConfirm(true);
      return;
    }
    setShowRegenerateConfirm(false);
    setGeneratingOutline(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/outline/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok) {
        setOutlines(data.outlines);
        setChapters([]);
        setActiveTab("outline");
      } else {
        alert(data.error || "Outline-Generierung fehlgeschlagen");
      }
    } finally {
      setGeneratingOutline(false);
    }
  }

  async function generateChapter(chapterNumber: number) {
    setGeneratingChapter(chapterNumber);
    try {
      const res = await fetch(`/api/projects/${projectId}/chapters/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapter_number: chapterNumber }),
      });
      const data = await res.json();
      if (res.ok) {
        setChapters((prev) => {
          const existing = prev.findIndex((c) => c.chapter_number === chapterNumber);
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = data.chapter;
            return updated;
          }
          return [...prev, data.chapter].sort((a, b) => a.chapter_number - b.chapter_number);
        });
        setActiveTab("chapters");
        setExpandedChapter(chapterNumber);
      } else {
        alert(data.error || "Kapitel-Generierung fehlgeschlagen");
      }
    } finally {
      setGeneratingChapter(null);
    }
  }

  async function saveChapterEdit(chapterId: number) {
    setSavingChapter(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/chapters/${chapterId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent }),
      });
      const data = await res.json();
      if (res.ok) {
        setChapters((prev) =>
          prev.map((c) => (c.id === chapterId ? data.chapter : c))
        );
        setEditingChapter(null);
      }
    } finally {
      setSavingChapter(false);
    }
  }

  async function updateModel(modelId: string) {
    await fetch(`/api/projects/${projectId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ai_provider: modelId }),
    });
    setProject((prev) => prev ? { ...prev, ai_provider: modelId } : null);
  }

  function handleExport(format: string) {
    window.open(`/api/projects/${projectId}/export?format=${format}`, "_blank");
  }

  async function saveOutlineEdit(outlineId: number) {
    setSavingOutline(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/outline/${outlineId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(outlineEditData),
      });
      const data = await res.json();
      if (res.ok) {
        setOutlines((prev) =>
          prev.map((o) => (o.id === outlineId ? data.outline : o))
        );
        setEditingOutline(null);
      }
    } finally {
      setSavingOutline(false);
    }
  }

  async function moveOutline(index: number, direction: "up" | "down") {
    const newOutlines = [...outlines];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newOutlines.length) return;

    [newOutlines[index], newOutlines[swapIndex]] = [newOutlines[swapIndex], newOutlines[index]];

    const orderedIds = newOutlines.map((o) => o.id);
    const res = await fetch(`/api/projects/${projectId}/outline/reorder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds }),
    });
    const data = await res.json();
    if (res.ok) {
      setOutlines(data.outlines);
    }
  }

  if (loading || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Laden...</div>
      </div>
    );
  }

  const totalWords = chapters.reduce((sum, c) => sum + (c.word_count || 0), 0);
  const progress = Math.min(100, (totalWords / project.target_word_count) * 100);

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/60 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container flex h-16 items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate">{project.title}</h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {project.genre && <Badge variant="secondary" className="text-xs">{project.genre}</Badge>}
              <span>{totalWords.toLocaleString("de-DE")} / {project.target_word_count.toLocaleString("de-DE")} Wörter</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={project.ai_provider} onValueChange={updateModel}>
              <SelectTrigger className="w-[200px] h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(groupedModels).map(([provider, providerModels]) => (
                  <SelectGroup key={provider}>
                    <SelectLabel>{provider}</SelectLabel>
                    {providerModels.map((m) => (
                      <SelectItem key={m.id} value={m.id} className="text-xs">
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={() => handleExport("docx")}>
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
        <div className="container pb-2">
          <Progress value={progress} className="h-1.5" />
        </div>
      </header>

      <main className="container py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Übersicht</TabsTrigger>
            <TabsTrigger value="style">Stil-Engine</TabsTrigger>
            <TabsTrigger value="outline">Outline ({outlines.length})</TabsTrigger>
            <TabsTrigger value="chapters">Kapitel ({chapters.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {project.summary || "Keine Summary vorhanden"}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Charaktere</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {project.characters || "Keine Charaktere definiert"}
                  </p>
                </CardContent>
              </Card>
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg">Fortschritt</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-3xl font-bold text-primary">
                        {chapters.length}
                      </div>
                      <div className="text-sm text-muted-foreground">Kapitel</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-primary">
                        {totalWords.toLocaleString("de-DE")}
                      </div>
                      <div className="text-sm text-muted-foreground">Wörter</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-primary">
                        {Math.round(progress)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Fertig</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="style">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Stil-Eingabe
                  </CardTitle>
                  <CardDescription>
                    Wähle, wie du deinen Wunschstil definieren möchtest
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant={styleInputMode === "sample" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStyleInputMode("sample")}
                    >
                      <BookOpen className="h-4 w-4" />
                      Beispieltext
                    </Button>
                    <Button
                      variant={styleInputMode === "direct" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStyleInputMode("direct")}
                    >
                      <Type className="h-4 w-4" />
                      Eigene Stilbeschreibung
                    </Button>
                    <Button
                      variant={styleInputMode === "upload" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStyleInputMode("upload")}
                    >
                      <Upload className="h-4 w-4" />
                      Datei hochladen
                    </Button>
                  </div>

                  {styleInputMode === "sample" && (
                    <div className="space-y-2">
                      <Label>Beispieltext aus einem Buch</Label>
                      <p className="text-xs text-muted-foreground">
                        Kopiere 3–10 Seiten aus einem Buch, dessen Schreibstil du übernehmen möchtest.
                        Die KI analysiert den Text und erstellt daraus ein Stil-Profil.
                      </p>
                      <Textarea
                        placeholder="Füge hier den Beispieltext ein, z.B. einige Seiten aus einem Roman..."
                        value={styleSample}
                        onChange={(e) => setStyleSample(e.target.value)}
                        rows={15}
                      />
                    </div>
                  )}

                  {styleInputMode === "direct" && (
                    <div className="space-y-2">
                      <Label>Fertige Stilbeschreibung</Label>
                      <p className="text-xs text-muted-foreground">
                        Beschreibe den gewünschten Stil direkt in eigenen Worten.
                        Diese Beschreibung wird ohne KI-Analyse als Stil-Vorgabe übernommen.
                      </p>
                      <Textarea
                        placeholder={"Zum Beispiel:\nKurze, prägnante Sätze. Viel Dialog. Schnelles Tempo.\nInnere Monologe des Protagonisten. Düsterer Ton.\nVergangenheitsform. Detailreiche Actionszenen.\nMetaphern sparsam einsetzen. Erzähler in dritter Person."}
                        value={styleSample}
                        onChange={(e) => setStyleSample(e.target.value)}
                        rows={15}
                      />
                    </div>
                  )}

                  {styleInputMode === "upload" && (
                    <div className="space-y-3">
                      <Label>Datei hochladen (.txt, .md)</Label>
                      <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
                        <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                        <p className="text-sm text-muted-foreground mb-3">
                          Ziehe eine Textdatei hierher oder klicke zum Auswählen
                        </p>
                        <input
                          type="file"
                          accept=".txt,.md,.text"
                          className="hidden"
                          id="style-file-upload"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const text = await file.text();
                            setStyleSample(text);
                            setStyleInputMode("sample");
                          }}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById("style-file-upload")?.click()}
                        >
                          <FileText className="h-4 w-4" />
                          Datei wählen
                        </Button>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={analyzeStyle}
                    disabled={analyzingStyle || !styleSample.trim()}
                    className="w-full"
                  >
                    {analyzingStyle ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        {styleInputMode === "direct" ? "Übernehme Stil..." : "Analysiere Stil..."}
                      </>
                    ) : styleInputMode === "direct" ? (
                      <>
                        <Check className="h-4 w-4" />
                        Stil übernehmen
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4" />
                        Stil analysieren lassen
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Stil-Analyse</CardTitle>
                  <CardDescription>
                    {project.style_json
                      ? project.style_json.source === "direct_input"
                        ? "Benutzerdefinierter Stil"
                        : "Erkannter Stil"
                      : "Noch keine Analyse durchgeführt"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {project.style_json ? (
                    <div className="space-y-3">
                      {project.style_json.source === "direct_input" ? (
                        <div className="space-y-3">
                          <Badge variant="default">Benutzerdefiniert</Badge>
                          <div className="bg-muted/50 rounded-lg p-4">
                            <p className="text-sm whitespace-pre-wrap">{project.style_json.raw_description}</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          {project.style_json.author_style && (
                            <div className="flex items-center gap-2">
                              <Badge variant="default">{project.style_json.author_style}</Badge>
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            {project.style_json.vocabulary_complexity !== undefined && (
                              <div>
                                <span className="text-muted-foreground">Vokabular:</span>
                                <div className="mt-1">
                                  <Progress value={project.style_json.vocabulary_complexity * 10} className="h-2" />
                                  <span className="text-xs">{project.style_json.vocabulary_complexity}/10</span>
                                </div>
                              </div>
                            )}
                            {project.style_json.description_density !== undefined && (
                              <div>
                                <span className="text-muted-foreground">Beschreibungsdichte:</span>
                                <div className="mt-1">
                                  <Progress value={project.style_json.description_density * 10} className="h-2" />
                                  <span className="text-xs">{project.style_json.description_density}/10</span>
                                </div>
                              </div>
                            )}
                            {project.style_json.dialogue_ratio_percent !== undefined && (
                              <div>
                                <span className="text-muted-foreground">Dialoganteil:</span>
                                <span className="ml-2 font-medium">{project.style_json.dialogue_ratio_percent}%</span>
                              </div>
                            )}
                            {project.style_json.pacing && (
                              <div>
                                <span className="text-muted-foreground">Tempo:</span>
                                <span className="ml-2 font-medium">{project.style_json.pacing}</span>
                              </div>
                            )}
                            {project.style_json.tense && (
                              <div>
                                <span className="text-muted-foreground">Tempus:</span>
                                <span className="ml-2 font-medium">{project.style_json.tense}</span>
                              </div>
                            )}
                            {project.style_json.tone && (
                              <div>
                                <span className="text-muted-foreground">Ton:</span>
                                <span className="ml-2 font-medium">{project.style_json.tone}</span>
                              </div>
                            )}
                          </div>
                          {project.style_json.favorite_literary_devices && (
                            <div>
                              <span className="text-sm text-muted-foreground">Stilmittel:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {project.style_json.favorite_literary_devices.map((d: string, i: number) => (
                                  <Badge key={i} variant="outline" className="text-xs">{d}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>Lade Beispieltext hoch und klicke auf "Stil analysieren"</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="outline">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Kapitel-Struktur</h3>
                  <p className="text-sm text-muted-foreground">
                    {outlines.length > 0
                      ? `${outlines.length} Kapitel geplant`
                      : "Generiere eine Kapitel-Struktur basierend auf deiner Summary"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {showRegenerateConfirm ? (
                    <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <span className="text-sm text-destructive">
                        {chapters.length} Kapitel werden gelöscht!
                      </span>
                      <Button size="sm" variant="destructive" onClick={generateOutline} disabled={generatingOutline}>
                        Trotzdem neu generieren
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setShowRegenerateConfirm(false)}>
                        Abbrechen
                      </Button>
                    </div>
                  ) : (
                    <Button onClick={generateOutline} disabled={generatingOutline}>
                      {generatingOutline ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Generiere...
                        </>
                      ) : (
                        <>
                          <Layers className="h-4 w-4" />
                          {outlines.length > 0 ? "Neu generieren" : "Outline generieren"}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>

              {outlines.length > 0 && (
                <div className="space-y-3">
                  {outlines.map((o, index) => {
                    const chapter = chapters.find((c) => c.chapter_number === o.chapter_number);
                    const isEditing = editingOutline === o.id;

                    return (
                      <Card key={o.id} className="overflow-hidden">
                        {isEditing ? (
                          <div className="p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-primary">Kapitel {o.chapter_number} bearbeiten</span>
                              <Button size="sm" variant="ghost" onClick={() => setEditingOutline(null)}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs">Titel</Label>
                              <Input
                                value={outlineEditData.title}
                                onChange={(e) => setOutlineEditData({ ...outlineEditData, title: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs">Zweck</Label>
                              <Textarea
                                value={outlineEditData.purpose}
                                onChange={(e) => setOutlineEditData({ ...outlineEditData, purpose: e.target.value })}
                                rows={2}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs">Charakter-Entwicklung</Label>
                              <Textarea
                                value={outlineEditData.character_arc}
                                onChange={(e) => setOutlineEditData({ ...outlineEditData, character_arc: e.target.value })}
                                rows={2}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs">Spannungslevel (1-10)</Label>
                              <Input
                                type="number"
                                min={1}
                                max={10}
                                value={outlineEditData.tension_level}
                                onChange={(e) => setOutlineEditData({ ...outlineEditData, tension_level: parseInt(e.target.value) || 5 })}
                              />
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => setEditingOutline(null)}>
                                Abbrechen
                              </Button>
                              <Button size="sm" onClick={() => saveOutlineEdit(o.id)} disabled={savingOutline}>
                                <Save className="h-3 w-3" />
                                {savingOutline ? "Speichern..." : "Speichern"}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-4 p-4">
                            <div className="flex flex-col gap-1 shrink-0">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                disabled={index === 0}
                                onClick={() => moveOutline(index, "up")}
                              >
                                <ArrowUp className="h-3 w-3" />
                              </Button>
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-sm">
                                {o.chapter_number}
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                disabled={index === outlines.length - 1}
                                onClick={() => moveOutline(index, "down")}
                              >
                                <ArrowDown className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold truncate">{o.title}</h4>
                              <p className="text-sm text-muted-foreground truncate">{o.purpose}</p>
                              {o.character_arc && (
                                <p className="text-xs text-muted-foreground/70 truncate mt-0.5">{o.character_arc}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="w-16">
                                <div className="text-xs text-muted-foreground text-center mb-0.5">
                                  Spannung
                                </div>
                                <Progress value={o.tension_level * 10} className="h-1.5" />
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingOutline(o.id);
                                  setOutlineEditData({
                                    title: o.title,
                                    purpose: o.purpose,
                                    character_arc: o.character_arc || "",
                                    tension_level: o.tension_level,
                                  });
                                }}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              {chapter ? (
                                <Badge variant="success" className="text-xs">
                                  <Check className="h-3 w-3 mr-1" />
                                  {chapter.word_count} W.
                                </Badge>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => generateChapter(o.chapter_number)}
                                  disabled={generatingChapter !== null}
                                >
                                  {generatingChapter === o.chapter_number ? (
                                    <RefreshCw className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <PenTool className="h-3 w-3" />
                                  )}
                                  Schreiben
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </Card>
                    );
                  })}

                  <Card className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Alle Kapitel generieren</span>
                      <Button
                        onClick={async () => {
                          for (const o of outlines) {
                            const ch = chapters.find((c) => c.chapter_number === o.chapter_number);
                            if (!ch) {
                              await generateChapter(o.chapter_number);
                            }
                          }
                        }}
                        disabled={generatingChapter !== null}
                      >
                        <Sparkles className="h-4 w-4" />
                        Alle generieren
                      </Button>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="chapters">
            <div className="space-y-4">
              {chapters.length === 0 ? (
                <Card className="text-center py-12">
                  <CardContent>
                    <PenTool className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <h3 className="text-lg font-semibold mb-2">Noch keine Kapitel</h3>
                    <p className="text-muted-foreground mb-4">
                      Erstelle zuerst eine Outline und generiere dann die Kapitel.
                    </p>
                    <Button onClick={() => setActiveTab("outline")}>
                      <Layers className="h-4 w-4" />
                      Zur Outline
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                chapters.map((ch) => (
                  <Card key={ch.id} className="overflow-hidden">
                    <div
                      className="flex items-center gap-4 p-4 cursor-pointer"
                      onClick={() =>
                        setExpandedChapter(expandedChapter === ch.chapter_number ? null : ch.chapter_number)
                      }
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-sm shrink-0">
                        {ch.chapter_number}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate">{ch.title}</h4>
                        <span className="text-xs text-muted-foreground">{ch.word_count} Wörter</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            generateChapter(ch.chapter_number);
                          }}
                          disabled={generatingChapter !== null}
                        >
                          {generatingChapter === ch.chapter_number ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3 w-3" />
                          )}
                          Neu
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (editingChapter === ch.id) {
                              setEditingChapter(null);
                            } else {
                              setEditingChapter(ch.id);
                              setEditContent(ch.content || "");
                            }
                          }}
                        >
                          <PenTool className="h-3 w-3" />
                        </Button>
                        {expandedChapter === ch.chapter_number ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    {expandedChapter === ch.chapter_number && (
                      <div className="border-t px-4 py-4">
                        {editingChapter === ch.id ? (
                          <div className="space-y-3">
                            <Textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              rows={20}
                              className="font-mono text-sm"
                            />
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">
                                {editContent.trim().split(/\s+/).length} Wörter
                              </span>
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => setEditingChapter(null)}>
                                  Abbrechen
                                </Button>
                                <Button size="sm" onClick={() => saveChapterEdit(ch.id)} disabled={savingChapter}>
                                  <Save className="h-3 w-3" />
                                  {savingChapter ? "Speichern..." : "Speichern"}
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <div className="whitespace-pre-wrap text-sm leading-relaxed">
                              {ch.content || "Kein Inhalt"}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                ))
              )}

              {chapters.length > 0 && (
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Export</span>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleExport("docx")}>
                        <Download className="h-3 w-3" />
                        Word (DOCX)
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleExport("markdown")}>
                        Markdown
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleExport("txt")}>
                        TXT
                      </Button>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
