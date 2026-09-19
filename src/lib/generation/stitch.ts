export function stitchContinuation(existing: string, continuation: string): string {
  const existingTrim = (existing || "").replace(/\s+$/, "");
  const cont = (continuation || "").trim();
  if (!existingTrim) return cont;
  if (!cont) return existingTrim;

  // Prefer complete word overlaps. Character-level matching can hit a common
  // phrase in the wrong place and can split a word or sentence at the seam.
  const existingWords = [...existingTrim.matchAll(/\S+/g)];
  const continuationWords = [...cont.matchAll(/\S+/g)];
  const maxWords = Math.min(80, existingWords.length, continuationWords.length);
  for (let wordCount = maxWords; wordCount >= 6; wordCount--) {
    const existingStart = existingWords[existingWords.length - wordCount].index ?? 0;
    const overlap = existingWords
      .slice(existingWords.length - wordCount)
      .map((match) => match[0])
      .join(" ");
    const normalizedOverlap = normalizeWords(overlap);
    const continuationPrefix = continuationWords.slice(0, wordCount).map((match) => match[0]).join(" ");
    if (normalizeWords(continuationPrefix) === normalizedOverlap) {
      const continuationStart = continuationWords[wordCount - 1].index! + continuationWords[wordCount - 1][0].length;
      const existingOverlap = existingTrim.slice(existingStart, existingStart + overlap.length);
      const continuationOverlap = cont.slice(0, continuationStart);
      const punctuationMismatch =
        /[.!?]$/.test(existingOverlap) && !/[.!?]$/.test(continuationOverlap);
      const preservedExisting = punctuationMismatch
        ? existingTrim.slice(0, existingStart + overlap.length).replace(/[.!?]+$/, "")
        : existingTrim.slice(0, existingStart + overlap.length);
      return preservedExisting + cont.slice(continuationStart);
    }
  }

  const glue = /[.!?…»"'”]\s*$/.test(existingTrim) ? "\n\n" : (/[^\s]$/.test(existingTrim) && /^[^\s]/.test(cont) ? " " : "");
  return existingTrim + glue + cont;
}

function normalizeWords(text: string): string {
  return text
    .toLocaleLowerCase()
    .replace(/[“”„«»"'`´]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function remainingKeyEvents(keyEvents: string | undefined, written: string): string {
  if (!keyEvents?.trim()) return "";
  const beats = keyEvents
    .split(/\d+\.\s+|;\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8);
  if (beats.length === 0) return keyEvents.trim();
  const lower = written.toLowerCase();
  const missing = beats.filter((beat) => {
    const tokens = beat
      .toLowerCase()
      .split(/\s+/)
      .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ""))
      .filter((w) => w.length > 4)
      .slice(0, 4);
    if (tokens.length === 0) return false;
    const hits = tokens.filter((t) => lower.includes(t)).length;
    return hits < Math.ceil(tokens.length * 0.5);
  });
  return missing.join("\n");
}

export function wordCountOf(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}
