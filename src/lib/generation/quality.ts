import { detectDegeneration } from "@/lib/openrouter";
import { wordCountOf } from "@/lib/generation/stitch";

export type QualityResult =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Checks a candidate after a streamed segment has been stitched.
 *
 * Very short candidates are intentionally allowed while a stream is still
 * arriving. The caller should run this after a meaningful segment or at the
 * finalization boundary.
 */
export function validateCandidateText(
  text: string,
  expectedLanguage?: string,
  options: { minimumWords?: number } = {},
): QualityResult {
  const normalized = (text || "").trim();
  if (!normalized) return { ok: false, reason: "Der generierte Text ist leer." };

  const minimumWords = options.minimumWords ?? 0;
  if (wordCountOf(normalized) < minimumWords) {
    return {
      ok: false,
      reason: `Der Text ist mit ${wordCountOf(normalized)} Wörtern noch zu kurz (Minimum: ${minimumWords}).`,
    };
  }

  // Do not reject a tiny in-flight prefix. Degeneration checks are meaningful
  // once enough text exists to establish a pattern.
  if (wordCountOf(normalized) < 80) return { ok: true };

  return detectDegeneration(normalized, expectedLanguage);
}

export function isLengthLikeFinishReason(reason: string | null | undefined): boolean {
  const normalized = String(reason || "").trim().toLowerCase();
  return ["length", "max_tokens", "max_output_tokens", "token_limit", "incomplete"].includes(normalized);
}

export function isIncompleteFinishReason(reason: string | null | undefined): boolean {
  const normalized = String(reason || "").trim().toLowerCase();
  return !normalized || isLengthLikeFinishReason(normalized) || ["content_filter", "error"].includes(normalized);
}