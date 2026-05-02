export interface ScreenplayStylePreset {
  id: string;
  name: string;
  description: string;
  prompt: string;
}

export const SCREENPLAY_STYLE_PRESETS: ScreenplayStylePreset[] = [
  {
    id: "sorkin",
    name: "Aaron Sorkin (Walk-and-Talk)",
    description: "Hochgeschwindigkeits-Dialog, Fachjargon, Walk-and-Talks, Ping-Pong-Schlagabtausch",
    prompt: `STIL-DIREKTIVE: AARON SORKIN (THE WEST WING / THE SOCIAL NETWORK / NEWSROOM)

Dialog ist die Hauptarchitektur jeder Szene. Action-Lines stehen im Dienst des Dialogs, niemals umgekehrt.

DIALOG-DNA:
- Walk-and-Talks: Figuren bewegen sich PHYSISCH, während sie reden – durch Korridore, Treppenhäuser, Büros. Die Kamera (und damit dein Erzähler) folgt mit. Beschreibe diese Bewegung in den Action-Lines kurz und konkret ("Sie biegen in den Westflügel ab. Toby holt Sam ein.").
- Ping-Pong-Rhythmus: Schneller Schlagabtausch in 1- bis 3-Zeilen-Repliken (A-B-A-B-A-B), dann gelegentlich ein längerer Monolog für emotionale Gravitation.
- Sätze überlappen sich, Figuren schneiden einander das Wort ab. Zeige es durch "—" am Zeilenende oder durch unfertige Sätze.
- Hochintelligente, schlagfertige Charaktere – jede Replik ist ein Konter, ein Witz, eine Klarstellung oder eine moralische Position. Niemals leere Konversation.
- Authentischer Fachjargon (Politik, Recht, Tech, Sport, Medien). Figuren sind Insider und reden wie Insider.
- Untertext: Was nicht gesagt wird, ist genauso wichtig. Lass Figuren über Belangloses reden, während die eigentliche Frage im Raum hängt.
- Parentheticals sparsam einsetzen – der Dialog selbst trägt die Emotion.

ACTION-LINES:
- Knapp, funktional, präsens. Nur was die Kamera sieht und was den Dialog rahmt.
- Niemals innerer Monolog, niemals literarische Beschreibung von Gefühlen.

VERBOTEN:
- Lange ruhige Szenen ohne Wortgefecht.
- Figuren, die "stumm denken".
- Beschreibungen von Räumen länger als 1–2 Zeilen.`,
  },
  {
    id: "tarantino",
    name: "Quentin Tarantino",
    description: "Lange Dialog-Tableaus, Pop-Culture-Riffs, Spannung durch Geduld",
    prompt: `STIL-DIREKTIVE: QUENTIN TARANTINO (PULP FICTION / RESERVOIR DOGS / INGLOURIOUS BASTERDS)

DIALOG-DNA:
- Lange, breit angelegte Dialog-Tableaus. Figuren reden ÜBER scheinbar Belangloses (Burger, Pop-Kultur, Wortdefinitionen, Trinkgeld), bevor sie zum eigentlichen Punkt kommen.
- Das WIE ist immer wichtiger als das WAS. Spannung entsteht durch die Geduld der Szene.
- Eigenwillige, präzise Slang-Wortwahl pro Charakter – jede Figur klingt unverwechselbar.
- Pausen, Blicke, Mikro-Beobachtungen sind dramaturgische Werkzeuge.

ACTION-LINES:
- Action-Lines sind oft persönlich, fast literarisch erzählt – mit Meinung und Beobachtungen.
- Plötzliche Gewalt-Ausbrüche aus ruhigen Dialogen heraus. Die Action-Line wird dann sehr knapp und chirurgisch.

STRUKTUR:
- Kapitel/Szenen-Titel sind willkommen (z.B. "Vincent Vega and Marsellus Wallace's Wife").
- Stille als Waffe.

VERBOTEN:
- Eilig zum Punkt kommen.
- Generische Action-Sequenzen ohne Charaktermomente.`,
  },
  {
    id: "dialogue_heavy",
    name: "Dialog-lastig (Charakter-Drama)",
    description: "70%+ Dialog, minimale Action-Lines, intim und charakterzentriert",
    prompt: `STIL-DIREKTIVE: DIALOG-LASTIGES CHARAKTER-DRAMA

- Mindestens 70 % der Szene besteht aus Dialog.
- Action-Lines beschränken sich auf Mikro-Bewegungen: ein Blick, ein Schlucken, das Heben einer Tasse.
- Konflikt entsteht VERBAL, nicht physisch.
- Jede Figur hat eine erkennbare Sprachidentität (Wortwahl, Satzbau, Rhythmus).
- Untertext und Konflikt-Subtext stehen im Zentrum – Figuren sagen selten direkt, was sie meinen.
- Schauplätze sind eng, intim: Küche, Auto, Bürotisch, Wartezimmer, Hotelbar.
- Pausen und Stille werden bewusst eingesetzt (parenthetical "(Pause)" oder Action-Line "Stille.").`,
  },
  {
    id: "action_heavy",
    name: "Action-lastig (visuell-kinetisch)",
    description: "Visuell getrieben, knappe Sätze, kinetische Action-Lines",
    prompt: `STIL-DIREKTIVE: ACTION-LASTIG (VISUELL-KINETISCH)

- Action-Lines dominieren, Dialog ist knapp und funktional.
- Kurze, kinetische Sätze. Verben treiben jede Zeile. Wenige Adjektive.
- Jeder Action-Block ist ein kontinuierlicher Beat – wenn der Beat wechselt (neuer Schauplatz, neue Figur, neue Aktion), neuer Absatz.
- Visuelle Klarheit: Was sieht die Kamera? Konkret, präzise, filmbar. Niemals abstrakt.
- Spannung durch Tempo, Schnitt, Bewegung – nicht durch Worte.
- Dialog: kurz, hart, manchmal nur ein Wort, manchmal gar nicht.
- Geräusche und visuelle Details als Beat-Marker ("Ein SCHUSS." / "Glas splittert.").`,
  },
  {
    id: "custom",
    name: "Eigener Stil",
    description: "Kein Preset – nutze stattdessen die Stil-Engine im Projekt",
    prompt: "",
  },
];

export function getScreenplayStylePreset(id?: string | null): ScreenplayStylePreset | null {
  if (!id) return null;
  return SCREENPLAY_STYLE_PRESETS.find((p) => p.id === id) || null;
}

// Sprach-spezifische Slugline-Vorlagen
export interface SluglineVocab {
  interior: string;        // INNEN. / INT.
  exterior: string;        // AUSSEN. / EXT.
  day: string;
  night: string;
  morning: string;
  evening: string;
  example: string;
}

export function getSluglineVocab(language?: string | null): SluglineVocab {
  const lang = (language || "Deutsch").toLowerCase().trim();

  // Deutsch verwendet eigene Slugline-Konvention (INNEN./AUSSEN.)
  if (lang.startsWith("deutsch") || lang === "de" || lang === "german") {
    return {
      interior: "INNEN.",
      exterior: "AUSSEN.",
      day: "TAG",
      night: "NACHT",
      morning: "MORGEN",
      evening: "ABEND",
      example: "INNEN. KÜCHE - TAG",
    };
  }

  // Spanisch
  if (lang.startsWith("español") || lang.startsWith("espanol") || lang.startsWith("spanish") || lang === "es") {
    return {
      interior: "INT.",
      exterior: "EXT.",
      day: "DÍA",
      night: "NOCHE",
      morning: "MAÑANA",
      evening: "TARDE",
      example: "INT. COCINA - DÍA",
    };
  }

  // Französisch
  if (lang.startsWith("français") || lang.startsWith("francais") || lang.startsWith("french") || lang === "fr") {
    return {
      interior: "INT.",
      exterior: "EXT.",
      day: "JOUR",
      night: "NUIT",
      morning: "MATIN",
      evening: "SOIR",
      example: "INT. CUISINE - JOUR",
    };
  }

  // Italienisch
  if (lang.startsWith("italiano") || lang.startsWith("italian") || lang === "it") {
    return {
      interior: "INT.",
      exterior: "EST.",
      day: "GIORNO",
      night: "NOTTE",
      morning: "MATTINA",
      evening: "SERA",
      example: "INT. CUCINA - GIORNO",
    };
  }

  // Portugiesisch
  if (lang.startsWith("português") || lang.startsWith("portugues") || lang.startsWith("portuguese") || lang === "pt") {
    return {
      interior: "INT.",
      exterior: "EXT.",
      day: "DIA",
      night: "NOITE",
      morning: "MANHÃ",
      evening: "TARDE",
      example: "INT. COZINHA - DIA",
    };
  }

  // Default: Englisch (Industrie-Standard für alle anderen Sprachen)
  return {
    interior: "INT.",
    exterior: "EXT.",
    day: "DAY",
    night: "NIGHT",
    morning: "MORNING",
    evening: "EVENING",
    example: "INT. KITCHEN - DAY",
  };
}

// Zentrale Whitelist gültiger Werte für Validierung in API-Routen
export const VALID_PROJECT_TYPES = ["novel", "screenplay"] as const;
export const VALID_SCREENPLAY_FORMATS = ["feature", "tv_episode"] as const;
export const VALID_SCREENPLAY_PRESETS = SCREENPLAY_STYLE_PRESETS.map((p) => p.id);

/**
 * Validates and normalizes screenplay-related fields. Throws Error on invalid input.
 * Returns a tuple of cleaned values that can be safely persisted.
 */
export function validateScreenplayFields(input: {
  project_type?: any;
  screenplay_format?: any;
  screenplay_style_preset?: any;
}): { project_type: "novel" | "screenplay"; screenplay_format: string | null; screenplay_style_preset: string | null } {
  const projectType = input.project_type === "screenplay" ? "screenplay" : "novel";

  if (projectType === "novel") {
    return { project_type: "novel", screenplay_format: null, screenplay_style_preset: null };
  }

  const fmt = input.screenplay_format ?? "feature";
  if (!VALID_SCREENPLAY_FORMATS.includes(fmt)) {
    throw new Error(`Ungültiges Drehbuch-Format: ${fmt}. Erlaubt: ${VALID_SCREENPLAY_FORMATS.join(", ")}`);
  }

  let preset: string | null = input.screenplay_style_preset ?? null;
  if (preset !== null && !VALID_SCREENPLAY_PRESETS.includes(preset)) {
    throw new Error(`Ungültiges Drehbuch-Stil-Preset: ${preset}. Erlaubt: ${VALID_SCREENPLAY_PRESETS.join(", ")}`);
  }

  return { project_type: "screenplay", screenplay_format: fmt, screenplay_style_preset: preset };
}
