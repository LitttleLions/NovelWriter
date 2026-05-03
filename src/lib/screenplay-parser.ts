import { getSluglineVocab } from "./screenplay-presets";

export type ElementType =
  | "scene_heading"
  | "action"
  | "character"
  | "parenthetical"
  | "dialogue"
  | "transition"
  | "shot";

export interface ScreenplayElement {
  type: ElementType;
  text: string;
}

const TRANSITION_KEYWORDS = [
  "CUT TO:",
  "SCHNITT AUF:",
  "FADE OUT.",
  "FADE OUT:",
  "FADE IN:",
  "FADE IN.",
  "ABBLENDE.",
  "ABBLENDE:",
  "AUFBLENDE.",
  "AUFBLENDE:",
  "DISSOLVE TO:",
  "ÜBERBLENDUNG AUF:",
  "SMASH CUT TO:",
  "MATCH CUT TO:",
  "BACK TO:",
  "ZURÜCK ZU:",
];

function buildSlugStarts(language?: string | null): string[] {
  const starts = new Set<string>([
    "INT.",
    "EXT.",
    "INT/EXT.",
    "EXT/INT.",
    "INT./EXT.",
    "EXT./INT.",
    "I/E.",
    "INNEN.",
    "AUSSEN.",
    "INNEN/AUSSEN.",
    "AUSSEN/INNEN.",
    "EST.",
  ]);
  const v = getSluglineVocab(language);
  starts.add(v.interior);
  starts.add(v.exterior);
  return Array.from(starts);
}

function isAllUpper(line: string): boolean {
  const letters = line.replace(/[^A-Za-zÀ-ÿ]/g, "");
  if (letters.length === 0) return false;
  return letters === letters.toUpperCase();
}

function looksLikeSlugline(line: string, slugStarts: string[]): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  const upper = trimmed.toUpperCase();
  for (const s of slugStarts) {
    if (upper.startsWith(s + " ") || upper === s || upper.startsWith(s)) {
      // Heuristic: scene heading must contain at least one space after the prefix
      if (upper.length > s.length + 1) return true;
    }
  }
  return false;
}

function looksLikeTransition(line: string): boolean {
  const trimmed = line.trim().toUpperCase();
  if (!trimmed) return false;
  for (const t of TRANSITION_KEYWORDS) {
    if (trimmed === t || trimmed.endsWith(t)) return true;
  }
  // Generic right-aligned transition: ends with "TO:" and is uppercase
  if (/^[A-ZÀ-Ý0-9 .,'\-]+TO:$/.test(trimmed)) return true;
  return false;
}

function looksLikeCharacter(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (trimmed.length > 60) return false;
  // Strip trailing parenthetical extensions like (V.O.), (CONT'D), (O.S.), (aus dem OFF)
  const withoutExt = trimmed.replace(/\s*\([^)]*\)\s*$/g, "").trim();
  if (!withoutExt) return false;
  if (!isAllUpper(withoutExt)) return false;
  // Must contain at least one letter
  if (!/[A-ZÀ-Ý]/.test(withoutExt)) return false;
  // No sentence-ending punctuation
  if (/[.!?]$/.test(withoutExt)) return false;
  // Should not have many words (character names typically 1-4 words)
  const words = withoutExt.split(/\s+/);
  if (words.length > 5) return false;
  return true;
}

function looksLikeParenthetical(line: string): boolean {
  const t = line.trim();
  return t.startsWith("(") && t.endsWith(")") && t.length >= 2;
}

/**
 * Parses raw screenplay text into structured elements.
 * Heuristic state machine: a line is in "dialogue mode" while we're under
 * a character cue and have not hit a blank line.
 */
export function parseScreenplay(
  raw: string,
  language?: string | null
): ScreenplayElement[] {
  const slugStarts = buildSlugStarts(language);
  const elements: ScreenplayElement[] = [];
  if (!raw) return elements;

  // Normalize line endings, strip leading whitespace per line for detection
  // but keep collapsed text content.
  const lines = raw.replace(/\r\n?/g, "\n").split("\n");

  let inDialogueBlock = false;
  let pendingDialogue: string[] = [];

  function flushDialogue() {
    if (pendingDialogue.length > 0) {
      elements.push({
        type: "dialogue",
        text: pendingDialogue.join(" ").replace(/\s+/g, " ").trim(),
      });
      pendingDialogue = [];
    }
  }

  let pendingAction: string[] = [];
  function flushAction() {
    if (pendingAction.length > 0) {
      const text = pendingAction.join(" ").replace(/\s+/g, " ").trim();
      if (text) elements.push({ type: "action", text });
      pendingAction = [];
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // Blank line: terminates current dialogue block / action paragraph
    if (!line) {
      flushDialogue();
      flushAction();
      inDialogueBlock = false;
      continue;
    }

    if (looksLikeSlugline(line, slugStarts)) {
      flushDialogue();
      flushAction();
      inDialogueBlock = false;
      elements.push({ type: "scene_heading", text: line.toUpperCase() });
      continue;
    }

    if (looksLikeTransition(line)) {
      flushDialogue();
      flushAction();
      inDialogueBlock = false;
      elements.push({ type: "transition", text: line.toUpperCase() });
      continue;
    }

    if (looksLikeCharacter(line)) {
      // Look ahead: must be followed (after optional parenthetical lines) by
      // a non-empty line that we'll treat as dialogue. Otherwise treat as action.
      let lookahead = i + 1;
      while (
        lookahead < lines.length &&
        lines[lookahead].trim() &&
        looksLikeParenthetical(lines[lookahead].trim())
      ) {
        lookahead++;
      }
      const next = lookahead < lines.length ? lines[lookahead].trim() : "";
      if (next && !looksLikeSlugline(next, slugStarts) && !looksLikeTransition(next)) {
        flushDialogue();
        flushAction();
        elements.push({ type: "character", text: line });
        inDialogueBlock = true;
        continue;
      }
      // Otherwise fall through to action treatment
    }

    if (inDialogueBlock && looksLikeParenthetical(line)) {
      flushDialogue();
      elements.push({ type: "parenthetical", text: line });
      continue;
    }

    if (inDialogueBlock) {
      pendingDialogue.push(line);
      continue;
    }

    // Default: action paragraph (continues until blank line)
    pendingAction.push(line);
  }

  flushDialogue();
  flushAction();
  return elements;
}
