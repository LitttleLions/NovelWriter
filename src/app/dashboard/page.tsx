"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  BookOpen, Plus, Trash2, LogOut, Pencil, FileText, Film, Tv, Copy,
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

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [duplicatingId, setDuplicatingId] = useState<number | null>(null);

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
        // Liste neu laden, damit chapter_count/total_words aus der gleichen
        // SELECT-mit-COUNT-Subquery wie initial gefüllt sind.
        const refreshed = await fetch("/api/projects", { headers: authHeaders }).then((r) => r.json());
        setProjects(refreshed.projects || []);
      } else {
        alert(data.error || "Duplizieren fehlgeschlagen");
      }
    } finally {
      setDuplicatingId(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Laden...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/60 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold">RomanForge AI</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {user?.name || user?.email}
            </span>
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Meine Projekte</h1>
            <p className="text-muted-foreground mt-1">
              {projects.length} {projects.length === 1 ? "Projekt" : "Projekte"}
            </p>
          </div>
          <Button onClick={() => router.push("/project/new")}>
            <Plus className="h-4 w-4" />
            Neues Projekt
          </Button>
        </div>

        {projects.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Noch keine Projekte</h3>
              <p className="text-muted-foreground mb-6">
                Erstelle dein erstes Roman- oder Drehbuch-Projekt und starte die Generierung.
              </p>
              <Button onClick={() => router.push("/project/new")}>
                <Plus className="h-4 w-4" />
                Erstes Projekt erstellen
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => {
              const terms = getTerms(project.project_type, project.screenplay_format);
              const isScreenplay = project.project_type === "screenplay";
              const TypeIcon = !isScreenplay
                ? BookOpen
                : project.screenplay_format === "tv_episode" ? Tv : Film;
              return (
              <Card
                key={project.id}
                className="cursor-pointer group"
                onClick={() => router.push(`/project/${project.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate flex items-center gap-1.5">
                        <TypeIcon className="h-4 w-4 text-primary shrink-0" />
                        <span className="truncate">{project.title}</span>
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="secondary" className="text-xs">
                          {terms.workType}
                        </Badge>
                        {project.genre && (
                          <Badge variant="secondary">
                            {project.genre}
                          </Badge>
                        )}
                        <Badge variant="outline">{project.language}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Projekt duplizieren"
                        disabled={duplicatingId === project.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicate(project.id);
                        }}
                      >
                        <Copy className={`h-4 w-4 ${duplicatingId === project.id ? "animate-pulse text-primary" : "text-muted-foreground"}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Projekt löschen"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(project.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{project.chapter_count} {terms.chapters}</span>
                    <span>
                      {formatWordcount(Number(project.total_words), project.project_type)} / {formatWordcount(Number(project.target_word_count), project.project_type)}
                    </span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (Number(project.total_words) / Math.max(1, Number(project.target_word_count))) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Badge
                      variant={project.status === "completed" ? "success" : project.status === "generating" ? "warning" : "outline"}
                    >
                      {project.status === "draft" ? "Entwurf" : project.status === "generating" ? "Generiert..." : project.status === "completed" ? "Fertig" : project.status}
                    </Badge>
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
