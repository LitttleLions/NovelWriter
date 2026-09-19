"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
  AlertTriangle, Type, Wand2, Plus, Receipt, Zap, Users, Copy, Settings2,
  Gauge, ListChecks, Clock3,
} from "lucide-react";
import { getTerms, formatWordcount } from "@/lib/terms";
import { SCREENPLAY_STYLE_PRESETS } from "@/lib/screenplay-presets";

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
  style_notes: string;
  ai_provider: string;
  status: string;
  updated_at?: string | null;
  project_type?: string;
  screenplay_format?: string;
  screenplay_style_preset?: string;
}

interface LatestAiActivity {
  action: string;
  details?: string | null;
  created_at?: string | null;
}
interface AiModel {
  id: string;
  name: string;
  provider: string;
  description: string;
}

interface Chapter {
  id: number;
  chapter_number: number;
  title: string;
  content: string;
  word_count: number;
  status: string;
  narrative_summary?: string;
  character_states?: any;
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
  structural_role?: string | null;
}

const STRUCTURAL_ROLE_STYLES: Record<string, string> = {
  "Cold Open": "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
  "Setup": "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
  "Inciting Incident": "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  "Rising Action": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  "Midpoint": "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30",
  "Crisis": "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
  "Climax": "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
  "Resolution": "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30",
  "Act Break": "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-500/30",
  "Tag": "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30",
};

interface ProjectCharacter {
  id: number;
  project_id: number;
  name: string;
  role?: string;
  description?: string;
  traits?: string;
  backstory?: string;
  appearance?: string;
  notes?: string;
  first_appears_chapter?: number;
}

export default function ProjectPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id;

  const [project, setProject] = useState<Project | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [outlines, setOutlines] = useState<ChapterOutline[]>([]);
  const [latestAiActivity, setLatestAiActivity] = useState<LatestAiActivity | null>(null);
  const [models, setModels] = useState<AiModel[]>([]);
  const [defaultModel, setDefaultModel] = useState("");
  const [savingModel, setSavingModel] = useState(false);
  const [modelError, setModelError] = useState("");
  const [modelFallback, setModelFallback] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [editingCharacters, setEditingCharacters] = useState(false);
  const [charactersText, setCharactersText] = useState("");
  const [savingCharacters, setSavingCharacters] = useState(false);

  const [styleSample, setStyleSample] = useState("");
  const [styleInputMode, setStyleInputMode] = useState<"sample" | "upload">("sample");
  const [styleNotes, setStyleNotes] = useState("");
  const [savingStyleNotes, setSavingStyleNotes] = useState(false);
  const [analyzingStyle, setAnalyzingStyle] = useState(false);
  const [editingStyle, setEditingStyle] = useState(false);
  const [styleEditData, setStyleEditData] = useState<any>({});
  const [showOriginalSample, setShowOriginalSample] = useState(false);
  const [savingStyle, setSavingStyle] = useState(false);
  const [generatingOutline, setGeneratingOutline] = useState(false);
  const [outlineInputMode, setOutlineInputMode] = useState<"generate" | "paste">("generate");
  const [pastedOutline, setPastedOutline] = useState("");
  const [generatingChapter, setGeneratingChapter] = useState<number | null>(null);
  const [editingChapter, setEditingChapter] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [expandedChapter, setExpandedChapter] = useState<number | null>(null);
  const [savingChapter, setSavingChapter] = useState(false);

  const [editingOutline, setEditingOutline] = useState<number | null>(null);
  const [outlineEditData, setOutlineEditData] = useState<{ 
    title: string; 
    purpose: string; 
    character_arc: string; 
    tension_level: number;
    location: string;
    key_events: string;
    raw_notes: string;
  }>({ title: "", purpose: "", character_arc: "", tension_level: 5, location: "", key_events: "", raw_notes: "" });
  const [savingOutline, setSavingOutline] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [showAddOutline, setShowAddOutline] = useState(false);
  const [newOutlineFreetext, setNewOutlineFreetext] = useState("");
  const [expandedOutline, setExpandedOutline] = useState<number | null>(null);

  const [projectCharacters, setProjectCharacters] = useState<ProjectCharacter[]>([]);
  const [extractingCharacters, setExtractingCharacters] = useState(false);
  const [addingCharacter, setAddingCharacter] = useState(false);
  const [newCharacterData, setNewCharacterData] = useState({ name: "", role: "", description: "", traits: "", backstory: "", appearance: "", notes: "", first_appears_chapter: 0 });
  const [editingCharacter, setEditingCharacter] = useState<number | null>(null);
  const [characterEditData, setCharacterEditData] = useState<any>({ first_appears_chapter: 0 });
  const [savingCharacter, setSavingCharacter] = useState(false);
  const [expandedCharacter, setExpandedCharacter] = useState<number | null>(null);
  const [outlineCharacterMap, setOutlineCharacterMap] = useState<Record<number, number[]>>({});

  const [editingNarrative, setEditingNarrative] = useState<number | null>(null);
  const [narrativeEditContent, setNarrativeEditContent] = useState("");

  const [narrativeSaveStatus, setNarrativeSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const updateNarrativeSummary = async (chapterId: number, summary: string) => {
    setNarrativeSaveStatus("saving");
    try {
      const res = await fetch(`/api/projects/${projectId}/chapters/${chapterId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ narrative_summary: summary }),
      });
      if (res.ok) {
        setChapters(chapters.map(c => c.id === chapterId ? { ...c, narrative_summary: summary } : c));
        setEditingNarrative(null);
        setNarrativeSaveStatus("saved");
        setTimeout(() => setNarrativeSaveStatus("idle"), 2000);
      } else {
        setNarrativeSaveStatus("error");
        setTimeout(() => setNarrativeSaveStatus("idle"), 3000);
      }
    } catch (e) {
      setNarrativeSaveStatus("error");
      setTimeout(() => setNarrativeSaveStatus("idle"), 3000);
    }
  };

  const [generationLogs, setGenerationLogs] = useState<any[]>([]);
  const [logTotals, setLogTotals] = useState<{ total_tokens: string; total_cost: string } | null>(null);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [includeSceneNumbers, setIncludeSceneNumbers] = useState(false);
  const [chapterExporting, setChapterExporting] = useState<number | null>(null);
  const [copiedChapterId, setCopiedChapterId] = useState<number | null>(null);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [bulkMode, setBulkMode] = useState(false);
  const [bulkTotal, setBulkTotal] = useState(0);
  const [bulkDone, setBulkDone] = useState(0);
  const [bulkCancelled, setBulkCancelled] = useState(false);
  const bulkCancelRef = useRef(false);
  const activeFetchAbortRef = useRef<AbortController | null>(null);

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
    const token = localStorage.getItem("rf_token");
    const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(`/api/projects/${projectId}`, { headers: authHeaders });
    const data = await res.json();
    if (data.error) {
      router.push("/dashboard");
      return;
    }
    setProject(data.project);
    setChapters(data.chapters || []);
    setOutlines(data.outlines || []);
    setLatestAiActivity(data.latestAiActivity || null);
    setCharactersText(data.project.characters || "");
    setStyleSample(data.project.style_sample || "");
    setStyleNotes(data.project.style_notes || "");
    const modelRes = await fetch("/api/models", { headers: authHeaders, cache: "no-store" });
    const modelData = await modelRes.json().catch(() => ({}));
    if (modelRes.ok) {
      const availableModels = modelData.models || [];
      setModels(availableModels);
      setDefaultModel(modelData.defaultModel || "");
      setModelFallback(
        Boolean(data.project.ai_provider) &&
        !availableModels.some((model: AiModel) => model.id === data.project.ai_provider),
      );
    } else {
      setModelError(modelData.error || "Die freigegebenen Modelle konnten nicht geladen werden.");
    }
    setLoading(false);
    // Load structured characters
    const charRes = await fetch(`/api/projects/${projectId}/characters`, { headers: authHeaders });
    const charData = await charRes.json();
    if (charRes.ok) setProjectCharacters(charData.characters || []);
  }, [projectId, router]);

  const outlineCharLoadedRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    if (outlines.length > 0 && projectCharacters.length > 0) {
      outlines.forEach(o => {
        if (!outlineCharLoadedRef.current.has(o.id)) {
          outlineCharLoadedRef.current.add(o.id);
          loadOutlineCharacters(o.id);
        }
      });
    }
  }, [outlines.length, projectCharacters.length]);

  useEffect(() => {
    const token = localStorage.getItem("rf_token");
    const authHeaders: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
    fetch("/api/auth/me", { headers: authHeaders }).then((r) => r.json()).then((d) => {
      if (d.error) router.push("/");
    });
    loadProject();
  }, [router, loadProject]);

  const isAiWorking = generatingOutline || generatingChapter !== null || analyzingStyle || savingOutline || extractingCharacters;

  useEffect(() => {
    if (isAiWorking) {
      setElapsedSeconds(0);
      timerRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isAiWorking]);

  function formatElapsed(sec: number) {
    if (sec < 60) return `${sec}s`;
    return `${Math.floor(sec / 60)}m ${sec % 60}s`;
  }

  function formatActivityDate(value?: string | null) {
    if (!value) return "Noch nicht erfasst";
    const date = new Date(String(value).replace(" ", "T"));
    if (Number.isNaN(date.getTime())) return "Noch nicht erfasst";
    return date.toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatGenerationAction(action?: string) {
    const labels: Record<string, string> = {
      style_analysis: "Stil-Analyse",
      outline_generation: "Outline-Generierung",
      chapter_generation: "Kapitel-Generierung",
      character_extraction: "Figuren-Extraktion",
      "Stil analysiert": "Stil-Analyse",
      "Outline generiert": "Outline-Generierung",
      "Outline-Punkte aus Freitext": "Outline aus Freitext",
      "Kapitel generiert": "Kapitel-Generierung",
      "Charaktere extrahiert": "Figuren-Extraktion",
      "Narrative Zusammenfassung": "Narrative Zusammenfassung",
    };
    return labels[action || ""] || action || "KI-Generierung";
  }

  function aiStatusLabel() {
    if (analyzingStyle) return "Stil wird analysiert …";
    if (generatingOutline) return `${terms.outlineLabel} wird generiert …`;
    if (savingOutline) return `${terms.chapters} werden strukturiert …`;
    if (extractingCharacters) return "Charaktere werden extrahiert …";
    if (generatingChapter !== null) {
      if (bulkMode) return `${terms.chapter} ${generatingChapter} wird geschrieben … (${bulkDone + 1} von ${bulkTotal})`;
      return `${terms.chapter} ${generatingChapter} wird geschrieben …`;
    }
    return "";
  }

  async function analyzeStyle() {
    if (!styleSample.trim()) return;
    setAnalyzingStyle(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/style/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style_sample: styleSample, mode: "analyze" }),
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
        console.error("Outline generation error:", data.error);
        alert(data.error || "Outline-Generierung fehlgeschlagen. Bitte prüfe die Konsole.");
      }
    } finally {
      setGeneratingOutline(false);
    }
  }

  async function generateChapter(chapterNumber: number, signal?: AbortSignal) {
    setGeneratingChapter(chapterNumber);
    try {
      const res = await fetch(`/api/projects/${projectId}/chapters/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapter_number: chapterNumber }),
        signal,
      });

      if (!res.ok || !res.body) {
        let errMsg = "Kapitel-Generierung fehlgeschlagen";
        try { errMsg = (await res.json()).error || errMsg; } catch {}
        alert(errMsg);
        return;
      }

      // Read the streaming response line-by-line (heartbeat pings keep connection alive)
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const msg = JSON.parse(trimmed);
            if (msg.type === "ping") continue;
            if (msg.type === "error") {
              alert(msg.error || "Kapitel-Generierung fehlgeschlagen");
              break outer;
            }
            if (msg.type === "done") {
              setActiveTab("chapters");
              setExpandedChapter(chapterNumber);
              await loadProject();
              break outer;
            }
          } catch {}
        }
      }
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      alert(`Netzwerkfehler: ${e?.message || "Unbekannt"}`);
    } finally {
      setGeneratingChapter(null);
    }
  }

  async function generateChapterSingle(chapterNumber: number) {
    const ctrl = new AbortController();
    activeFetchAbortRef.current = ctrl;
    try {
      await generateChapter(chapterNumber, ctrl.signal);
    } finally {
      activeFetchAbortRef.current = null;
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

  async function handleExport(format: string) {
    try {
      const params = new URLSearchParams({ format });
      if (includeSceneNumbers) params.set("includeSceneNumbers", "true");
      const res = await fetch(`/api/projects/${projectId}/export?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Export fehlgeschlagen");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext =
        format === "docx" ? "docx"
        : format === "markdown" ? "md"
        : format === "pdf" ? "pdf"
        : format === "fdx" ? "fdx"
        : "txt";
      a.download = `${project?.title || "roman"}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert("Export fehlgeschlagen");
    }
  }

  function chapterFilename(chapter: Chapter, extension: "md" | "docx") {
    const projectName = (project?.title || "roman")
      .replace(/[^a-zA-Z0-9äöüÄÖÜß _-]/g, "")
      .trim() || "roman";
    const chapterName = (chapter.title || `Kapitel ${chapter.chapter_number}`)
      .replace(/[^a-zA-Z0-9äöüÄÖÜß _-]/g, "")
      .trim() || `Kapitel ${chapter.chapter_number}`;
    return `${projectName} - ${chapter.chapter_number} ${chapterName}.${extension}`;
  }

  async function getChapterExport(chapter: Chapter, format: "markdown" | "docx") {
    const params = new URLSearchParams({
      format,
      chapterId: String(chapter.id),
    });
    if (includeSceneNumbers) params.set("includeSceneNumbers", "true");

    const res = await fetch(`/api/projects/${projectId}/export?${params.toString()}`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Kapitel-Export fehlgeschlagen");
    }
    return res;
  }

  async function copyChapterMarkdown(chapter: Chapter) {
    setChapterExporting(chapter.id);
    try {
      const res = await getChapterExport(chapter, "markdown");
      const markdown = await res.text();
      if (!navigator.clipboard?.writeText) {
        throw new Error("Die Zwischenablage ist in diesem Browser nicht verfügbar.");
      }
      await navigator.clipboard.writeText(markdown);
      setCopiedChapterId(chapter.id);
      window.setTimeout(() => {
        setCopiedChapterId((current) => current === chapter.id ? null : current);
      }, 2000);
    } catch (error: any) {
      alert(error?.message || "Markdown konnte nicht kopiert werden");
    } finally {
      setChapterExporting(null);
    }
  }

  async function downloadChapter(chapter: Chapter, format: "markdown" | "docx") {
    setChapterExporting(chapter.id);
    try {
      const res = await getChapterExport(chapter, format);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = chapterFilename(chapter, format === "markdown" ? "md" : "docx");
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      alert(error?.message || "Kapitel konnte nicht exportiert werden");
    } finally {
      setChapterExporting(null);
    }
  }

  async function updateModel(modelId: string) {
    setSavingModel(true);
    setModelError("");
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ai_provider: modelId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Das Projektmodell konnte nicht gespeichert werden.");
      setProject((prev) => prev ? { ...prev, ai_provider: data.project?.ai_provider || modelId } : null);
      setModelFallback(false);
    } catch (error: any) {
      setModelError(error?.message || "Das Projektmodell konnte nicht gespeichert werden.");
    } finally {
      setSavingModel(false);
    }
  }

  async function saveOutlineEdit(outlineId: number) {
    setSavingOutline(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/outline/${outlineId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(outlineEditData),
      });
      const text = await res.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        alert(`Server-Antwort konnte nicht gelesen werden (HTTP ${res.status}).`);
        return;
      }
      if (res.ok && data.outline) {
        setOutlines((prev) =>
          prev.map((o) => (o.id === outlineId ? data.outline : o))
        );
        setEditingOutline(null);
      } else {
        alert(data.error || `Fehler ${res.status} beim Speichern.`);
      }
    } catch (e: any) {
      alert(`Netzwerkfehler: ${e?.message || "Unbekannt"}`);
    } finally {
      setSavingOutline(false);
    }
  }

  async function moveOutline(index: number, direction: "up" | "down") {
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= outlines.length) return;

    // Deep-copy items so chapter_number can be swapped safely
    const newOutlines = outlines.map((o) => ({ ...o }));
    const tmpNum = newOutlines[index].chapter_number;
    newOutlines[index].chapter_number = newOutlines[swapIndex].chapter_number;
    newOutlines[swapIndex].chapter_number = tmpNum;
    [newOutlines[index], newOutlines[swapIndex]] = [newOutlines[swapIndex], newOutlines[index]];

    // Optimistic update — numbers and order change immediately
    setOutlines(newOutlines);

    const orderedIds = newOutlines.map((o) => o.id);
    try {
      const res = await fetch(`/api/projects/${projectId}/outline/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds }),
      });
      const data = await res.json();
      if (res.ok) {
        setOutlines(data.outlines);
      } else {
        setOutlines(outlines); // rollback
      }
    } catch {
      setOutlines(outlines); // rollback on network error
    }
  }

  async function addOutlineItem() {
    if (!newOutlineFreetext.trim()) return;
    setSavingOutline(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/outline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ freetext: newOutlineFreetext, chapter_number_start: outlines.length + 1 }),
      });
      const data = await res.json();
      if (res.ok) {
        const added = Array.isArray(data.outlines) ? data.outlines.length : 0;
        setOutlines((prev) => [...prev, ...data.outlines]);
        setShowAddOutline(false);
        setNewOutlineFreetext("");
        alert(`${added} ${isScreenplay ? (added === 1 ? "Szene" : "Szenen") : (added === 1 ? "Kapitel" : "Kapitel")} hinzugefügt.`);
      } else {
        alert(data.error || `Fehler ${res.status} beim Hinzufügen.`);
      }
    } catch (e: any) {
      alert(`Netzwerkfehler: ${e?.message || "Unbekannt"}`);
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

  async function saveStyleEdit() {
    setSavingStyle(true);
    try {
      const updated = {
        ...styleEditData,
        favorite_literary_devices: typeof styleEditData.favorite_literary_devices === "string"
          ? styleEditData.favorite_literary_devices.split(",").map((s: string) => s.trim()).filter(Boolean)
          : styleEditData.favorite_literary_devices,
        example_sentence_patterns: typeof styleEditData.example_sentence_patterns === "string"
          ? styleEditData.example_sentence_patterns.split("\n").map((s: string) => s.trim()).filter(Boolean)
          : styleEditData.example_sentence_patterns,
        sentence_length_avg: Number(styleEditData.sentence_length_avg) || styleEditData.sentence_length_avg,
        vocabulary_complexity: Number(styleEditData.vocabulary_complexity) || styleEditData.vocabulary_complexity,
        description_density: Number(styleEditData.description_density) || styleEditData.description_density,
        dialogue_ratio_percent: Number(styleEditData.dialogue_ratio_percent) || styleEditData.dialogue_ratio_percent,
      };
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style_json: updated }),
      });
      if (res.ok) {
        setProject((prev) => prev ? { ...prev, style_json: updated } : null);
        setEditingStyle(false);
      }
    } finally {
      setSavingStyle(false);
    }
  }

  async function saveStyleNotes() {
    setSavingStyleNotes(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style_notes: styleNotes }),
      });
      const data = await res.json();
      if (res.ok) {
        setProject((prev) => prev ? { ...prev, style_notes: styleNotes } : null);
      } else {
        alert(data.error || "Speichern fehlgeschlagen");
      }
    } finally {
      setSavingStyleNotes(false);
    }
  }

  async function changeScreenplayPreset(newPresetId: string) {
    if (!project) return;
    if (newPresetId === project.screenplay_style_preset) return;
    const preset = SCREENPLAY_STYLE_PRESETS.find((p) => p.id === newPresetId);
    if (!preset) return;

    // Wenn der User schon eigene Stil-Notizen hat, vor Überschreiben fragen.
    const hasNotes = (styleNotes || "").trim().length > 0;
    let replaceNotes = true;
    if (hasNotes) {
      replaceNotes = confirm(
        `Stil-Preset auf „${preset.name}" wechseln?\n\n` +
        `OK = die vorgefüllten Stil-Direktiven dieses Presets ersetzen deine aktuellen Notizen.\n` +
        `Abbrechen = nur das Preset wechseln, deine Notizen bleiben unverändert.`
      );
    }

    const nextNotes = replaceNotes ? (preset.styleNotesText || "") : styleNotes;

    setSavingStyleNotes(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          screenplay_style_preset: newPresetId,
          style_notes: nextNotes,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStyleNotes(nextNotes);
        setProject((prev) => prev ? {
          ...prev,
          screenplay_style_preset: newPresetId,
          style_notes: nextNotes,
        } : null);
      } else {
        alert(data.error || "Preset-Wechsel fehlgeschlagen");
      }
    } finally {
      setSavingStyleNotes(false);
    }
  }

  async function extractCharacters(replace = false) {
    setExtractingCharacters(true);
    try {
      const sourceText = project?.characters || project?.summary || "";
      const res = await fetch(`/api/projects/${projectId}/characters/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sourceText, replace }),
      });
      const data = await res.json();
      if (res.ok) {
        if (replace) setProjectCharacters(data.characters);
        else setProjectCharacters((prev) => [...prev, ...data.characters]);
      } else {
        alert(data.error || "Extraktion fehlgeschlagen");
      }
    } finally {
      setExtractingCharacters(false);
    }
  }

  async function addCharacter() {
    if (!newCharacterData.name.trim()) return;
    setSavingCharacter(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/characters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCharacterData),
      });
      const data = await res.json();
      if (res.ok) {
        setProjectCharacters((prev) => [...prev, data.character]);
        setNewCharacterData({ name: "", role: "", description: "", traits: "", backstory: "", appearance: "", notes: "", first_appears_chapter: 0 });
        setAddingCharacter(false);
      }
    } finally {
      setSavingCharacter(false);
    }
  }

  async function saveCharacterEdit(charId: number) {
    setSavingCharacter(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/characters/${charId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(characterEditData),
      });
      const data = await res.json();
      if (res.ok) {
        setProjectCharacters((prev) => prev.map((c) => c.id === charId ? data.character : c));
        setEditingCharacter(null);
      }
    } finally {
      setSavingCharacter(false);
    }
  }

  async function deleteCharacterRecord(charId: number) {
    if (!confirm("Diesen Charakter wirklich löschen?")) return;
    const res = await fetch(`/api/projects/${projectId}/characters/${charId}`, { method: "DELETE" });
    if (res.ok) setProjectCharacters((prev) => prev.filter((c) => c.id !== charId));
  }

  async function loadOutlineCharacters(outlineId: number) {
    const res = await fetch(`/api/projects/${projectId}/outline/${outlineId}/characters`);
    const data = await res.json();
    if (res.ok) {
      setOutlineCharacterMap((prev) => ({ ...prev, [outlineId]: data.characters.map((c: any) => c.id) }));
    }
  }

  async function saveOutlineCharacters(outlineId: number, characterIds: number[]) {
    await fetch(`/api/projects/${projectId}/outline/${outlineId}/characters`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ character_ids: characterIds }),
    });
    setOutlineCharacterMap((prev) => ({ ...prev, [outlineId]: characterIds }));
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
  const terms = getTerms(project.project_type, project.screenplay_format);
  const isScreenplay = project.project_type === "screenplay";
  const activeModel = models.find((model) => model.id === project.ai_provider);
  const activeModelName = activeModel?.name || project.ai_provider || "Noch nicht festgelegt";
  const activeModelProvider = activeModel?.provider || (project.ai_provider ? "Nicht mehr freigegeben" : "Noch keine Auswahl");
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
              <span>{formatWordcount(totalWords, project.project_type)} / {formatWordcount(project.target_word_count, project.project_type)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport(project.project_type === "screenplay" ? "pdf" : "docx")}
            >
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
          <TabsList className="mb-6 max-w-full overflow-x-auto">
            <TabsTrigger value="overview">Übersicht</TabsTrigger>
            <TabsTrigger value="style">Stil-Engine</TabsTrigger>
            <TabsTrigger value="characters">Figuren ({projectCharacters.length})</TabsTrigger>
            <TabsTrigger value="outline">{terms.outlineLabel} ({outlines.length})</TabsTrigger>
            <TabsTrigger value="chapters">{terms.chapterTab} ({chapters.length})</TabsTrigger>
            <TabsTrigger value="log">
              <Receipt className="h-3.5 w-3.5 mr-1" />
              KI-Log
            </TabsTrigger>
            <TabsTrigger value="ai-settings">
              <Settings2 className="h-3.5 w-3.5 mr-1" />
              KI-Einstellungen
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <Card className="bg-primary/[0.06]">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fortschritt</span>
                    <Gauge className="h-4 w-4 text-primary" />
                  </div>
                  <p className="mt-3 text-2xl font-bold text-primary">{Math.round(progress)}%</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatWordcount(totalWords, project.project_type)} von {formatWordcount(project.target_word_count, project.project_type)}
                  </p>
                  <Progress value={progress} className="mt-3 h-1.5" />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{terms.chapters}</span>
                    <BookOpen className="h-4 w-4 text-primary" />
                  </div>
                  <p className="mt-3 text-2xl font-bold">{chapters.length}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {outlines.length} geplant
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Outline</span>
                    <ListChecks className="h-4 w-4 text-primary" />
                  </div>
                  <p className="mt-3 text-2xl font-bold">{outlines.length}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Strukturpunkte angelegt</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Figuren</span>
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <p className="mt-3 text-2xl font-bold">{projectCharacters.length}</p>
                  <p className="mt-1 text-xs text-muted-foreground">strukturiert erfasst</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</span>
                    <span className={`h-2.5 w-2.5 rounded-full ${project.status === "completed" ? "bg-success" : project.status === "generating" ? "bg-warning" : "bg-primary"}`} />
                  </div>
                  <p className="mt-3 truncate text-lg font-bold">
                    {project.status === "draft" ? "Entwurf" : project.status === "generating" ? "In Arbeit" : project.status === "completed" ? "Fertig" : project.status}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{terms.workType} · {project.language}</p>
                </CardContent>
              </Card>
            </div>

            <Card className="mt-6 border-primary/20">
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Aktives KI-Modell</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold">{activeModelName}</p>
                      {project.ai_provider === defaultModel && defaultModel && <Badge variant="success" className="text-[10px]">Admin-Standard</Badge>}
                      {modelFallback && <Badge variant="warning" className="text-[10px]">Prüfung nötig</Badge>}
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{activeModelProvider}</p>
                    {modelFallback && (
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        Dieses Modell ist nicht mehr freigegeben.
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setActiveTab("ai-settings")}
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  KI-Einstellungen öffnen
                </Button>
              </CardContent>
            </Card>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Card>
                <CardContent className="flex items-start gap-3 p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Clock3 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Zuletzt bearbeitet</p>
                    <p className="mt-1 truncate text-sm font-medium">{formatActivityDate(project.updated_at)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Letzte Änderung am Projekt</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-start gap-3 p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Letzte KI-Aktion</p>
                    <p className="mt-1 truncate text-sm font-medium">
                      {latestAiActivity ? formatGenerationAction(latestAiActivity.action) : "Noch keine KI-Aktion"}
                    </p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {latestAiActivity?.created_at
                        ? formatActivityDate(latestAiActivity.created_at)
                        : "Noch keine Generierung protokolliert"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

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
                      <div className="text-sm text-muted-foreground">{terms.chapters}</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-primary">
                        {isScreenplay
                          ? Math.round(totalWords / 250).toLocaleString("de-DE")
                          : totalWords.toLocaleString("de-DE")}
                      </div>
                      <div className="text-sm text-muted-foreground">{terms.wordcountUnit}</div>
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
                    <span className="text-primary font-bold">[A]</span> Stil-Analyse (KI-generiertes Profil)
                  </CardTitle>
                  <CardDescription>
                    Füge Beispieltext aus einem Buch ein, das den gewünschten Stil hat.
                    Die KI erstellt daraus ein strukturiertes Stil-Profil, das im rechten Panel gespeichert und bearbeitet werden kann.
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
                      Beispieltext einfügen
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
                        Analysiere Stil...
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
                  <div>
                    <CardTitle className="text-lg">Aktives Stil-Profil</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Dieses Profil wird bei jeder Kapitelgenerierung als Vorgabe verwendet.<br/>
                      <span className="font-medium text-primary">[A]</span> KI-Profil (aus Beispieltext) &nbsp;+&nbsp; <span className="font-medium text-primary">[B]</span> Manuelle Ergänzungen
                    </p>
                  </div>
                  {project.style_json && (
                    <div className="flex items-center gap-1">
                      {!editingStyle && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const sj = project.style_json;
                            setStyleEditData({
                              ...sj,
                              favorite_literary_devices: Array.isArray(sj.favorite_literary_devices)
                                ? sj.favorite_literary_devices.join(", ")
                                : sj.favorite_literary_devices || "",
                              example_sentence_patterns: Array.isArray(sj.example_sentence_patterns)
                                ? sj.example_sentence_patterns.join("\n")
                                : sj.example_sentence_patterns || "",
                            });
                            setEditingStyle(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={deleteStyle} className="text-destructive hover:text-destructive">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  {project.style_json ? (
                    editingStyle ? (
                      <div className="space-y-4">
                        <p className="text-xs text-muted-foreground">Bearbeite die Stil-Parameter direkt. Änderungen wirken sich auf alle zukünftigen Kapitel aus.</p>

                        {project.style_json.source === "direct_input" ? (
                          <div className="space-y-2">
                            <Label className="text-xs">Stilbeschreibung</Label>
                            <Textarea
                              value={styleEditData.raw_description || ""}
                              onChange={(e) => setStyleEditData({ ...styleEditData, raw_description: e.target.value })}
                              rows={8}
                            />
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs">Autoren-Stil</Label>
                                <Input value={styleEditData.author_style || ""} onChange={(e) => setStyleEditData({ ...styleEditData, author_style: e.target.value })} />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Ton</Label>
                                <Input value={styleEditData.tone || ""} onChange={(e) => setStyleEditData({ ...styleEditData, tone: e.target.value })} />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Zeitform (past / present)</Label>
                                <Input value={styleEditData.tense || ""} onChange={(e) => setStyleEditData({ ...styleEditData, tense: e.target.value })} />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Tempo</Label>
                                <Input value={styleEditData.pacing || ""} onChange={(e) => setStyleEditData({ ...styleEditData, pacing: e.target.value })} />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Ø Satzlänge (Wörter)</Label>
                                <Input type="number" value={styleEditData.sentence_length_avg || ""} onChange={(e) => setStyleEditData({ ...styleEditData, sentence_length_avg: e.target.value })} />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Vokabular-Komplexität (1–10)</Label>
                                <Input type="number" min={1} max={10} value={styleEditData.vocabulary_complexity || ""} onChange={(e) => setStyleEditData({ ...styleEditData, vocabulary_complexity: e.target.value })} />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Beschreibungsdichte (1–10)</Label>
                                <Input type="number" min={1} max={10} value={styleEditData.description_density || ""} onChange={(e) => setStyleEditData({ ...styleEditData, description_density: e.target.value })} />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Dialoganteil (%)</Label>
                                <Input type="number" min={0} max={100} value={styleEditData.dialogue_ratio_percent || ""} onChange={(e) => setStyleEditData({ ...styleEditData, dialogue_ratio_percent: e.target.value })} />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Stilmittel (kommagetrennt)</Label>
                              <Input
                                value={styleEditData.favorite_literary_devices || ""}
                                onChange={(e) => setStyleEditData({ ...styleEditData, favorite_literary_devices: e.target.value })}
                                placeholder="innerer Monolog, kurze Sätze für Spannung, sensorische Details"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Beispiel-Sätze (einer pro Zeile) — werden direkt als Stil-Maßstab an die KI übergeben</Label>
                              <Textarea
                                value={styleEditData.example_sentence_patterns || ""}
                                onChange={(e) => setStyleEditData({ ...styleEditData, example_sentence_patterns: e.target.value })}
                                rows={5}
                                placeholder={"Sie rannte. Keine Zeit zum Denken.\nDas Licht starb, bevor ihre Augen es sahen."}
                                className="text-sm"
                              />
                            </div>
                          </div>
                        )}
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => setEditingStyle(false)}>Abbrechen</Button>
                          <Button size="sm" onClick={saveStyleEdit} disabled={savingStyle}>
                            <Save className="h-3 w-3" />
                            {savingStyle ? "Speichern…" : "Speichern"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {project.style_json.source === "direct_input" ? (
                          <div className="space-y-3">
                            <Badge variant="default">Eigene Stilbeschreibung</Badge>
                            <div className="bg-muted/50 rounded-lg p-4">
                              <p className="text-sm whitespace-pre-wrap">{project.style_json.raw_description}</p>
                            </div>
                          </div>
                        ) : (
                          <>
                            {project.style_json.author_style && (
                              <Badge variant="default">{project.style_json.author_style}</Badge>
                            )}
                            {project.style_json.style_essence && (
                              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                                <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">Stil-Essenz</p>
                                <p className="text-sm leading-relaxed italic">{project.style_json.style_essence}</p>
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
                                  <span className="text-muted-foreground">Zeitform:</span>
                                  <span className="ml-2 font-medium">{project.style_json.tense}</span>
                                </div>
                              )}
                              {project.style_json.tone && (
                                <div>
                                  <span className="text-muted-foreground">Ton:</span>
                                  <span className="ml-2 font-medium">{project.style_json.tone}</span>
                                </div>
                              )}
                              {project.style_json.sentence_length_avg !== undefined && (
                                <div>
                                  <span className="text-muted-foreground">Ø Satzlänge:</span>
                                  <span className="ml-2 font-medium">{project.style_json.sentence_length_avg} Wörter</span>
                                </div>
                              )}
                            </div>
                            {project.style_json.favorite_literary_devices?.length > 0 && (
                              <div>
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Stilmittel</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {project.style_json.favorite_literary_devices.map((d: string, i: number) => (
                                    <Badge key={i} variant="outline" className="text-xs">{d}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            {(() => {
                              const sj = project.style_json;
                              const detailFields: Array<[string, string | undefined]> = [
                                ["Erzählperspektive", sj.narrative_perspective],
                                ["Vokabular-Signatur", sj.vocabulary_signature],
                                ["Sinnes-Palette", sj.sensory_palette],
                                ["Absatz-Rhythmus", sj.paragraph_rhythm],
                                ["Dialog-Charakter", sj.dialogue_style],
                                ["Metaphern-Einsatz", sj.metaphor_style],
                                ["Szenen-/Kapitel-Anfänge", sj.scene_opening_style],
                                ["Szenen-/Kapitel-Enden", sj.scene_ending_style],
                                ["Rhythmus-Mittel", sj.rhythm_devices],
                                ["Satzlängen-Varianz", sj.sentence_length_variance],
                              ].filter(([, v]) => v && v.trim().length > 0) as Array<[string, string]>;
                              if (detailFields.length === 0) return null;
                              return (
                                <div>
                                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Stil-Mikrostruktur</span>
                                  <div className="mt-2 space-y-2">
                                    {detailFields.map(([label, value]) => (
                                      <div key={label} className="text-sm">
                                        <span className="text-muted-foreground">{label}: </span>
                                        <span>{value}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}
                            {project.style_json.signature_techniques?.length > 0 && (
                              <div>
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Signatur-Techniken</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {project.style_json.signature_techniques.map((d: string, i: number) => (
                                    <Badge key={i} variant="secondary" className="text-xs">{d}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            {project.style_json.forbidden_moves?.length > 0 && (
                              <div>
                                <span className="text-xs font-semibold uppercase tracking-wide text-destructive/80">Verbotene Stilreflexe</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {project.style_json.forbidden_moves.map((d: string, i: number) => (
                                    <Badge key={i} variant="outline" className="text-xs border-destructive/40 text-destructive/90">✕ {d}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            {project.style_json.example_sentence_patterns?.length > 0 && (
                              <div>
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Stil-Maßstab — so klingt der Roman</span>
                                <div className="mt-2 space-y-2">
                                  {project.style_json.example_sentence_patterns.map((s: string, i: number) => (
                                    <p key={i} className="text-sm italic border-l-2 border-primary/40 pl-3 text-muted-foreground">„{s}"</p>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                        {project.style_sample && (
                          <div className="border-t pt-3">
                            <button
                              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                              onClick={() => setShowOriginalSample((v) => !v)}
                            >
                              {showOriginalSample ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                              {showOriginalSample ? "Original-Text ausblenden" : "Original-Text anzeigen"}
                            </button>
                            {showOriginalSample && (
                              <div className="mt-2 bg-muted/30 rounded-lg p-3 max-h-48 overflow-y-auto">
                                <p className="text-xs whitespace-pre-wrap text-muted-foreground leading-relaxed">{project.style_sample}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  ) : (
                    <div className="text-center py-12">
                      <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                      <h3 className="text-xl font-bold mb-2">Noch kein Stil-Profil</h3>
                      <p className="text-muted-foreground mb-4 text-sm">
                        Lade einen Beispieltext hoch und klicke auf „Stil analysieren“.
                      </p>
                    </div>
                  )}

                  {isScreenplay && (
                    <div className="border-t pt-4 mt-4 space-y-2">
                      <Label className="text-sm font-semibold flex items-center gap-1">
                        <span className="text-primary font-bold">[S]</span> Drehbuch-Stil-Preset
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Bestimmt den Schreibstil deines Drehbuchs (Sorkin, Tarantino …). Beim Wechsel kannst du wählen, ob die Stil-Direktiven unten ersetzt werden sollen.
                      </p>
                      <Select
                        value={project.screenplay_style_preset || "sorkin"}
                        onValueChange={changeScreenplayPreset}
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
                        {SCREENPLAY_STYLE_PRESETS.find((p) => p.id === (project.screenplay_style_preset || "sorkin"))?.description}
                      </p>
                    </div>
                  )}

                  <div className="border-t pt-4 mt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-semibold flex items-center gap-1">
                          <span className="text-primary font-bold">[B]</span> {isScreenplay ? "Stil-Direktiven (editierbar)" : "Manuelle Ergänzungen & Korrekturen"}
                        </Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Direkt vom Autor – werden dem KI-Profil <strong>übergeordnet</strong> und bei jeder Generierung mitgeschickt.
                          {isScreenplay
                            ? " Bei Drehbüchern wird dieses Feld vom gewählten Stil-Preset vorgefüllt und ist frei editierbar."
                            : " Hier kannst du das KI-Profil gezielt korrigieren oder erweitern."}
                        </p>
                      </div>
                    </div>
                    <Textarea
                      value={styleNotes}
                      onChange={(e) => setStyleNotes(e.target.value)}
                      placeholder={isScreenplay
                        ? "Wird beim Wechsel des Stil-Presets oben automatisch vorgefüllt — du kannst hier frei editieren."
                        : "Zum Beispiel:\n• Zeitform immer Präteritum, keine Ausnahme\n• Kein innerer Monolog in Kursivschrift\n• Dialoge knapp halten, maximal 3 Zeilen\n• Protagonist spricht immer formell"}
                      rows={isScreenplay ? 10 : 5}
                      className="text-sm"
                    />
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        onClick={saveStyleNotes}
                        disabled={savingStyleNotes}
                      >
                        {savingStyleNotes ? (
                          <><RefreshCw className="h-3 w-3 animate-spin" />Speichere...</>
                        ) : (
                          <><Save className="h-3 w-3" />Ergänzungen speichern</>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="characters">
            <div className="space-y-4">
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Figuren-Liste</h3>
                    <p className="text-sm text-muted-foreground">
                      {projectCharacters.length > 0
                        ? `${projectCharacters.length} Figuren angelegt`
                        : "Noch keine Figuren angelegt"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => extractCharacters(projectCharacters.length === 0)}
                      disabled={extractingCharacters}
                    >
                      {extractingCharacters ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Wand2 className="h-4 w-4" />
                      )}
                      {projectCharacters.length === 0 ? "Aus Text extrahieren" : "Weitere extrahieren"}
                    </Button>
                    <Button size="sm" onClick={() => setAddingCharacter(true)}>
                      <Plus className="h-4 w-4" />
                      Figur hinzufügen
                    </Button>
                  </div>
                </div>
              </Card>

              {addingCharacter && (
                <Card className="p-4 border-primary/30 bg-primary/5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold">Neue Figur</span>
                    <Button size="sm" variant="ghost" onClick={() => setAddingCharacter(false)}><X className="h-4 w-4" /></Button>
                  </div>
                  <div className="grid gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Name *</Label>
                        <Input value={newCharacterData.name} onChange={(e) => setNewCharacterData({ ...newCharacterData, name: e.target.value })} placeholder="Vollständiger Name" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Rolle</Label>
                        <Input value={newCharacterData.role} onChange={(e) => setNewCharacterData({ ...newCharacterData, role: e.target.value })} placeholder="Hauptfigur / Antagonist / …" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Beschreibung</Label>
                      <Textarea value={newCharacterData.description} onChange={(e) => setNewCharacterData({ ...newCharacterData, description: e.target.value })} rows={2} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Eigenschaften</Label>
                        <Input value={newCharacterData.traits} onChange={(e) => setNewCharacterData({ ...newCharacterData, traits: e.target.value })} placeholder="kommagetrennt" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Aussehen</Label>
                        <Input value={newCharacterData.appearance} onChange={(e) => setNewCharacterData({ ...newCharacterData, appearance: e.target.value })} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Hintergrundgeschichte</Label>
                      <Textarea value={newCharacterData.backstory} onChange={(e) => setNewCharacterData({ ...newCharacterData, backstory: e.target.value })} rows={2} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Notizen / Beziehungen</Label>
                      <Textarea value={newCharacterData.notes} onChange={(e) => setNewCharacterData({ ...newCharacterData, notes: e.target.value })} rows={2} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Erstes Auftreten – Kapitel</Label>
                      <Input
                        type="number"
                        min={1}
                        value={newCharacterData.first_appears_chapter}
                        onChange={(e) => setNewCharacterData({ ...newCharacterData, first_appears_chapter: parseInt(e.target.value) || 0 })}
                        placeholder="1"
                        className="w-32"
                      />
                      <p className="text-xs text-muted-foreground">Figur wird erst ab diesem Kapitel in den Prompt einbezogen</p>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setAddingCharacter(false)}>Abbrechen</Button>
                      <Button size="sm" onClick={addCharacter} disabled={savingCharacter || !newCharacterData.name.trim()}>
                        <Plus className="h-3 w-3" />
                        {savingCharacter ? "Speichern…" : "Hinzufügen"}
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              {projectCharacters.length === 0 && !addingCharacter && (
                <Card className="text-center py-12">
                  <CardContent>
                    <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <h3 className="text-xl font-semibold mb-2">Noch keine Figuren</h3>
                    <p className="text-muted-foreground mb-4 text-sm">
                      Lass die KI die Figuren aus deinem Charaktertext oder deiner Summary extrahieren,<br/>oder füge sie manuell hinzu.
                    </p>
                  </CardContent>
                </Card>
              )}

              {projectCharacters.map((ch) => (
                <Card key={ch.id} className="overflow-hidden">
                  {editingCharacter === ch.id ? (
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-primary">Figur bearbeiten</span>
                        <Button size="sm" variant="ghost" onClick={() => setEditingCharacter(null)}><X className="h-4 w-4" /></Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Name *</Label>
                          <Input value={characterEditData.name || ""} onChange={(e) => setCharacterEditData({ ...characterEditData, name: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Rolle</Label>
                          <Input value={characterEditData.role || ""} onChange={(e) => setCharacterEditData({ ...characterEditData, role: e.target.value })} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Beschreibung</Label>
                        <Textarea value={characterEditData.description || ""} onChange={(e) => setCharacterEditData({ ...characterEditData, description: e.target.value })} rows={2} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Eigenschaften</Label>
                          <Input value={characterEditData.traits || ""} onChange={(e) => setCharacterEditData({ ...characterEditData, traits: e.target.value })} placeholder="kommagetrennt" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Aussehen</Label>
                          <Input value={characterEditData.appearance || ""} onChange={(e) => setCharacterEditData({ ...characterEditData, appearance: e.target.value })} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Hintergrundgeschichte</Label>
                        <Textarea value={characterEditData.backstory || ""} onChange={(e) => setCharacterEditData({ ...characterEditData, backstory: e.target.value })} rows={2} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Notizen / Beziehungen</Label>
                        <Textarea value={characterEditData.notes || ""} onChange={(e) => setCharacterEditData({ ...characterEditData, notes: e.target.value })} rows={2} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Erstes Auftreten – Kapitel</Label>
                        <Input
                          type="number"
                          min={1}
                          value={characterEditData.first_appears_chapter || 0}
                          onChange={(e) => setCharacterEditData({ ...characterEditData, first_appears_chapter: parseInt(e.target.value) || 0 })}
                          className="w-32"
                        />
                        <p className="text-xs text-muted-foreground">Figur wird erst ab diesem Kapitel in den Prompt einbezogen</p>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditingCharacter(null)}>Abbrechen</Button>
                        <Button size="sm" onClick={() => saveCharacterEdit(ch.id)} disabled={savingCharacter}>
                          <Save className="h-3 w-3" />
                          {savingCharacter ? "Speichern…" : "Speichern"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div
                        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/40 transition-colors"
                        onClick={() => setExpandedCharacter(expandedCharacter === ch.id ? null : ch.id)}
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-sm shrink-0 uppercase">
                          {ch.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">{ch.name}</span>
                            {ch.role && <Badge variant="secondary" className="text-xs">{ch.role}</Badge>}
                            {ch.first_appears_chapter !== undefined && ch.first_appears_chapter > 0 && (
                              <Badge variant="outline" className="text-xs text-muted-foreground">ab Kap. {ch.first_appears_chapter}</Badge>
                            )}
                          </div>
                          {ch.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{ch.description}</p>}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditingCharacter(ch.id); setCharacterEditData({ ...ch }); }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); deleteCharacterRecord(ch.id); }}>
                            <X className="h-3 w-3" />
                          </Button>
                          {expandedCharacter === ch.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        </div>
                      </div>
                      {expandedCharacter === ch.id && (
                        <div className="border-t px-4 py-3 bg-muted/20 grid grid-cols-2 gap-3 text-sm">
                          {ch.traits && (
                            <div>
                              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Eigenschaften</span>
                              <p className="mt-0.5">{ch.traits}</p>
                            </div>
                          )}
                          {ch.appearance && (
                            <div>
                              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Aussehen</span>
                              <p className="mt-0.5">{ch.appearance}</p>
                            </div>
                          )}
                          {ch.backstory && (
                            <div className="col-span-2">
                              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Hintergrund</span>
                              <p className="mt-0.5">{ch.backstory}</p>
                            </div>
                          )}
                          {ch.notes && (
                            <div className="col-span-2">
                              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notizen</span>
                              <p className="mt-0.5">{ch.notes}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="outline">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold">{terms.chapterStructure}</h3>
                  <p className="text-sm text-muted-foreground">
                    {outlines.length > 0
                      ? terms.outlineGenerated(outlines.length)
                      : terms.outlineEmpty}
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
                        placeholder={terms.pasteOutlinePlaceholder}
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
                        {chapters.length} {terms.chapters} werden gelöscht!
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
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold">{terms.newOutlineHeader}</span>
                      <Button size="sm" variant="ghost" onClick={() => { setShowAddOutline(false); setNewOutlineFreetext(""); }}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      Beschreibe eine oder mehrere Szenen in beliebigem Format — Stichpunkte, Fließtext, Rohentwürfe. Die KI erkennt die Struktur und erstellt daraus die passenden Kapitel-Einträge.
                    </p>
                    <div className="grid gap-3">
                      <Textarea
                        placeholder={terms.addOutlinePlaceholder}
                        value={newOutlineFreetext}
                        onChange={(e) => setNewOutlineFreetext(e.target.value)}
                        rows={7}
                        className="text-sm resize-none"
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {newOutlineFreetext.trim() ? `KI erkennt automatisch, wie viele ${terms.chapters} erstellt werden sollen.` : ""}
                        </span>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => { setShowAddOutline(false); setNewOutlineFreetext(""); }}>
                            Abbrechen
                          </Button>
                          <Button size="sm" onClick={addOutlineItem} disabled={savingOutline || !newOutlineFreetext.trim()}>
                            {savingOutline ? (
                              <>
                                <RefreshCw className="h-3 w-3 animate-spin" />
                                KI arbeitet …
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-3 w-3" />
                                Strukturieren & hinzufügen
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                )}
              </div>

              {generatingOutline && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground px-1">
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                    </span>
                    KI analysiert deinen Text und strukturiert die Szenen …
                  </div>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Card key={i} className="overflow-hidden">
                      <div className="flex items-center gap-4 p-4">
                        <div className="h-10 w-10 rounded-xl bg-muted animate-pulse shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 rounded bg-muted animate-pulse" style={{ width: `${55 + i * 8}%` }} />
                          <div className="h-3 rounded bg-muted animate-pulse" style={{ width: `${35 + i * 5}%` }} />
                        </div>
                        <div className="h-8 w-24 rounded-xl bg-muted animate-pulse shrink-0" />
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {outlines.length > 0 && !generatingOutline && (
                <div className="space-y-3">
                  {outlines.map((o, index) => {
                    const chapter = chapters.find((c) => c.chapter_number === o.chapter_number);
                    const isEditing = editingOutline === o.id;

                    return (
                      <Card key={o.id} className="overflow-hidden">
                        {isEditing ? (
                          <div className="p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-primary">{terms.chapter} {o.chapter_number} bearbeiten</span>
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
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <Label className="text-xs">Ort & Zeit</Label>
                                <Input
                                  value={outlineEditData.location}
                                  onChange={(e) => setOutlineEditData({ ...outlineEditData, location: e.target.value })}
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
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs">Schlüsselereignisse</Label>
                              <Textarea
                                value={outlineEditData.key_events}
                                onChange={(e) => setOutlineEditData({ ...outlineEditData, key_events: e.target.value })}
                                rows={2}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs">Original-Notizen / KI-Kontext</Label>
                              <Textarea
                                value={outlineEditData.raw_notes}
                                onChange={(e) => setOutlineEditData({ ...outlineEditData, raw_notes: e.target.value })}
                                rows={4}
                                className="font-mono text-xs"
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
                          <div className="flex items-center gap-4 p-4 hover:bg-muted/40 transition-colors">
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
                            <div className="flex-1 min-w-0 cursor-pointer group" onClick={() => setExpandedOutline(expandedOutline === o.id ? null : o.id)}>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-semibold text-primary/80 shrink-0">
                                  {terms.chapter} {o.chapter_number}
                                </span>
                                {isScreenplay && o.structural_role && (
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] shrink-0 uppercase tracking-wide font-semibold px-1.5 py-0 ${STRUCTURAL_ROLE_STYLES[o.structural_role] || ""}`}
                                  >
                                    {o.structural_role}
                                  </Badge>
                                )}
                                {o.location && (
                                  isScreenplay ? (
                                    <Badge variant="outline" className="text-[10px] shrink-0 hidden sm:inline-flex font-mono uppercase tracking-wider px-1.5 py-0">
                                      {o.location}
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-xs shrink-0 hidden sm:inline-flex">
                                      {o.location.split(",")[0]}
                                    </Badge>
                                  )
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1 min-w-0">
                                <h4 className="font-semibold truncate flex-1 min-w-0">{o.title}</h4>
                                {expandedOutline === o.id ? (
                                  <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
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
                                    location: o.location || "",
                                    key_events: o.key_events || "",
                                    raw_notes: o.raw_notes || "",
                                  });
                                }}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive relative z-10"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  deleteOutlineItem(o.id);
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                              {chapter ? (
                                <Badge variant="success" className="text-xs relative z-10">
                                  <Check className="h-3 w-3 mr-1" />
                                  {isScreenplay
                                    ? `${Math.round(chapter.word_count / 250)} S.`
                                    : `${chapter.word_count} W.`}
                                </Badge>
                              ) : (
                                <Button
                                  size="sm"
                                  className="relative z-10"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    generateChapterSingle(o.chapter_number);
                                  }}
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
                                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{isScreenplay ? "Slugline" : "Ort & Zeit"}</span>
                                  <p className={`text-sm mt-0.5 ${isScreenplay ? "font-mono uppercase tracking-wider" : ""}`}>{o.location}</p>
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
                              {projectCharacters.length > 0 && (
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Figuren in dieser {terms.chapter}</span>
                                    {!outlineCharacterMap.hasOwnProperty(o.id) && (
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        className="h-6 text-xs px-2 relative z-10" 
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          loadOutlineCharacters(o.id);
                                        }}
                                      >
                                        Laden
                                      </Button>
                                    )}
                                  </div>
                                  {outlineCharacterMap.hasOwnProperty(o.id) ? (
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                      {projectCharacters.map((ch) => {
                                        const assigned = outlineCharacterMap[o.id]?.includes(ch.id);
                                        return (
                                          <button
                                            key={ch.id}
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              const cur = outlineCharacterMap[o.id] || [];
                                              const next = assigned ? cur.filter((id) => id !== ch.id) : [...cur, ch.id];
                                              saveOutlineCharacters(o.id, next);
                                            }}
                                            className={`text-xs px-2 py-0.5 rounded-full border transition-colors relative z-10 ${assigned ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
                                          >
                                            {ch.name}
                                          </button>
                                        );
                                      })}
                                      {outlineCharacterMap[o.id]?.length === 0 && (
                                        <span className="text-xs text-muted-foreground italic">Alle Figuren (kein Filter)</span>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-muted-foreground italic">Klick auf „Laden" um Figuren zuzuweisen</p>
                                  )}
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
                      <span className="text-sm font-medium">Alle {terms.chapters} generieren</span>
                      <Button
                        onClick={async () => {
                          // Deduplicate outlines by chapter_number (keep first occurrence only)
                          // Prevents silent skips when the AI generated duplicate numbers
                          const seenNums = new Set<number>();
                          const uniqueOutlines = outlines.filter((o) => {
                            if (seenNums.has(o.chapter_number)) return false;
                            seenNums.add(o.chapter_number);
                            return true;
                          });
                          const pending = uniqueOutlines.filter(
                            (o) => !chapters.find((c) => c.chapter_number === o.chapter_number)
                          );
                          if (pending.length === 0) return;
                          bulkCancelRef.current = false;
                          setBulkCancelled(false);
                          setBulkMode(true);
                          setBulkTotal(pending.length);
                          setBulkDone(0);
                          try {
                            for (let i = 0; i < pending.length; i++) {
                              if (bulkCancelRef.current) {
                                setBulkCancelled(true);
                                break;
                              }
                              setBulkDone(i);
                              const ctrl = new AbortController();
                              activeFetchAbortRef.current = ctrl;
                              await generateChapter(pending[i].chapter_number, ctrl.signal);
                              activeFetchAbortRef.current = null;
                            }
                          } finally {
                            setBulkMode(false);
                            activeFetchAbortRef.current = null;
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
                    <h3 className="text-xl font-semibold mb-2">Noch keine {terms.chapters}</h3>
                    <p className="text-muted-foreground mb-4">
                      Erstelle zuerst eine Outline und generiere dann die {terms.chapters}.
                    </p>
                    <Button onClick={() => setActiveTab("outline")}>
                      <Layers className="h-4 w-4" />
                      Zur Outline
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                chapters.map((ch) => (
                  <Card key={ch.id} className={`overflow-hidden transition-all ${generatingChapter === ch.chapter_number ? "ring-1 ring-primary/40" : ""}`}>
                    {generatingChapter === ch.chapter_number && (
                      <div className="px-4 py-2.5 bg-primary/5 border-b border-primary/20 flex items-center gap-2">
                        <span className="relative flex h-2 w-2 shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                        </span>
                        <span className="text-xs text-primary font-medium">KI schreibt diese {terms.chapter} … {formatElapsed(elapsedSeconds)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 p-4 hover:bg-muted/40 transition-colors">
                      <div
                        className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer"
                        onClick={() =>
                          setExpandedChapter(expandedChapter === ch.chapter_number ? null : ch.chapter_number)
                        }
                      >
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-primary font-bold text-sm shrink-0 ${generatingChapter === ch.chapter_number ? "bg-primary/20 animate-pulse" : "bg-primary/10"}`}>
                          {ch.chapter_number}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold truncate mb-0.5">{ch.title}</h4>
                          <span className="text-xs text-muted-foreground">{formatWordcount(ch.word_count, project.project_type)}</span>
                        </div>
                        {expandedChapter === ch.chapter_number ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-3 text-xs gap-1.5"
                          onClick={() => {
                            setExpandedChapter(ch.chapter_number);
                            setEditingNarrative(ch.id);
                            setNarrativeEditContent(ch.narrative_summary || "");
                          }}
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          {ch.narrative_summary ? "Gedächtnis" : "Gedächtnis +"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-3 text-xs gap-1.5"
                          onClick={() => generateChapterSingle(ch.chapter_number)}
                          disabled={generatingChapter !== null}
                        >
                          {generatingChapter === ch.chapter_number ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                          )}
                          Neu
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 px-2.5 text-xs gap-1.5"
                          onClick={() => copyChapterMarkdown(ch)}
                          disabled={chapterExporting === ch.id}
                          title={copiedChapterId === ch.id ? "Markdown kopiert" : "Markdown kopieren"}
                          aria-label={copiedChapterId === ch.id ? "Markdown kopiert" : "Markdown kopieren"}
                        >
                          {copiedChapterId === ch.id ? (
                            <Check className="h-4 w-4 text-success" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                          <span>{copiedChapterId === ch.id ? "Kopiert" : "Kopieren"}</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 px-2.5 text-xs gap-1.5"
                          onClick={() => downloadChapter(ch, "markdown")}
                          disabled={chapterExporting === ch.id}
                          title="Markdown herunterladen"
                          aria-label="Markdown herunterladen"
                        >
                          <FileText className="h-4 w-4" />
                          <span>Markdown</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 px-2.5 text-xs gap-1.5"
                          onClick={() => downloadChapter(ch, "docx")}
                          disabled={chapterExporting === ch.id}
                          title="Word herunterladen"
                          aria-label="Word herunterladen"
                        >
                          <Download className="h-4 w-4" />
                          <span>Word</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-9 w-9"
                          onClick={() => {
                            if (editingChapter === ch.id) {
                              setEditingChapter(null);
                            } else {
                              setExpandedChapter(ch.chapter_number);
                              setEditingChapter(ch.id);
                              setEditContent(ch.content || "");
                            }
                          }}
                          title="Kapitel bearbeiten"
                          aria-label="Kapitel bearbeiten"
                        >
                          <PenTool className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => deleteChapter(ch.id)}
                          title="Kapitel löschen"
                          aria-label="Kapitel löschen"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {expandedChapter === ch.chapter_number && (
                      <div className="border-t px-4 py-4 space-y-4 bg-muted/30">
                        {editingNarrative === ch.id ? (
                          <div className="space-y-2 bg-primary/5 p-3 rounded-xl border border-primary/20">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-bold uppercase text-primary">Narratives Gedächtnis (KI-Handoff)</Label>
                              <div className="flex gap-2 items-center">
                                {narrativeSaveStatus === "saved" && <span className="text-xs text-success font-medium">Gespeichert ✓</span>}
                                {narrativeSaveStatus === "error" && <span className="text-xs text-destructive font-medium">Fehler beim Speichern</span>}
                                <Button size="sm" variant="ghost" onClick={() => setEditingNarrative(null)}>Abbrechen</Button>
                                <Button size="sm" disabled={narrativeSaveStatus === "saving"} onClick={() => updateNarrativeSummary(ch.id, narrativeEditContent)}>
                                  {narrativeSaveStatus === "saving" ? "Speichert…" : "Speichern"}
                                </Button>
                              </div>
                            </div>
                            <Textarea 
                              value={narrativeEditContent} 
                              onChange={(e) => setNarrativeEditContent(e.target.value)}
                              className="min-h-[100px] text-sm bg-background"
                              placeholder="Zusammenfassung für das nächste Kapitel..."
                            />
                          </div>
                        ) : ch.narrative_summary && (
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-tight">Narratives Gedächtnis (KI-Handoff)</Label>
                            <p className="text-xs text-muted-foreground leading-relaxed italic line-clamp-2 hover:line-clamp-none transition-all cursor-help">
                              "{ch.narrative_summary}"
                            </p>
                          </div>
                        )}

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
                                {formatWordcount(editContent.trim().split(/\s+/).filter(Boolean).length, project?.project_type)}
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
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Export</span>
                      <button
                        type="button"
                        onClick={() => setIncludeSceneNumbers((v) => !v)}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border transition-colors ${
                          includeSceneNumbers
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-transparent text-muted-foreground border-border hover:border-primary hover:text-foreground"
                        }`}
                      >
                        <span className={`inline-block w-3.5 h-3.5 rounded border text-center leading-none ${
                          includeSceneNumbers ? "bg-primary-foreground border-primary-foreground" : "border-current"
                        }`}>
                          {includeSceneNumbers && <span className="text-primary font-bold" style={{ fontSize: 9, lineHeight: "14px" }}>✓</span>}
                        </span>
                        {project.project_type === "screenplay" ? "Szenennummern einbeziehen" : "Kapitelnummern einbeziehen"}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {project.project_type === "screenplay" && (
                        <>
                          <Button size="sm" onClick={() => handleExport("pdf")}>
                            <Download className="h-3 w-3" />
                            PDF (Drehbuch)
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleExport("fdx")}>
                            Final Draft (FDX)
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant={project.project_type === "screenplay" ? "outline" : "default"} onClick={() => handleExport("docx")}>
                        {project.project_type !== "screenplay" && <Download className="h-3 w-3" />}
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
                    <div className="text-center py-12">
                      <Zap className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                      <h3 className="text-xl font-bold mb-2">Noch keine KI-Generierungen</h3>
                      <p className="text-muted-foreground mb-4 text-sm">
                        Starte mit der Stil-Analyse oder Outline-Generierung.
                      </p>
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
                                {(() => {
                                  if (!log.created_at) return "–";
                                  const raw = String(log.created_at).replace(" ", "T");
                                  const d = new Date(raw);
                                  return isNaN(d.getTime())
                                    ? String(log.created_at)
                                    : d.toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
                                })()}
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

          <TabsContent value="ai-settings">
            <Card className="overflow-hidden border-primary/25 bg-card/90">
              <CardContent className="p-0">
                <div className="relative p-5 md:p-6">
                  <div className="absolute bottom-0 left-0 top-0 w-1 bg-primary" />
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Settings2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Projektkonfiguration</p>
                        <Badge variant="success">KI-Modell</Badge>
                      </div>
                      <CardTitle className="mt-2 text-xl tracking-tight">KI-Einstellungen</CardTitle>
                      <CardDescription className="mt-1 max-w-2xl">
                        Wähle das Modell, das für die Generierung in diesem Projekt verwendet werden soll.
                      </CardDescription>
                    </div>
                  </div>
                </div>
                {modelFallback && (
                  <div className="mx-5 mb-4 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300 md:mx-6">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>Das bisherige Modell ist nicht mehr freigegeben. Bitte wähle ein neues Modell oder setze den aktuellen Admin-Standard.</span>
                  </div>
                )}
                {modelError && (
                  <p className="mx-5 mb-4 text-sm text-destructive md:mx-6">{modelError}</p>
                )}
                {models.length > 0 ? (
                  <div className="border-t bg-muted/15 p-5 md:p-6">
                    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <Label className="text-xs font-semibold text-muted-foreground">Aktives Modell</Label>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Wähle aus den {models.length} zentral freigegebenen Modellen.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateModel(defaultModel)}
                        disabled={savingModel || !defaultModel || project.ai_provider === defaultModel}
                      >
                        {savingModel ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                        Admin-Standard
                      </Button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {models.map((model) => {
                        const isSelected = model.id === project.ai_provider;
                        const isDefault = model.id === defaultModel;
                        return (
                          <button
                            key={model.id}
                            type="button"
                            aria-pressed={isSelected}
                            disabled={savingModel}
                            onClick={() => updateModel(model.id)}
                            className={`group relative rounded-xl border p-4 text-left transition-all duration-200 ${
                              isSelected
                                ? "border-primary bg-primary/[0.08] shadow-sm ring-1 ring-primary/25"
                                : "bg-card hover:border-primary/40 hover:bg-muted/25"
                            } disabled:cursor-not-allowed disabled:opacity-60`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                                isSelected ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                              }`}>
                                {isSelected ? <Check className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                              </div>
                              <div className="flex flex-wrap justify-end gap-1.5">
                                {isDefault && <Badge variant="success" className="text-[10px]">Standard</Badge>}
                                {isSelected && <Badge className="text-[10px]">Aktiv</Badge>}
                              </div>
                            </div>
                            <p className="mt-3 truncate font-semibold">{model.name}</p>
                            <p className="mt-1 truncate text-xs text-muted-foreground">{model.provider}</p>
                            <p className="mt-3 line-clamp-2 min-h-8 text-[11px] leading-relaxed text-muted-foreground">
                              {model.description || model.id}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="border-t p-5 text-sm text-muted-foreground md:p-6">
                    Die freigegebenen Modelle sind momentan nicht verfügbar. KI-Aufrufe verwenden den serverseitigen Fallback.
                  </p>
                )}
                <div className="flex flex-col gap-2 border-t bg-primary/[0.035] px-5 py-3.5 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between md:px-6">
                  <p>
                    {project.ai_provider === defaultModel && defaultModel
                      ? "Dieses Projekt verwendet den aktuellen Admin-Standard."
                      : project.ai_provider
                        ? `Gespeichert: ${activeModelName}`
                        : "Noch kein Projektmodell gespeichert."}
                  </p>
                  <span className="font-medium">{models.length} Modelle freigegeben</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {isAiWorking && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="flex flex-col gap-2 rounded-2xl bg-card border border-primary/30 shadow-glow px-5 py-3 min-w-[280px]">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
              </span>
              <span className="text-sm font-medium flex-1">{aiStatusLabel()}</span>
              <span className="text-xs font-mono text-muted-foreground bg-muted rounded-md px-2 py-0.5 tabular-nums">
                {formatElapsed(elapsedSeconds)}
              </span>
              {bulkMode && !bulkCancelRef.current && (
                <button
                  onClick={() => {
                    bulkCancelRef.current = true;
                    activeFetchAbortRef.current?.abort();
                  }}
                  className="ml-1 text-xs font-medium text-destructive hover:text-destructive/80 bg-destructive/10 hover:bg-destructive/20 rounded-xl px-3 py-1 transition-colors"
                >
                  Abbrechen
                </button>
              )}
              {generatingChapter !== null && !bulkMode && (
                <button
                  onClick={() => {
                    activeFetchAbortRef.current?.abort();
                  }}
                  className="ml-1 text-xs font-medium text-destructive hover:text-destructive/80 bg-destructive/10 hover:bg-destructive/20 rounded-xl px-3 py-1 transition-colors"
                >
                  Abbrechen
                </button>
              )}
            </div>
            {bulkMode && bulkTotal > 0 && (
              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                  style={{ width: `${Math.round((bulkDone / bulkTotal) * 100)}%` }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {bulkCancelled && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-3 rounded-2xl bg-card border border-muted shadow-card px-5 py-3">
            <span className="text-sm text-muted-foreground">
              Generierung gestoppt – {bulkDone} von {bulkTotal} {terms.chapters} fertig
            </span>
            <button
              onClick={() => setBulkCancelled(false)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
