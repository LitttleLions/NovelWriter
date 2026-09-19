import { describe, expect, it } from "vitest";
import { remainingKeyEvents, stitchContinuation, wordCountOf } from "@/lib/generation/stitch";

describe("stitchContinuation", () => {
  it("appends when there is no overlap", () => {
    expect(stitchContinuation("Er ging zur Tür.", "Dann öffnete er sie.")).toContain("Dann öffnete er sie.");
  });

  it("drops overlapped tail so the chapter stays one piece", () => {
    const existing = "Ein langer Absatz endet hier mit einem Blick aus dem Fenster.";
    const continuation = "endet hier mit einem Blick aus dem Fenster. Der Regen setzte ein.";
    const result = stitchContinuation(existing, continuation);
    expect(result).toBe("Ein langer Absatz endet hier mit einem Blick aus dem Fenster. Der Regen setzte ein.");
    expect(result.match(/Blick aus dem Fenster/g)?.length).toBe(1);
  });
});

describe("remainingKeyEvents", () => {
  it("keeps beats that are not yet in the draft", () => {
    const written = "Anna öffnet die Tür und sieht den Flur.";
    const events = "1. Anna öffnet die Tür. 2. Der Brief aus Marseille liegt auf dem Tisch.";
    expect(remainingKeyEvents(events, written)).toMatch(/Marseille/i);
  });
});

describe("wordCountOf", () => {
  it("counts words", () => {
    expect(wordCountOf("eins zwei drei")).toBe(3);
    expect(wordCountOf("   ")).toBe(0);
  });
});
