import { describe, expect, it } from "vitest";
import { isLengthLikeFinishReason, validateCandidateText } from "@/lib/generation/quality";

describe("generation quality", () => {
  it("recognizes provider variants of a length stop", () => {
    expect(isLengthLikeFinishReason("length")).toBe(true);
    expect(isLengthLikeFinishReason("max_tokens")).toBe(true);
    expect(isLengthLikeFinishReason(null)).toBe(false);
  });

  it("allows short in-flight prefixes but rejects a short final candidate", () => {
    expect(validateCandidateText("Ein kurzer Anfang.").ok).toBe(true);
    expect(validateCandidateText("Ein kurzer Anfang.", "Deutsch", { minimumWords: 20 }).ok).toBe(false);
  });

  it("rejects a repeated-word degeneration in a meaningful candidate", () => {
    const repeated = Array.from({ length: 120 }, () => "Wiederholung").join(" ");
    expect(validateCandidateText(repeated, "Deutsch").ok).toBe(false);
  });
});