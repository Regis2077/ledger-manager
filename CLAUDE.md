# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Study-First Rule (Non-Negotiable)

This is a **study project**. The goal is not just to build — it is to deeply understand every decision.

**Before writing any code, creating any file, or running any command, Claude must:**

1. **Explain the concept** — what is it, why does it exist, what problem does it solve?
2. **Explain the design decision** — why this approach over alternatives? What are the trade-offs?
3. **Wait for confirmation** — only proceed to implementation after the student signals they understood and want to move forward.

This rule applies to everything: new files, new dependencies, schema changes, patterns, configurations, CLI commands, Docker steps — anything. No exceptions.

**The right flow is always: concept first → understanding confirmed → then build.**

---

## Project Overview

Fullstack asset ledger manager — a study project for production-grade patterns, targeting 100k+ records. Currently at Phase 0 (skeleton with health check). Uses a monorepo with two apps: `apps/api` (Fastify + Drizzle + PostgreSQL) and `apps/web` (Next.js 15 App Router).

## Commands

### Development

```bash
# Start both apps concurrently (from root)
npm run dev

# Start only the API
npm run dev -w apps/api

# Start only the web app
npm run dev -w apps/web
```

### Build

```bash
npm run build              # builds both apps
npm run build -w apps/api  # compiles TypeScript to apps/api/dist/
npm run build -w apps/web  # next build
```

### Database (run from root or inside apps/api)

```bash
npm run db:generate -w apps/api  # generate migration files from schema changes
npm run db:migrate -w apps/api   # apply migrations
npm run db:seed -w apps/api      # seed 100k records
```

### Docker (full stack including PostgreSQL)

```bash
docker compose up
```

### Testing

No test framework is configured yet (planned for Phase 5 with Jest + Supertest).

## Architecture

### 4-Layer API Pattern (apps/api)

Every feature follows this strict layering — no layer may skip another:

```
Route (Fastify plugin) → Controller → Service → Repository
```

- **Route**: HTTP semantics, Fastify schema validation, parameter extraction
- **Controller**: Orchestrates request/response, calls service
- **Service**: Pure business logic, database-agnostic (no Drizzle imports)
- **Repository**: Only place Drizzle ORM is used; all queries live here

### Frontend State (apps/web) — planned for Phase 2

- **TanStack Query**: server state (API data, caching, deduplication, retry)
- **Zustand**: client state (selections, filters, UI visibility) — uses `Map<id, Asset>` for O(1) lookups
- **Custom hooks**: composition layer for debounce, cursor management, abort controllers

### Key Design Decisions

- **Cursor-based pagination** (not OFFSET) for O(log n) on large datasets; `cursor` is a UUID, `limit` max 100
- **Pagination metadata via HTTP headers**: `X-Total-Count` and `Link` (RFC 8288), not in response body
- **UUID primary keys** (client-generated) for idempotency
- **`numeric` type for currency** values (no floating-point errors); currency stored as a separate field
- **Error format**: `{ error: string, code: string, requestId: string }` with `SCREAMING_SNAKE_CASE` codes
- Next.js configured with `output: "standalone"` for optimized Docker builds
- API runs on port **3001**, web on **3000**, PostgreSQL on **5432**

### Naming Conventions

- Files: `kebab-case.ts`
- Exported symbols: `camelCase` functions, `PascalCase` types/interfaces
- Database error codes: `SCREAMING_SNAKE_CASE`

### Environment Variables

Each app has a `.env.example`. The API requires `DATABASE_URL` (PostgreSQL connection string). Copy `.env.example` to `.env` in each app before running locally without Docker.