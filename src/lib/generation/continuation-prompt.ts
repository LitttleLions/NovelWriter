export function buildContinuationUserPrompt(opts: {
  chapterNumber: number;
  written: string;
  remainingEvents: string;
  lang: string;
  unitNoun: string;
  context?: string;
  remainingWords?: number;
}): string {
  const overlap = opts.written.trim().split(/\s+/).slice(-180).join(" ");
  const remainingWords = Math.max(0, opts.remainingWords || 0);
  return `${opts.unitNoun} ${opts.chapterNumber} NAHTLOS FORTSETZEN

REGELN:
- Kein neuer Anfang, keine Überschrift, keine Rekapitulation.
- Kein POV- oder Tempuswechsel.
- Schreibe ausschließlich auf ${opts.lang.toUpperCase()}.
- Setze direkt am Ende des bereits geschriebenen Texts an, vorzugsweise an einer Satz- oder Absatzgrenze.
- Wiederhole keinen Teil des Überlappungsauszugs. Beginne mit dem nächsten vollständigen Satz.
- Schreibe nur so viel, wie für einen runden Abschluss noch nötig ist (ungefähr ${remainingWords || "das verbleibende"} Wörter).

BEREITS GESCHRIEBEN (Überlappung, nicht wiederholen):
${overlap}

${opts.context ? `UNVERÄNDERLICHER KONTEXT DES KAPITELS:\n${opts.context}\n` : ""}
${opts.remainingEvents ? `NOCH NICHT UMGESETZTE PFLICHT-EREIGNISSE:\n${opts.remainingEvents}\n` : "Setze die Szene logisch und stiltreu fort, bis das Kapitel rund schließt."}

Beginne mit dem nächsten Satz der Erzählung.`;
}
