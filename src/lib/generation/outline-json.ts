export function parseJsonArray(content: string): any[] {
  if (!content || !content.trim()) {
    throw new Error("Die KI hat eine leere Antwort zurückgegeben (vermutlich Timeout oder Rate-Limit). Bitte erneut versuchen.");
  }
  const arrayMatch = content.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try { return JSON.parse(arrayMatch[0]); } catch {}
  }
  try { return JSON.parse(content); } catch {}

  const start = content.indexOf("[");
  if (start === -1) {
    throw new Error(`KI-Antwort enthält kein JSON-Array. Erste 200 Zeichen: ${content.slice(0, 200)}`);
  }
  const objects: any[] = [];
  let depth = 0;
  let inString = false;
  let escape = false;
  let objStart = -1;
  for (let i = start + 1; i < content.length; i++) {
    const c = content[i];
    if (escape) { escape = false; continue; }
    if (c === "\\") { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === "{") { if (depth === 0) objStart = i; depth++; }
    else if (c === "}") {
      depth--;
      if (depth === 0 && objStart !== -1) {
        try { objects.push(JSON.parse(content.slice(objStart, i + 1))); } catch {}
        objStart = -1;
      }
    }
  }
  if (objects.length === 0) {
    throw new Error(`KI-Antwort konnte nicht als JSON-Array gelesen werden (${content.length} Zeichen). Modell hat vermutlich abgebrochen.`);
  }
  return objects;
}

export function isUsableOutline(chapters: unknown): chapters is any[] {
  return validateOutline(chapters).ok;
}

export function validateOutline(
  chapters: unknown,
  options: { minEntries?: number; maxEntries?: number; expectedEntries?: number } = {},
): { ok: true } | { ok: false; reason: string } {
  if (!Array.isArray(chapters) || chapters.length === 0) {
    return { ok: false, reason: "Die Outline enthält keine Kapitel oder Szenen." };
  }
  const minEntries = options.expectedEntries ?? options.minEntries ?? 2;
  const maxEntries = options.expectedEntries ?? options.maxEntries;
  if (chapters.length < minEntries) {
    return { ok: false, reason: `Die Outline enthält nur ${chapters.length} statt mindestens ${minEntries} Einträgen.` };
  }
  if (maxEntries !== undefined && chapters.length > maxEntries) {
    return { ok: false, reason: `Die Outline enthält ${chapters.length} statt höchstens ${maxEntries} Einträgen.` };
  }

  const numbers = new Set<number>();
  for (const [index, chapter] of chapters.entries()) {
    if (!chapter || typeof chapter !== "object") {
      return { ok: false, reason: `Outline-Eintrag ${index + 1} ist kein Objekt.` };
    }
    const chapterNumber = Number((chapter as any).chapter_number);
    if (!Number.isInteger(chapterNumber) || chapterNumber < 1 || numbers.has(chapterNumber)) {
      return { ok: false, reason: `Outline-Eintrag ${index + 1} hat eine fehlende oder doppelte Kapitelnummer.` };
    }
    if (chapterNumber !== index + 1) {
      return { ok: false, reason: `Outline-Eintrag ${index + 1} ist nicht fortlaufend nummeriert.` };
    }
    numbers.add(chapterNumber);
    const hasContent = ["title", "purpose", "raw_notes", "key_events"].some((key) => String((chapter as any)[key] || "").trim());
    if (!hasContent) {
      return { ok: false, reason: `Outline-Eintrag ${chapterNumber} enthält keine verwertbaren Inhalte.` };
    }
  }

  return { ok: true };
}

export function sanitizeJsonStrings(raw: string): string {
  return raw.replace(
    /"(?:[^"\\]|\\.)*"/g,
    (match) => match.replace(/[\x00-\x1F]/g, (c) => {
      if (c === "\n") return "\\n";
      if (c === "\r") return "\\r";
      if (c === "\t") return "\\t";
      return "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0");
    }),
  );
}

export function parseOutlineArrayFromModel(content: string): any[] {
  const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  try {
    return parseJsonArray(sanitizeJsonStrings(cleaned));
  } catch {
    return parseJsonArray(cleaned);
  }
}
