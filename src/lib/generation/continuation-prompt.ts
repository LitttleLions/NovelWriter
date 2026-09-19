export function buildContinuationUserPrompt(opts: {
  chapterNumber: number;
  written: string;
  remainingEvents: string;
  lang: string;
  unitNoun: string;
}): string {
  const overlap = opts.written.trim().split(/\s+/).slice(-120).join(" ");
  return `${opts.unitNoun} ${opts.chapterNumber} NAHTLOS FORTSETZEN

REGELN:
- Kein neuer Anfang, keine Überschrift, keine Rekapitulation.
- Kein POV- oder Tempuswechsel.
- Schreibe ausschließlich auf ${opts.lang.toUpperCase()}.
- Setze direkt am Ende des bereits geschriebenen Texts an.

BEREITS GESCHRIEBEN (Überlappung, nicht wiederholen):
${overlap}

${opts.remainingEvents ? `NOCH NICHT UMGESETZTE PFLICHT-EREIGNISSE:\n${opts.remainingEvents}\n` : "Setze die Szene logisch und stiltreu fort, bis das Kapitel rund schließt."}

Beginne mit dem nächsten Satz der Erzählung.`;
}
