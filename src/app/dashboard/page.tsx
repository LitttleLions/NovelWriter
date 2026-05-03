"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  BookOpen, Plus, Trash2, LogOut, FileText, Film, Tv, Copy, Search,
  ChevronDown, Library, Sparkles, TrendingUp, ArrowUpDown,
} from "lucide-react";
import { getTerms, formatWordcount } from "@/lib/terms";

interface Project {
  id: number;
  title: string;
  genre: string;
  language: string;
  status: string;
  target_word_count: number;
  chapter_count: number;
  total_words: number;
  updated_at: string;
  project_type?: string;
  screenplay_format?: string;
}

type FilterValue = "all" | "novel" | "screenplay" | "in_progress" | "completed";
type SortValue = "updated" | "title" | "progress";

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: "all", label: "Alle" },
  { value: "novel", label: "Romane" },
  { value: "screenplay", label: "Drehbücher" },
  { value: "in_progress", label: "In Arbeit" },
  { value: "completed", label: "Fertig" },
];

const SORTS: { value: SortValue; label: string }[] = [
  { value: "updated", label: "Zuletzt bearbeitet" },
  { value: "title", label: "Titel A-Z" },
  { value: "progress", label: "Fortschritt" },
];

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = Date.now();
  const diffMs = now - date.getTime();
  if (isNaN(diffMs) || diffMs < 0) return "gerade eben";
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "gerade eben";
  const min = Math.floor(sec / 60);
  if (min < 60) return min === 1 ? "vor 1 Minute" : `vor ${min} Minuten`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return hr === 1 ? "vor 1 Stunde" : `vor ${hr} Stunden`;
  const days = Math.floor(hr / 24);
  if (days < 7) return days === 1 ? "vor 1 Tag" : `vor ${days} Tagen`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return weeks === 1 ? "vor 1 Woche" : `vor ${weeks} Wochen`;
  const months = Math.floor(days / 30);
  if (months < 12) return months === 1 ? "vor 1 Monat" : `vor ${months} Monaten`;
  const years = Math.floor(days / 365);
  return years === 1 ? "vor 1 Jahr" : `vor ${years} Jahren`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [duplicatingId, setDuplicatingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterValue>("all");
  const [sort, setSort] = useState<SortValue>("updated");

  useEffect(() => {
    const token = localStorage.getItem("rf_token");
    const authHeaders: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
    Promise.all([
      fetch("/api/auth/me", { headers: authHeaders }).then((r) => r.json()),
      fetch("/api/projects", { headers: authHeaders }).then((r) => r.json()),
    ]).then(([userData, projectData]) => {
      if (userData.error) {
        router.push("/");
        return;
      }
      setUser(userData.user);
      setProjects(projectData.projects || []);
      setLoading(false);
    });
  }, [router]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("rf_token");
    router.push("/");
  }

  async function handleDelete(id: number) {
    if (!confirm("Projekt wirklich löschen?")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleDuplicate(id: number) {
    setDuplicatingId(id);
    try {
      const token = localStorage.getItem("rf_token");
      const authHeaders: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`/api/projects/${id}/duplicate`, {
        method: "POST",
        headers: authHeaders,
      });
      const data = await res.json();
      if (res.ok) {
        const refreshed = await fetch("/api/projects", { headers: authHeaders }).then((r) => r.json());
        setProjects(refreshed.projects || []);
      } else {
        alert(data.error || "Duplizieren fehlgeschlagen");
      }
    } finally {
      setDuplicatingId(null);
    }
  }

  const stats = useMemo(() => {
    const novels = projects.filter((p) => p.project_type !== "screenplay").length;
    const screenplays = projects.filter((p) => p.project_type === "screenplay").length;
    const inProgress = projects.filter((p) => p.status === "draft" || p.status === "generating").length;
    const totalWords = projects.reduce((sum, p) => sum + Number(p.total_words || 0), 0);
    return { total: projects.length, novels, screenplays, inProgress, totalWords };
  }, [projects]);

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = projects.filter((p) => {
      if (filter === "novel" && p.project_type === "screenplay") return false;
      if (filter === "screenplay" && p.project_type !== "screenplay") return false;
      if (filter === "in_progress" && !(p.status === "draft" || p.status === "generating")) return false;
      if (filter === "completed" && p.status !== "completed") return false;
      if (q) {
        const hay = `${p.title} ${p.genre || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const sorted = [...filtered];
    if (sort === "title") {
      sorted.sort((a, b) => a.title.localeCompare(b.title, "de", { sensitivity: "base" }));
    } else if (sort === "progress") {
      const pctOf = (p: Project) => {
        const total = Number(p.total_words) || 0;
        const target = Math.max(1, Number(p.target_word_count) || 1);
        return Math.min(100, (total / target) * 100);
      };
      sorted.sort((a, b) => pctOf(b) - pctOf(a));
    } else {
      sorted.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    }
    return sorted;
  }, [projects, search, filter, sort]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Laden...</div>
      </div>
    );
  }

  const formatTotalWords = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} Mio.`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
    return n.toLocaleString("de-DE");
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/60 backdrop-blur-md sticky top-0 z-50 bg-background/70">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <span className="text-lg font-bold tracking-tight">RomanForge AI</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-sm text-muted-foreground max-w-[200px] truncate">
              {user?.name || user?.email}
            </span>
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Abmelden">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8 md:py-10">
        {/* Begrüßung */}
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between mb-8">
          <div>
            <p className="text-sm text-muted-foreground mb-1">
              Willkommen zurück{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
            </p>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Meine Projekte</h1>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="lg" className="shadow-lg shadow-primary/20">
                <Plus className="h-4 w-4" />
                Neues Projekt
                <ChevronDown className="h-4 w-4 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => router.push("/project/new?type=novel")}>
                <BookOpen className="h-4 w-4 mr-2 text-primary" />
                Roman starten
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/project/new?type=screenplay")}>
                <Film className="h-4 w-4 mr-2 text-primary" />
                Drehbuch starten
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Stats */}
        {projects.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
            <StatCard icon={Library} label="Projekte gesamt" value={stats.total.toString()} />
            <StatCard icon={BookOpen} label="Romane" value={stats.novels.toString()} sub={`${stats.screenplays} Drehbücher`} />
            <StatCard icon={Sparkles} label="In Arbeit" value={stats.inProgress.toString()} />
            <StatCard icon={TrendingUp} label="Wörter geschrieben" value={formatTotalWords(stats.totalWords)} />
          </div>
        )}

        {/* Suche + Filter */}
        {projects.length > 0 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Projekt suchen…"
                className="pl-9"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0 min-w-0">
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  aria-pressed={filter === f.value}
                  onClick={() => setFilter(f.value)}
                  className={`px-3.5 h-11 sm:h-9 rounded-lg text-sm font-medium whitespace-nowrap transition-colors border ${
                    filter === f.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border/60 text-muted-foreground hover:text-foreground hover:border-border"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-11 sm:h-9 shrink-0 justify-between sm:justify-start gap-2 sm:ml-auto"
                >
                  <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {SORTS.find((s) => s.value === sort)?.label}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {SORTS.map((s) => (
                  <DropdownMenuItem
                    key={s.value}
                    onClick={() => setSort(s.value)}
                    className={sort === s.value ? "bg-accent" : ""}
                  >
                    {s.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Empty State */}
        {projects.length === 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 max-w-2xl mx-auto mt-4">
            <QuickStartCard
              icon={BookOpen}
              title="Roman starten"
              desc="Lange Form, Kapitel-für-Kapitel-Generierung mit Stil-Engine."
              onClick={() => router.push("/project/new?type=novel")}
            />
            <QuickStartCard
              icon={Film}
              title="Drehbuch starten"
              desc="Spielfilm oder TV-Episode mit Slugline-Format und FDX-Export."
              onClick={() => router.push("/project/new?type=screenplay")}
            />
            <div className="sm:col-span-2 text-center text-sm text-muted-foreground mt-2">
              Noch keine Projekte – wähle ein Format, um zu starten.
            </div>
          </div>
        ) : filteredProjects.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-1">Keine Treffer</h3>
              <p className="text-sm text-muted-foreground mb-4">Passe Suche oder Filter an, um Projekte zu finden.</p>
              <Button variant="outline" onClick={() => { setSearch(""); setFilter("all"); }}>
                Filter zurücksetzen
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => {
              const terms = getTerms(project.project_type, project.screenplay_format);
              const isScreenplay = project.project_type === "screenplay";
              const TypeIcon = !isScreenplay
                ? BookOpen
                : project.screenplay_format === "tv_episode" ? Tv : Film;
              const total = Number(project.total_words);
              const target = Math.max(1, Number(project.target_word_count));
              const pct = Math.min(100, Math.round((total / target) * 100));
              return (
                <Card
                  key={project.id}
                  className="cursor-pointer group flex flex-col"
                  onClick={() => router.push(`/project/${project.id}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                          <TypeIcon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-base font-semibold truncate leading-tight">
                            {project.title}
                          </CardTitle>
                          <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                            <span>{terms.workType}</span>
                            {project.genre && (<><span>•</span><span className="truncate">{project.genre}</span></>)}
                            <span>•</span>
                            <span className="uppercase">{project.language}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Projekt duplizieren"
                          disabled={duplicatingId === project.id}
                          onClick={(e) => { e.stopPropagation(); handleDuplicate(project.id); }}
                        >
                          <Copy className={`h-4 w-4 ${duplicatingId === project.id ? "animate-pulse text-primary" : "text-muted-foreground"}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Projekt löschen"
                          onClick={(e) => { e.stopPropagation(); handleDelete(project.id); }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 flex flex-col gap-3 flex-1">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-muted-foreground">{project.chapter_count} {terms.chapters}</span>
                      <span className="font-medium tabular-nums">{pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatWordcount(total, project.project_type)}</span>
                      <span>Ziel: {formatWordcount(Number(project.target_word_count), project.project_type)}</span>
                    </div>
                    <div className="mt-auto pt-1 flex items-center justify-between gap-2">
                      <Badge
                        variant={project.status === "completed" ? "success" : project.status === "generating" ? "warning" : "outline"}
                      >
                        {project.status === "draft" ? "Entwurf" : project.status === "generating" ? "Generiert..." : project.status === "completed" ? "Fertig" : project.status}
                      </Badge>
                      {project.updated_at && (
                        <span className="text-xs text-muted-foreground truncate" title={new Date(project.updated_at).toLocaleString("de-DE")}>
                          Zuletzt bearbeitet {formatRelativeTime(project.updated_at)}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({
  icon: Icon, label, value, sub,
}: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 md:p-5 shadow-card">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      <div className="text-2xl md:text-3xl font-bold tracking-tight tabular-nums">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

function QuickStartCard({
  icon: Icon, title, desc, onClick,
}: { icon: React.ComponentType<{ className?: string }>; title: string; desc: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-2xl border border-border/60 bg-card p-6 shadow-card hover:shadow-card-hover hover:border-primary/40 transition-all group"
    >
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </button>
  );
}
