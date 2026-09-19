---
name: Production-to-development data sync
description: Safe procedure and boundary for deliberately refreshing Development from the live Replit database.
---

Treat Production as read-only and Development as the only writable target during a deliberate live-to-development refresh. Confirm that replacing Development is intended, create a Development backup first, transfer dependent tables in foreign-key order inside one transaction, and verify row counts plus checksums for large text fields afterward.

**Why:** A live refresh is broader than copying newly visible projects; it can replace users, chapters, outlines, characters, and generation logs. Production must remain untouched and a failed import must not leave Development silently half-restored.

**How to apply:** Compare both environments before writing. Prefer Replit's documented `pg_dump`/`pg_restore` path when the Production connection string is available; otherwise use a bounded read-only Production snapshot and a transactional Development restore. Never infer that an empty schema diff means the data is synchronized. Never commit `pg_dump` output, `romanforge_export.sql`, password hashes, or live chapter text to git. Keep dumps on the Replit disk or a private backup, not in this public repository.