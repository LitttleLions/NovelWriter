"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  BookOpen, Sparkles, Layers, Download, PenTool, Shield, ArrowRight,
  Film, Wand2, ListChecks, FileDown,
} from "lucide-react";

declare global {
  interface Window {
    google?: any;
    handleGoogleSignIn?: (response: any) => void;
  }
}

export default function LandingPage() {
  const [authTab, setAuthTab] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [googleReady, setGoogleReady] = useState(false);

  const handleGoogleCallback = useCallback(async (response: any) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Google-Anmeldung fehlgeschlagen");
      } else {
        if (data.token) localStorage.setItem("rf_token", data.token);
        window.location.href = "/dashboard";
      }
    } catch {
      setError("Verbindungsfehler");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const existingToken = localStorage.getItem("rf_token");
    if (existingToken) {
      const authHeaders: HeadersInit = { Authorization: `Bearer ${existingToken}` };
      fetch("/api/auth/me", { headers: authHeaders })
        .then((r) => r.json())
        .then((d) => {
          if (d.user) window.location.href = "/dashboard";
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    window.handleGoogleSignIn = handleGoogleCallback;
    const interval = setInterval(() => {
      if (window.google?.accounts?.id) {
        setGoogleReady(true);
        clearInterval(interval);
      }
    }, 200);
    return () => {
      clearInterval(interval);
      delete window.handleGoogleSignIn;
    };
  }, [handleGoogleCallback]);

  useEffect(() => {
    if (!googleReady) return;
    fetch("/api/config")
      .then((r) => r.json())
      .then((cfg) => {
        if (!cfg.googleClientId) return;
        try {
          window.google.accounts.id.initialize({
            client_id: cfg.googleClientId,
            callback: handleGoogleCallback,
          });
          const btnContainer = document.getElementById("google-signin-btn");
          if (btnContainer) {
            btnContainer.innerHTML = "";
            window.google.accounts.id.renderButton(btnContainer, {
              theme: "outline",
              size: "large",
              width: "100%",
              text: "signin_with",
              shape: "rectangular",
            });
          }
        } catch {
          console.log("Google Sign-In not configured");
        }
      });
  }, [googleReady, authTab, handleGoogleCallback]);

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const endpoint = authTab === "login" ? "/api/auth/login" : "/api/auth/register";
    const body = authTab === "login" ? { email, password } : { email, password, name };
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ein Fehler ist aufgetreten");
      } else {
        if (data.token) localStorage.setItem("rf_token", data.token);
        const verifyRes = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${data.token}` },
        });
        if (!verifyRes.ok) {
          setError("Anmeldung fehlgeschlagen");
          setLoading(false);
          return;
        }
        window.location.href = "/dashboard";
      }
    } catch {
      setError("Verbindungsfehler");
    } finally {
      setLoading(false);
    }
  }

  const features = [
    { icon: Sparkles, title: "Stil-Engine", desc: "Lade Beispielseiten hoch oder beschreibe deinen Stil – die App schreibt exakt in deinem Ton." },
    { icon: Layers, title: "Kapitel für Kapitel", desc: "Strukturierte Generierung mit Spannungskurve, Character-Arcs und Cliffhangern." },
    { icon: PenTool, title: "Live-Editor", desc: "Jedes Kapitel editieren, neu generieren oder gezielt mit Stil-Check versehen." },
    { icon: Shield, title: "Consistency Guardian", desc: "Automatische Prüfung auf Plot-Löcher und Charakter-Inkonsistenzen." },
    { icon: BookOpen, title: "Multi-Language", desc: "Deutsch, Englisch, Spanisch, Französisch – jede Sprache out of the box." },
    { icon: Download, title: "Export", desc: "Roman als DOCX/Markdown/TXT, Drehbuch als FDX oder PDF." },
  ];

  const steps = [
    { icon: Wand2, title: "Stil festlegen", desc: "Beispieltext oder Stilbeschreibung hinterlegen." },
    { icon: ListChecks, title: "Outline planen", desc: "Kapitel oder Szenen automatisch strukturieren lassen." },
    { icon: Sparkles, title: "Generieren", desc: "Per Klick Kapitel für Kapitel ausschreiben." },
    { icon: FileDown, title: "Exportieren", desc: "Fertiges Werk als DOCX, FDX oder PDF herunterladen." },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border/60 backdrop-blur-md sticky top-0 z-50 bg-background/70">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <span className="text-lg font-bold tracking-tight">RomanForge AI</span>
          </div>
          <div className="flex items-center gap-2">
            <a href="#features" className="hidden md:inline-block text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2">Features</a>
            <a href="#how" className="hidden md:inline-block text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2">So funktioniert&rsquo;s</a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-hero-radial pointer-events-none" aria-hidden />
          <div className="absolute inset-0 bg-grid-subtle opacity-50 pointer-events-none" aria-hidden />
          <div className="container relative py-16 md:py-24 lg:py-28">
            <div className="grid gap-12 lg:grid-cols-[1.15fr_1fr] items-center">
              <div className="space-y-7 animate-fade-in">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-xs font-medium text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  KI-gestützte Roman- &amp; Drehbuchgenerierung
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-[3.75rem] font-extrabold leading-[1.05] tracking-tight">
                  Deine Geschichte.{" "}
                  <span className="bg-gradient-to-r from-primary via-primary to-primary/60 bg-clip-text text-transparent">
                    Dein Stil.
                  </span>{" "}
                  Ein Klick.
                </h1>
                <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
                  Generiere komplette, stilgetreue Romane und Drehbücher aus deiner Summary, deinen Charakteren und deiner Outline – Kapitel für Kapitel, voll editierbar und konsistent.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="lg" asChild className="shadow-lg shadow-primary/20">
                    <a href="#start">
                      Jetzt starten
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <a href="#how">So funktioniert&rsquo;s</a>
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" />
                    OpenRouter Multi-Model
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" />
                    Roman &amp; Drehbuch
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" />
                    Alle Sprachen
                  </span>
                </div>
              </div>

              <div id="start" className="animate-fade-in" style={{ animationDelay: "150ms" }}>
                <Card className="max-w-md mx-auto lg:ml-auto border-border/60 shadow-xl shadow-foreground/5">
                  <CardHeader className="text-center pb-4">
                    <div className="mx-auto mb-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-xl">Willkommen</CardTitle>
                    <CardDescription>Anmelden oder kostenlos registrieren</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Tabs value={authTab} onValueChange={setAuthTab}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="login">Anmelden</TabsTrigger>
                        <TabsTrigger value="register">Registrieren</TabsTrigger>
                      </TabsList>
                      <form onSubmit={handleAuth} className="mt-4 space-y-4">
                        <TabsContent value="register" className="space-y-3 mt-0">
                          <div>
                            <Label htmlFor="name">Name</Label>
                            <Input id="name" placeholder="Dein Name" value={name} onChange={(e) => setName(e.target.value)} />
                          </div>
                        </TabsContent>
                        <div>
                          <Label htmlFor="email">E-Mail</Label>
                          <Input id="email" type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        </div>
                        <div>
                          <Label htmlFor="password">Passwort</Label>
                          <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                        </div>
                        {error && <p className="text-sm text-destructive">{error}</p>}
                        <Button type="submit" className="w-full" disabled={loading}>
                          {loading ? "Laden..." : authTab === "login" ? "Anmelden" : "Registrieren"}
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </form>
                    </Tabs>

                    <div className="relative my-4">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">oder</span>
                      </div>
                    </div>

                    <div id="google-signin-btn" className="flex justify-center" />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <section id="how" className="py-16 md:py-20 border-t border-border/60">
          <div className="container">
            <div className="text-center mb-12 max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">In 4 Schritten zum fertigen Werk</h2>
              <p className="text-muted-foreground">Vom Stil bis zum Export – RomanForge führt dich strukturiert durch den ganzen Schreibprozess.</p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={i} className="relative rounded-2xl border border-border/60 bg-card p-6 shadow-card hover:shadow-card-hover transition-all">
                    <div className="absolute -top-3 left-6 h-7 w-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-md shadow-primary/25">
                      {i + 1}
                    </div>
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold mb-1.5">{s.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="features" className="py-16 md:py-20 bg-muted/40 border-t border-border/60">
          <div className="container">
            <div className="text-center mb-12 max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Alles was du brauchst</h2>
              <p className="text-muted-foreground">Von der Stil-Analyse bis zum fertigen Export – RomanForge AI begleitet dich durch jeden Schritt.</p>
            </div>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {features.map((f, i) => {
                const Icon = f.icon;
                return (
                  <Card key={i} className="group h-full">
                    <CardContent className="p-6 flex flex-col h-full">
                      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="font-semibold mb-1.5">{f.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20 border-t border-border/60">
          <div className="container">
            <div className="relative overflow-hidden rounded-3xl bg-cta-gradient px-8 py-12 md:px-14 md:py-16 text-center text-primary-foreground shadow-xl shadow-primary/20">
              <div className="absolute inset-0 opacity-20 bg-grid-subtle pointer-events-none" aria-hidden />
              <div className="relative max-w-2xl mx-auto">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3.5 py-1.5 text-xs font-medium mb-5">
                  <Film className="h-3.5 w-3.5" />
                  Roman &amp; Drehbuch
                </div>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Bereit, deine Geschichte zu schreiben?</h2>
                <p className="text-base md:text-lg opacity-90 mb-7">Kostenlos starten, eigenen API-Key nutzen, kein Download – direkt im Browser.</p>
                <Button size="lg" variant="secondary" asChild className="bg-white text-foreground hover:bg-white/90">
                  <a href="#start">
                    Jetzt loslegen
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-8">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <span className="font-medium text-foreground">RomanForge AI</span>
            <span>– Deine Geschichte. Dein Stil.</span>
          </div>
          <div className="flex items-center gap-5">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how" className="hover:text-foreground transition-colors">So funktioniert&rsquo;s</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
