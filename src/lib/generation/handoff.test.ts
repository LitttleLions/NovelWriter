import { describe, expect, it } from "vitest";
import { normalizeHandoff, safeParseNarrativeJson, selectHandoffSource } from "@/lib/generation/handoff";
import { isUsableOutline, parseJsonArray, validateOutline } from "@/lib/generation/outline-json";

describe("selectHandoffSource", () => {
  it("uses the full chapter when it fits", () => {
    const source = selectHandoffSource("Kurztext", "1. Beat", 1000);
    expect(source.mode).toBe("full");
    expect(source.text).toContain("Kurztext");
    expect(source.text).toContain("Beat");
  });

  it("uses head, tail and outline events when the chapter is too long", () => {
    const long = "A".repeat(5000) + "MITTE" + "B".repeat(5000);
    const source = selectHandoffSource(long, "Finale am Hafen", 100);
    expect(source.mode).toBe("head_tail_events");
    expect(source.text).toContain("A".repeat(20));
    expect(source.text).toContain("B".repeat(20));
    expect(source.text).toContain("Hafen");
    expect(source.text).toContain("gekürzt");
  });
});

describe("normalizeHandoff", () => {
  it("converts character_states arrays into a map and keeps ending fields", () => {
    const handoff = normalizeHandoff({
      summary: "Es geschah viel.",
      last_scene_ending: "Die Tür fiel ins Schloss.",
      open_plot_threads: ["Der Brief"],
      key_events: ["Fund"],
      character_states: [
        { name: "Anna", location: "Küche", emotional_state: "unruhig", key_decisions: "schweigt", open_threads: "Brief" },
      ],
    });
    expect(handoff?.last_scene_ending).toBe("Die Tür fiel ins Schloss.");
    expect(handoff?.open_plot_threads).toEqual(["Der Brief"]);
    expect(handoff?.character_states.Anna.location).toBe("Küche");
  });

  it("rejects payloads without a summary", () => {
    expect(normalizeHandoff({ last_scene_ending: "x" })).toBeNull();
  });

  it("rejects truncated or incomplete structured output", () => {
    expect(safeParseNarrativeJson('{"summary":"Ein langer Anfang')).toBeNull();
    expect(normalizeHandoff({
      summary: "Eine ausreichend lange Zusammenfassung des Kapitels.",
      last_scene_ending: "Ende",
      character_states: [],
    })).toBeNull();
  });
});

describe("outline JSON helpers", () => {
  it("rejects empty or title-less arrays", () => {
    expect(isUsableOutline([])).toBe(false);
    expect(isUsableOutline([{ chapter_number: 1 }])).toBe(false);
    expect(isUsableOutline([
      { chapter_number: 1, title: "Der Anfang" },
      { chapter_number: 2, title: "Die Wendung" },
    ])).toBe(true);
  });

  it("rejects incomplete and duplicate outline rows", () => {
    expect(validateOutline([{ chapter_number: 1, title: "Nur ein Kapitel" }]).ok).toBe(false);
    expect(validateOutline([
      { chapter_number: 1, title: "Eins" },
      { chapter_number: 1, title: "Doppelt" },
    ]).ok).toBe(false);
  });

  it("parses truncated arrays by collecting complete objects", () => {
    const partial = `[{"chapter_number":1,"title":"Eins"},{"chapter_number":2,"title":"Zwei"`;
    expect(parseJsonArray(partial)).toEqual([{ chapter_number: 1, title: "Eins" }]);
  });
});
