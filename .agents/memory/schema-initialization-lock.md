---
name: Concurrent schema initialization
description: Why first-request database setup needs a PostgreSQL-level lock in this Next.js application.
---

When schema setup runs lazily from request handlers, protect the DDL with a PostgreSQL advisory lock and a transaction. A process-local promise is not sufficient because Next.js may evaluate route modules independently and development requests may arrive concurrently.

**Why:** Concurrent `CREATE TABLE IF NOT EXISTS` calls can still collide inside PostgreSQL while registering the table type, producing a duplicate `pg_type` error.

**How to apply:** Any future lazy schema migration invoked by authentication or API requests must use the same database-level serialization pattern and remain idempotent.