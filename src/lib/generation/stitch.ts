export function stitchContinuation(existing: string, continuation: string): string {
  const existingTrim = (existing || "").replace(/\s+$/, "");
  const cont = (continuation || "").trim();
  if (!existingTrim) return cont;
  if (!cont) return existingTrim;

  const max = Math.min(existingTrim.length, 1200);
  for (let len = max; len >= 24; len--) {
    const suffix = existingTrim.slice(-len);
    const idx = cont.indexOf(suffix);
    if (idx !== -1 && idx < 400) {
      return existingTrim + cont.slice(idx + suffix.length);
    }
  }

  const glue = /[.!?…»"'”]\s*$/.test(existingTrim) ? "\n\n" : (/[^\s]$/.test(existingTrim) && /^[^\s]/.test(cont) ? " " : "");
  return existingTrim + glue + cont;
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
