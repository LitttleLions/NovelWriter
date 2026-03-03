"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { BookOpen, Sparkles, Layers, Download, PenTool, Shield, ArrowRight } from "lucide-react";

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
        } catch (e) {
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
        window.location.href = "/dashboard";
      }
    } catch {
      setError("Verbindungsfehler");
    } finally {
      setLoading(false);
    }
  }

  const features = [
    {
      icon: <Sparkles className="h-6 w-6" />,
      title: "Stil-Engine",
      desc: "Lade Beispielseiten hoch oder füge Stil-Beschreibungen ein – die App schreibt exakt in deinem Wunschstil.",
    },
    {
      icon: <Layers className="h-6 w-6" />,
      title: "Kapitel für Kapitel",
      desc: "Strukturierte Generierung mit Spannungskurve, Character-Arcs und Cliffhangern.",
    },
    {
      icon: <PenTool className="h-6 w-6" />,
      title: "Live-Editor",
      desc: "Jedes Kapitel editieren, neu generieren oder mit Stil-Check versehen.",
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Consistency Guardian",
      desc: "Automatische Prüfung auf Plot-Löcher und Charakter-Konsistenz.",
    },
    {
      icon: <BookOpen className="h-6 w-6" />,
      title: "Multi-Language",
      desc: "Deutsch, Englisch, Spanisch, Französisch – jede Sprache out of the box.",
    },
    {
      icon: <Download className="h-6 w-6" />,
      title: "Export",
      desc: "Exportiere als Word (DOCX), Markdown oder TXT.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border/60 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold">RomanForge AI</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1">
        <section className="py-16 md:py-24">
          <div className="container grid gap-12 lg:grid-cols-2 items-center">
            <div className="space-y-6 animate-fade-in">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
                <Sparkles className="h-4 w-4" />
                KI-gestützte Romanerstellung
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight">
                Deine Geschichte.{" "}
                <span className="bg-gradient-to-r from-primary to-orange-400 bg-clip-text text-transparent">
                  Dein Stil.
                </span>{" "}
                Ein Klick.
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg">
                Generiere komplette, stilgetreue Romane aus deiner Summary, Charakteren und Outline – 
                Kapitel für Kapitel, voll editierbar und konsistent. Wähle frei deinen KI-Anbieter über OpenRouter.
              </p>
              <div className="flex gap-4 items-center text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  OpenRouter Multi-Model
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  Alle Sprachen
                </span>
              </div>
            </div>

            <div className="animate-fade-in" style={{ animationDelay: "150ms" }}>
              <Card className="max-w-md mx-auto border-border/60">
                <CardHeader className="text-center">
                  <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                    <BookOpen className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Willkommen</CardTitle>
                  <CardDescription>Starte jetzt mit RomanForge AI</CardDescription>
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
                          <Input
                            id="name"
                            placeholder="Dein Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                          />
                        </div>
                      </TabsContent>
                      <div>
                        <Label htmlFor="email">E-Mail</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="name@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="password">Passwort</Label>
                        <Input
                          id="password"
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          minLength={6}
                        />
                      </div>
                      {error && (
                        <p className="text-sm text-destructive">{error}</p>
                      )}
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
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    Google Sign-In benötigt eine Client-ID in den Einstellungen
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-16 bg-muted/50">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3">Alles was du brauchst</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Von der Stil-Analyse bis zum fertigen Export – RomanForge AI begleitet dich durch jeden Schritt.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {features.map((f, i) => (
                <Card key={i} className="group">
                  <CardContent className="p-6">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                      {f.icon}
                    </div>
                    <h3 className="font-semibold mb-2">{f.title}</h3>
                    <p className="text-sm text-muted-foreground">{f.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <div className="container">
          RomanForge AI – Deine Geschichte. Deine Charaktere. Dein Stil.
        </div>
      </footer>
    </div>
  );
}
