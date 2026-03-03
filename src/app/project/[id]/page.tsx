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
  AlertTriangle, Type, Wand2, Plus, Receipt, Zap,
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
  location?: string;
  key_events?: string;
  raw_notes?: string;
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
  const [editingCharacters, setEditingCharacters] = useState(false);
  const [charactersText, setCharactersText] = useState("");
  const [savingCharacters, setSavingCharacters] = useState(false);

  const [styleSample, setStyleSample] = useState("");
  const [styleInputMode, setStyleInputMode] = useState<"sample" | "direct" | "upload">("sample");
  const [analyzingStyle, setAnalyzingStyle] = useState(false);
  const [generatingOutline, setGeneratingOutline] = useState(false);
  const [outlineInputMode, setOutlineInputMode] = useState<"generate" | "paste">("generate");
  const [pastedOutline, setPastedOutline] = useState("");
  const [generatingChapter, setGeneratingChapter] = useState<number | null>(null);
  const [editingChapter, setEditingChapter] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [expandedChapter, setExpandedChapter] = useState<number | null>(null);
  const [savingChapter, setSavingChapter] = useState(false);

  const [editingOutline, setEditingOutline] = useState<number | null>(null);
  const [outlineEditData, setOutlineEditData] = useState<{ title: string; purpose: string; character_arc: string; tension_level: number }>({ title: "", purpose: "", character_arc: "", tension_level: 5 });
  const [savingOutline, setSavingOutline] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [showAddOutline, setShowAddOutline] = useState(false);
  const [newOutlineData, setNewOutlineData] = useState({ title: "", purpose: "", character_arc: "", tension_level: 5 });
  const [expandedOutline, setExpandedOutline] = useState<number | null>(null);

  const [generationLogs, setGenerationLogs] = useState<any[]>([]);
  const [logTotals, setLogTotals] = useState<{ total_tokens: string; total_cost: string } | null>(null);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const loadLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/log`);
      const data = await res.json();
      if (res.ok) {
        setGenerationLogs(data.logs || []);
        setLogTotals(data.totals || null);
      }
    } finally {
      setLoadingLogs(false);
    }
  }, [projectId]);

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
    setCharactersText(data.project.characters || "");
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
        body: outlineInputMode === "paste" ? JSON.stringify({ custom_outline: pastedOutline }) : undefined,
      });
      const data = await res.json();
      if (res.ok) {
        setOutlines(data.outlines);
        setChapters([]);
        setActiveTab("outline");
        setOutlineInputMode("generate");
        setPastedOutline("");
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

  async function saveCharacters() {
    setSavingCharacters(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characters: charactersText }),
      });
      if (res.ok) {
        setProject((prev) => prev ? { ...prev, characters: charactersText } : null);
        setEditingCharacters(false);
      }
    } finally {
      setSavingCharacters(false);
    }
  }

  async function splitCharacters() {
    setSavingCharacters(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/characters/split`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characters: charactersText }),
      });
      const data = await res.json();
      if (res.ok) {
        setCharactersText(data.characters);
        setProject((prev) => prev ? { ...prev, characters: data.characters } : null);
      }
    } finally {
      setSavingCharacters(false);
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

  async function addOutlineItem() {
    setSavingOutline(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/outline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newOutlineData, chapter_number: outlines.length + 1 }),
      });
      const data = await res.json();
      if (res.ok) {
        setOutlines([...outlines, data.outline]);
        setShowAddOutline(false);
        setNewOutlineData({ title: "", purpose: "", character_arc: "", tension_level: 5 });
      }
    } finally {
      setSavingOutline(false);
    }
  }

  async function deleteOutlineItem(outlineId: number) {
    if (!confirm("Diesen Outline-Punkt wirklich löschen?")) return;
    const res = await fetch(`/api/projects/${projectId}/outline/${outlineId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setOutlines(outlines.filter((o) => o.id !== outlineId));
    }
  }

  async function deleteChapter(chapterId: number) {
    if (!confirm("Dieses Kapitel unwiderruflich löschen?")) return;
    const res = await fetch(`/api/projects/${projectId}/chapters/${chapterId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setChapters(chapters.filter((c) => c.id !== chapterId));
    }
  }

  async function deleteStyle() {
    if (!confirm("Stil-Analyse wirklich löschen?")) return;
    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ style_json: null, style_sample: "" }),
    });
    if (res.ok) {
      setProject((prev) => prev ? { ...prev, style_json: null, style_sample: "" } : null);
      setStyleSample("");
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
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); if (v === "log") loadLogs(); }}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Übersicht</TabsTrigger>
            <TabsTrigger value="style">Stil-Engine</TabsTrigger>
            <TabsTrigger value="outline">Outline ({outlines.length})</TabsTrigger>
            <TabsTrigger value="chapters">Kapitel ({chapters.length})</TabsTrigger>
            <TabsTrigger value="log">
              <Receipt className="h-3.5 w-3.5 mr-1" />
              KI-Log
            </TabsTrigger>
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
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg">Charaktere</CardTitle>
                  <div className="flex gap-2">
                    {!editingCharacters ? (
                      <Button variant="ghost" size="sm" onClick={() => setEditingCharacters(true)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    ) : (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={splitCharacters} title="Charaktere in Blöcke unterteilen" disabled={savingCharacters}>
                          <Wand2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => { setEditingCharacters(false); setCharactersText(project?.characters || ""); }} disabled={savingCharacters}>
                          <X className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={saveCharacters} disabled={savingCharacters}>
                          <Save className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {editingCharacters ? (
                    <Textarea
                      value={charactersText}
                      onChange={(e) => setCharactersText(e.target.value)}
                      rows={10}
                      className="text-sm"
                      placeholder="Beschreibe deine Charaktere hier..."
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {project.characters || "Keine Charaktere definiert"}
                    </p>
                  )}
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
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-lg">Stil-Analyse</CardTitle>
                  {project.style_json && (
                    <Button variant="ghost" size="sm" onClick={deleteStyle} className="text-destructive hover:text-destructive">
                      <X className="h-4 w-4" />
                    </Button>
                  )}
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
                  {outlines.length > 0 && (
                    <div className="flex bg-muted rounded-lg p-1 mr-2">
                      <Button
                        variant={outlineInputMode === "generate" ? "secondary" : "ghost"}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setOutlineInputMode("generate")}
                      >
                        KI-Modus
                      </Button>
                      <Button
                        variant={outlineInputMode === "paste" ? "secondary" : "ghost"}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setOutlineInputMode("paste")}
                      >
                        Manuell
                      </Button>
                    </div>
                  )}

                  {outlineInputMode === "paste" ? (
                    <div className="flex items-center gap-2">
                      <Textarea
                        placeholder="Kapitel 1: Titel...&#10;Kapitel 2: Titel..."
                        className="h-9 min-h-[36px] py-1 text-xs w-64"
                        value={pastedOutline}
                        onChange={(e) => setPastedOutline(e.target.value)}
                      />
                      <Button onClick={generateOutline} disabled={generatingOutline || !pastedOutline.trim()} size="sm">
                        {generatingOutline ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Übernehmen
                      </Button>
                    </div>
                  ) : showRegenerateConfirm ? (
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
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <Button onClick={() => setShowAddOutline(true)} variant="outline" size="sm">
                          <Plus className="h-4 w-4 mr-1" /> Punkt hinzufügen
                        </Button>
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
                      </div>
                    </div>
                  )}
                </div>

                {showAddOutline && (
                  <Card className="p-4 border-primary/30 bg-primary/5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold">Neuen Outline-Punkt hinzufügen</span>
                      <Button size="sm" variant="ghost" onClick={() => setShowAddOutline(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid gap-3">
                      <Input
                        placeholder="Kapitel-Titel"
                        value={newOutlineData.title}
                        onChange={(e) => setNewOutlineData({ ...newOutlineData, title: e.target.value })}
                      />
                      <Textarea
                        placeholder="Zweck des Kapitels"
                        value={newOutlineData.purpose}
                        onChange={(e) => setNewOutlineData({ ...newOutlineData, purpose: e.target.value })}
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button className="flex-1" onClick={addOutlineItem} disabled={savingOutline || !newOutlineData.title}>
                          Hinzufügen
                        </Button>
                        <Button variant="outline" onClick={() => setShowAddOutline(false)}>
                          Abbrechen
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}
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
                          <>
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
                            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedOutline(expandedOutline === o.id ? null : o.id)}>
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold truncate">{o.title}</h4>
                                {o.location && (
                                  <Badge variant="outline" className="text-xs shrink-0 hidden sm:inline-flex">
                                    {o.location.split(",")[0]}
                                  </Badge>
                                )}
                              </div>
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
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => deleteOutlineItem(o.id)}
                              >
                                <X className="h-3 w-3" />
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
                          {expandedOutline === o.id && (
                            <div className="border-t px-4 py-3 space-y-3 bg-muted/20">
                              {o.location && (
                                <div>
                                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ort & Zeit</span>
                                  <p className="text-sm mt-0.5">{o.location}</p>
                                </div>
                              )}
                              {o.key_events && (
                                <div>
                                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Schlüsselereignisse</span>
                                  <p className="text-sm mt-0.5">{o.key_events}</p>
                                </div>
                              )}
                              {o.raw_notes && (
                                <div>
                                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Original-Notizen</span>
                                  <p className="text-sm mt-0.5 whitespace-pre-wrap leading-relaxed text-muted-foreground border-l-2 border-primary/30 pl-3">
                                    {o.raw_notes}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                          </>
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
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteChapter(ch.id);
                          }}
                        >
                          <X className="h-3 w-3" />
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

          <TabsContent value="log">
            <div className="space-y-4">
              {logTotals && (
                <div className="grid grid-cols-3 gap-4">
                  <Card className="p-4 text-center">
                    <div className="text-2xl font-bold text-primary">{parseInt(logTotals.total_tokens || "0").toLocaleString("de-DE")}</div>
                    <div className="text-xs text-muted-foreground mt-1">Tokens gesamt</div>
                  </Card>
                  <Card className="p-4 text-center">
                    <div className="text-2xl font-bold text-primary">${parseFloat(logTotals.total_cost || "0").toFixed(4)}</div>
                    <div className="text-xs text-muted-foreground mt-1">Geschätzte Kosten (USD)</div>
                  </Card>
                  <Card className="p-4 text-center">
                    <div className="text-2xl font-bold text-primary">{generationLogs.length}</div>
                    <div className="text-xs text-muted-foreground mt-1">Generierungen</div>
                  </Card>
                </div>
              )}

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    Generierungs-Log
                  </CardTitle>
                  <Button size="sm" variant="outline" onClick={loadLogs} disabled={loadingLogs}>
                    <RefreshCw className={`h-3.5 w-3.5 ${loadingLogs ? "animate-spin" : ""}`} />
                    Aktualisieren
                  </Button>
                </CardHeader>
                <CardContent>
                  {loadingLogs ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">Lade Logs...</div>
                  ) : generationLogs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      Noch keine KI-Generierungen in diesem Projekt.
                      <br />Starte mit der Stil-Analyse oder Outline-Generierung.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground text-xs">
                            <th className="pb-2 pr-4">Zeitpunkt</th>
                            <th className="pb-2 pr-4">Aktion</th>
                            <th className="pb-2 pr-4">Details</th>
                            <th className="pb-2 pr-4">Modell</th>
                            <th className="pb-2 pr-4 text-right">Tokens</th>
                            <th className="pb-2 text-right">Kosten (USD)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {generationLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                              <td className="py-2.5 pr-4 text-xs text-muted-foreground whitespace-nowrap">
                                {new Date(log.created_at).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                              </td>
                              <td className="py-2.5 pr-4 font-medium">{log.action}</td>
                              <td className="py-2.5 pr-4 text-muted-foreground text-xs max-w-[180px] truncate">{log.details || "–"}</td>
                              <td className="py-2.5 pr-4">
                                <Badge variant="secondary" className="text-xs font-mono truncate max-w-[140px]">
                                  {log.model?.split("/")[1] || log.model}
                                </Badge>
                              </td>
                              <td className="py-2.5 pr-4 text-right tabular-nums">{parseInt(log.total_tokens || 0).toLocaleString("de-DE")}</td>
                              <td className="py-2.5 text-right tabular-nums text-primary font-medium">
                                ${parseFloat(log.estimated_cost_usd || 0).toFixed(5)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              <p className="text-xs text-muted-foreground text-center">
                Hinweis: Kosten sind Schätzwerte basierend auf hinterlegten Preistabellen. Abweichungen zum tatsächlichen OpenRouter-Guthaben sind möglich.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
