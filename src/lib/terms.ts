export type ProjectType = "novel" | "screenplay";
export type ScreenplayFormat = "feature" | "tv_episode";

export interface ProjectTerms {
  chapter: string;
  chapters: string;
  chapterShort: string;
  chapterStructure: string;
  chapterTab: string;
  outlineLabel: string;
  workNoun: string;
  workType: string;
  wordcountUnit: string;
  wordcountLabel: string;
  outlineEmpty: string;
  outlineGenerated: (n: number) => string;
  pasteOutlinePlaceholder: string;
  addOutlinePlaceholder: string;
  newOutlineHeader: string;
}

const NOVEL_TERMS: ProjectTerms = {
  chapter: "Kapitel",
  chapters: "Kapitel",
  chapterShort: "Kap.",
  chapterStructure: "Kapitel-Struktur",
  chapterTab: "Kapitel",
  outlineLabel: "Outline",
  workNoun: "Roman",
  workType: "Roman",
  wordcountUnit: "Wörter",
  wordcountLabel: "Ziel-Wortzahl",
  outlineEmpty: "Generiere eine Kapitel-Struktur basierend auf deiner Summary",
  outlineGenerated: (n: number) => `${n} Kapitel geplant`,
  pasteOutlinePlaceholder: "Kapitel 1: Titel...\nKapitel 2: Titel...",
  addOutlinePlaceholder:
    "Szene 1: Anna entdeckt das Tagebuch ihrer Mutter im Keller.\nSzene 2: Konfrontation mit dem Vater – er weiß mehr als er zugibt.\n\nOder einfach fließend: Die nächsten Kapitel drehen sich um die Reise nach Paris, wo...",
  newOutlineHeader: "Szenen / Kapitel hinzufügen",
};

const SCREENPLAY_TERMS: ProjectTerms = {
  chapter: "Szene",
  chapters: "Szenen",
  chapterShort: "Szene",
  chapterStructure: "Szenen-Struktur",
  chapterTab: "Szenen",
  outlineLabel: "Szenen-Übersicht",
  workNoun: "Drehbuch",
  workType: "Drehbuch",
  wordcountUnit: "Seiten",
  wordcountLabel: "Ziel-Länge (Seiten)",
  outlineEmpty: "Generiere eine Szenen-Struktur basierend auf deiner Summary",
  outlineGenerated: (n: number) => `${n} Szenen geplant`,
  pasteOutlinePlaceholder: "Szene 1: Titel...\nSzene 2: Titel...",
  addOutlinePlaceholder:
    "Szene 1: INNEN. KÜCHE - TAG. Sarah konfrontiert ihren Vater am Frühstückstisch.\nSzene 2: AUSSEN. PARKHAUS - NACHT. Verfolgungsjagd zwischen den Wagen.\n\nOder freitext: Die nächsten Szenen spielen im Krankenhaus...",
  newOutlineHeader: "Szenen hinzufügen",
};

export function getTerms(projectType?: string | null, screenplayFormat?: string | null): ProjectTerms {
  if (projectType === "screenplay") {
    const t: ProjectTerms = { ...SCREENPLAY_TERMS };
    if (screenplayFormat === "tv_episode") t.workType = "TV-Episode";
    else if (screenplayFormat === "feature") t.workType = "Spielfilm";
    return t;
  }
  return NOVEL_TERMS;
}

// Industriestandard: 1 Drehbuchseite ≈ 1 Minute Filmzeit ≈ 250 Wörter
export const WORDS_PER_PAGE = 250;

export function wordsToPages(words: number): number {
  return Math.round((words || 0) / WORDS_PER_PAGE);
}

export function pagesToWords(pages: number): number {
  return Math.max(0, Math.round(pages)) * WORDS_PER_PAGE;
}

export function formatWordcount(words: number, projectType?: string | null): string {
  const w = Number(words) || 0;
  if (projectType === "screenplay") {
    const pages = wordsToPages(w);
    return `${pages.toLocaleString("de-DE")} ${pages === 1 ? "Seite" : "Seiten"}`;
  }
  return `${w.toLocaleString("de-DE")} Wörter`;
}

export function formatTargetCount(words: number, projectType?: string | null): string {
  return formatWordcount(words, projectType);
}

// Default-Längen (in Wörtern) für neue Projekte
export const DEFAULT_TARGET_WORDS: Record<string, number> = {
  novel: 80000,
  feature: 22500,        // ~90 Drehbuchseiten
  tv_episode: 14000,     // ~55 Drehbuchseiten (60-min Drama)
};
