---
name: Generation checkpoint safety
description: Reliability rules for streamed chapter generation, resume behavior, and final promotion.
---

Only validated segment boundaries should be persisted as resumable generation content. Raw streaming previews can end in a partial sentence and cause a resume to duplicate or continue invalid text.

**Why:** Provider streams can fail after yielding text but before a segment has a trustworthy finish reason or quality result. Treating that preview as a checkpoint makes recovery less safe than restarting from the previous boundary.

**How to apply:** Keep browser deltas independent from persisted checkpoints. Promote the validated chapter, optional narrative handoff, completed job marker, logs, and completed revision inside one database transaction so a late failure leaves the prior chapter unchanged.

Remaining continuation bugs after Task #42 are listed in [generation-continuation-hardening.md](generation-continuation-hardening.md). Do not reopen checkpoint-into-`chapters` as a workaround.