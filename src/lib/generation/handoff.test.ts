import { describe, expect, it } from "vitest";
import { normalizeHandoff, selectHandoffSource } from "@/lib/generation/handoff";
import { isUsableOutline, parseJsonArray } from "@/lib/generation/outline-json";

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
});

describe("outline JSON helpers", () => {
  it("rejects empty or title-less arrays", () => {
    expect(isUsableOutline([])).toBe(false);
    expect(isUsableOutline([{ chapter_number: 1 }])).toBe(false);
    expect(isUsableOutline([{ title: "Der Anfang" }])).toBe(true);
  });

  it("parses truncated arrays by collecting complete objects", () => {
    const partial = `[{"chapter_number":1,"title":"Eins"},{"chapter_number":2,"title":"Zwei"`;
    expect(parseJsonArray(partial)).toEqual([{ chapter_number: 1, title: "Eins" }]);
  });
});
