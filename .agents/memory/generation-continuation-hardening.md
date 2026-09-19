---
name: Generation continuation hardening
description: Follow-up work after Task #42. Close remaining word-salad paths without splitting chapters or writing unvalidated stream text into chapters.
---

This is a work order for the Replit agent. Task #42 is correct and must stay. Do not revert checkpoints-only-in-jobs, transactional `finalizeGeneratedChapter`, word-overlap stitch, per-segment `validateCandidateText`, or reconnect-vs-resume.

The remaining word salad comes from **continuing a chapter that was already finished or already broken**, not from missing checkpoints.

## Hard constraints (do not violate)

- Keep a chapter as **one literary generation**. Do not split it into independent scene/LLM calls.
- Do not wrap chapter prose in JSON. Handoff JSON stays a separate short call.
- Reconnect (`body.job_id` → `tailExistingJob`) is not Continuation (`resume_job_id` / attempt > 0).
- Raw stream fragments must not be written to `chapters` or to `content_so_far`. Only validated checkpoints.
- Do not restore `romanforge_export.sql` or any other database dump into git. The public repo already leaked bcrypt hashes; the dump is removed on purpose.
- Do not commit JWT secrets, `.env`, or live user data.

## 1. Client: reconnect stays, failed jobs must not auto-fire

File: `src/app/project/[id]/page.tsx`, function `generateChapter` (around the `type === "error"` branch).

Current bug:

```ts
const resumableError =
  localJobId &&
  reconnectAttempt < 1 &&
  !/abgebrochen|abort/i.test(String(msg.error || ""));
if (resumableError) {
  await generateChapter(chapterNumber, signal, localJobId || undefined, reconnectAttempt + 1, true);
  return;
}
```

This sends `resume_job_id` after **quality rejects** and after **incomplete finish**. That immediately starts another model call on a job that just failed. That is how salad gets a second and third chance without a human looking at the draft.

Required behavior:

| Event | Body | Function |
| --- | --- | --- |
| HTTP dropped, no `done`/`error` | `{ chapter_number, job_id }` | `tailExistingJob` only. Keep this. |
| `catch` network error while a job is running | `{ chapter_number, job_id }` | Reconnect. Keep this. |
| Stream `type: "error"` (quality, incomplete stop, provider error, abort) | none | `alert(msg.error)`, stop. **Do not** pass `resumeFailedJob=true`. |
| User clicks an explicit "Vom letzten Checkpoint fortsetzen" | `{ chapter_number, resume_job_id }` | New, optional. Only this path may resume a `failed`/`aborted` job. |

Implementation notes:

- Delete the `resumableError` auto-call, or restrict it so `resumeFailedJob` can never be set from a stream error.
- Keep `reconnectAttempt < 1` only for the **silent reconnect** path (`!sawDone && !sawError` and the `catch` block). Those must keep sending `job_id`, never `resume_job_id`.
- If you add a resume button, show `job.error_message` and the checkpoint word count first. Do not silently retry.

## 2. Finish reasons: split length / stop / hard fail / missing

File: `src/lib/generation/quality.ts`.

`isIncompleteFinishReason` currently treats empty, `length`, `content_filter`, and `error` the same. The generate route then continues:

```ts
const needsContinuation =
  isIncompleteFinishReason(finishReason) ||
  wordCountOf(assembled) < minimumChapterWords;
```

That is wrong.

Replace with three predicates (names can vary, tests must lock the behavior):

```ts
export function isStopLikeFinishReason(reason: string | null | undefined): boolean {
  const n = String(reason || "").trim().toLowerCase();
  return ["stop", "end_turn", "eos", "completed", "finish"].includes(n);
}

export function isLengthLikeFinishReason(reason: string | null | undefined): boolean {
  const n = String(reason || "").trim().toLowerCase();
  return ["length", "max_tokens", "max_output_tokens", "token_limit", "incomplete"].includes(n);
}

export function isHardFailFinishReason(reason: string | null | undefined): boolean {
  const n = String(reason || "").trim().toLowerCase();
  return ["content_filter", "error"].includes(n);
}
```

Decision table for the loop in `src/app/api/projects/[id]/chapters/generate/route.ts` after a validated stitch:

1. `isHardFailFinishReason(finishReason)` → `finishJob(..., "failed")` with the **previous** `assembled` (do not keep the filtered/error piece). No continuation. Send error. Return.
2. `isLengthLikeFinishReason(finishReason)` OR `wordCountOf(assembled) < minimumChapterWords` → continue only if `attempt < MAX_CONTINUATIONS`. Before the next call, trim to last sentence boundary (item 3). Cap continuation tokens (item 5).
3. `isStopLikeFinishReason(finishReason)` AND word count ≥ minimum → `break` the loop. This is a finished chapter.
4. **Missing** `finish_reason` (`null`/empty):
   - If word count ≥ minimum **and** the text ends with sentence punctuation (`/[.!?…]["'”»)]*\s*$/u`) → treat as complete, `break`. Do **not** keep writing.
   - Otherwise → at most **one** continuation, then stop. Do not run all three continuations just because the provider omitted the field.

Finalization after the loop:

- Do **not** fail a chapter solely because `finish_reason` was empty if the missing-stop heuristic above already accepted it.
- Still fail if word count < `minimumChapterWords` (300 screenplay / 1800 novel) or `validateCandidateText(..., { minimumWords })` fails.
- `length` after `MAX_CONTINUATIONS` still means: keep checkpoint, mark job `failed` with a clear message, do **not** `finalizeGeneratedChapter`.

Add tests in `src/lib/generation/quality.test.ts` for: `stop`, `length`, `max_tokens`, `content_filter`, `error`, `null`, `""`. Also test a helper like `shouldContinueGeneration({ reason, wordCount, minimumWords, textEndsWithSentence })` if you extract the table.

## 3. Trim to the last sentence before a continuation

File: `src/lib/generation/stitch.ts`.

Today a `length` stop can leave `assembled` mid-sentence. `buildContinuationUserPrompt` then says “Beginne mit dem nächsten vollständigen Satz”. The glue in `stitchContinuation` becomes a space. Result: `Er ging zur` + `Dann öffnete er die Tür.`

Add:

```ts
export function trimToLastSentenceBoundary(text: string): string {
  const trimmed = (text || "").replace(/\s+$/, "");
  if (!trimmed) return "";
  if (/[.!?…]["'”»)]*$/u.test(trimmed)) return trimmed;
  const match = trimmed.match(/^[\s\S]*[.!?…]["'”»)]*/u);
  if (!match) return trimmed; // no boundary at all; keep text, do not invent an ending
  const cut = match[0].replace(/\s+$/, "");
  // Refuse a tiny leftover (would throw away the chapter).
  if (wordCountOf(cut) < Math.min(80, Math.floor(wordCountOf(trimmed) * 0.5))) return trimmed;
  return cut;
}
```

Call it in the generate route **after** a successful quality check and **before** `checkpoint`, but **only** when the next action is a continuation (`length` or too short), not when the chapter is done.

Do not trim away a complete last sentence. Tests in `src/lib/generation/stitch.test.ts`:

- `"Er ging zur Tür. Dann sah er"` → `"Er ging zur Tür."`
- `"Er ging zur Tür."` → unchanged
- a text without any `.!?` → unchanged
- a 10-word dangling clause after a long paragraph → paragraph kept, clause dropped

`stitchContinuation` glue: if existing already ends with sentence punctuation, `\n\n` is acceptable. After the trim, that should be the normal path.

## 4. Persist the real attempt; empty checkpoints must restart at attempt 0

File: `src/app/api/projects/[id]/chapters/generate/route.ts`, `checkpoint`, plus resume math.

Current bugs:

```ts
attempt: source === "continue" ? 1 : 0,
```

Every continuation overwrites `chapter_generation_jobs.attempt` with `1`. Resume then does:

```ts
const startingAttempt = resuming
  ? Math.min(MAX_CONTINUATIONS, Math.max(1, Number(job.attempt || 1)))
  : 0;
```

Two failures:

- After a **failed first segment**, `content_so_far` is still `""` (good: the bad piece was discarded), but resume starts at attempt `1` and uses `buildContinuationUserPrompt` on empty text instead of `_userPrompt`.
- After continuation 2 or 3, resume still thinks attempt is `1` and may continue three more times.

Required:

```ts
const checkpoint = async (source: string, completedAttempt: number) => {
  await touchJob(job.id, {
    content_so_far: assembled,
    event_seq: seq,
    attempt: completedAttempt,
    // ...
  });
  // ...
};

// after a validated segment:
await checkpoint(attempt === 0 ? "checkpoint" : "continue", attempt);
```

On abort **during** a stream, do **not** write `attempt` forward. Either omit `attempt` in that `touchJob` or pass the last **validated** attempt. `assembled` is still the previous checkpoint; keep it that way. Do not checkpoint the in-flight `piece`.

Resume:

```ts
const assembledSoFar = resuming ? (job.content_so_far || "") : "";
const hasUsableCheckpoint = wordCountOf(assembledSoFar) >= 80;
const startingAttempt = !resuming
  ? 0
  : hasUsableCheckpoint
    ? Math.min(MAX_CONTINUATIONS, Number(job.attempt || 0) + 1)
    : 0;
```

If `!hasUsableCheckpoint`, use `_userPrompt` (full chapter prompt), not the continuation prompt.

## 5. Continuation budget must shrink once the minimum is met

Same generate route:

```ts
const remainingWords = Math.max(500, minimumChapterWords - wordCountOf(assembled));
const requestMaxTokens = attempt === 0
  ? maxTokens
  : Math.min(maxTokens, Math.max(1800, Math.ceil(remainingWords * 1.7)));
```

If the chapter already has 4000 words and `finish_reason` was missing or `length`, this still requests ≥ 1800 tokens. That extra tail is a common salad generator.

Required:

- Attempt 0: keep `maxTokens` (16000 novel / 6000 screenplay).
- Continuation **below** `minimumChapterWords`: `max_tokens ≈ ceil((minimumChapterWords - wordCount) * 1.7)`, floor 800, cap `maxTokens`.
- Continuation **at or above** minimum, only because of `length`: floor 400, cap 900. Prompt already says write only what is needed to close the scene.
- If word count ≥ minimum and finish is stop-like or accepted-missing: **no** continuation (item 2).

Also pass the same remaining-word number into `buildContinuationUserPrompt`. Do not tell the model “ungefähr 0 Wörter” while requesting 1800 tokens.

## 6. Quality-check the new piece, not only the stitched whole

File: `src/lib/generation/quality.ts` and the generate route after `stitchContinuation`.

`validateCandidateText` skips degeneration below 80 words, then runs `detectDegeneration` on the **entire** `candidate`. A 120-word salad tail can be diluted by 3000 good words (especially the 25%-single-token rule in `src/lib/openrouter.ts`).

Required, after stitch, before accepting `assembled = candidate`:

1. `validateCandidateText(piece, lang)` when `wordCountOf(piece) >= 80`.
2. Always run the cheap loop regexes on `piece` even if it is shorter: the `\p{L}{2,30}` 10× token loop and the 7× phrase loop from `detectDegeneration`. Extract them if you have to; do not fail a 20-word piece for “too short”.
3. Keep the existing whole-candidate check.

If the piece fails: `finishJob` with `content_so_far: assembled` (**previous** text, already the current code for the whole-candidate fail). Do not write the bad piece.

## 7. Tests you must add

- `quality.test.ts`: stop vs length vs content_filter vs empty; missing finish + sentence end ⇒ do not continue; missing finish + mid-sentence + short text ⇒ continue.
- `stitch.test.ts`: `trimToLastSentenceBoundary` cases above; existing overlap tests must still pass.
- `page.tsx`: if you can test the client helper, assert stream errors do not set `resume_job_id`. If not extracted, keep the logic in one obvious `if` so a reviewer can see it.
- Do not weaken `outline-replace.test.ts` or handoff “truncated JSON ⇒ null”.

## 8. Verification

- `npx tsc --noEmit`
- `npx vitest run`
- `npx next build` if env allows
- `git diff --check`
- Manual: start a chapter, abort → existing chapter unchanged; reconnect mid-run → same `job_id`, no second writer; fail quality → alert, **no** second request in the network tab; explicit resume only from a checkpoint with ≥ 80 words uses continuation prompt.

## 9. Out of scope

- Do not change JWT / IDOR / unique `(project_id, chapter_number)` / transactional outline replace.
- Do not put stream previews back into `chapters`.
- Do not reintroduce brace-append JSON repair in `handoff.ts`.
- Do not commit SQL dumps. If a dump appears on disk, leave it untracked.
