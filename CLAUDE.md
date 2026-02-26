# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Atena is a SaaS platform that automates lead handling for small businesses via AI-powered WhatsApp and Instagram messaging. Leads from paid traffic are responded to instantly by AI (Claude Sonnet 4), qualified via scoring, and escalated to human agents when needed.

**Current stage:** MVP in development (S-001 Foundation complete, S-002+ in progress).

**Language:** All documentation and user-facing content is in **Brazilian Portuguese**. Code (variables, functions, comments) should be in **English**.

## Documentation

Read the docs in this order for full context:

1. `docs/01-PRD.md` — Product requirements, personas, features by release
2. `docs/02-ARQUITETURA.md` — Architecture, tech stack, directory structure
3. `docs/03-MODELO-DE-DADOS.md` — Full database schema (SQL), scoring rules, stage transitions
4. `docs/04-FLUXO-IA-E-HANDOFF.md` — AI prompt engineering, handoff state machine, Telegram bot
5. `docs/05-SEGURANCA.md` — 5-layer prompt injection defense, validation rules
6. `docs/06-MODELO-DE-NEGOCIO.md` — Pricing, costs, margins
7. `docs/07-ROADMAP.md` — Development phases and task breakdown
8. `docs/08-GLOSSARIO.md` — Domain terminology
9. `docs/09-BACKLOG.md` — Backlog with epics, stories, acceptance criteria, and test specs

## Tech Stack

| Component | Technology |
|---|---|
| Monorepo | Turborepo + npm workspaces |
| API/Webhooks | Node.js + Fastify 5 |
| Queue | BullMQ 5 + Redis 7 |
| Database | PostgreSQL 16 + Drizzle ORM |
| AI | Claude API (Sonnet 4) via `@anthropic-ai/sdk` |
| WhatsApp | Z-API (MVP), Meta Cloud API (fallback), MockAdapter (dev) |
| Instagram | Meta Graph API |
| Notifications | Telegram Bot API |
| Frontend | React PWA + Vite + Tailwind (planned) |
| Real-time | SSE (Server-Sent Events) |
| Testing | Vitest 3 |
| Validation | Zod |
| Logging | Pino |
| Runtime | tsx (dev), Node.js 20+ (prod) |
| Infra | Docker Compose (dev), Docker + VPS Hetzner (prod) |

## Monorepo Structure

```
atena/
├── turbo.json                    # Turborepo pipeline config
├── package.json                  # Root: workspaces, shared devDeps
├── tsconfig.base.json            # Shared TS config (strict, ESM, ES2022)
├── docker-compose.yml
├── Dockerfile
├── .devcontainer/
├── .env.example
│
├── apps/
│   ├── api/                      # @atena/api — Fastify HTTP server
│   │   ├── src/
│   │   │   ├── index.ts          # Entry point
│   │   │   ├── server.ts         # Fastify setup (CORS, rate-limit, pino)
│   │   │   └── routes/
│   │   │       └── health.ts
│   │   └── __tests__/
│   │       └── health.test.ts
│   │
│   ├── workers/                  # @atena/workers — BullMQ job processors (future)
│   │   └── src/
│   │       └── index.ts
│   │
│   └── panel/                    # @atena/panel — React PWA frontend (future)
│       └── src/
│           └── main.tsx
│
├── packages/
│   ├── config/                   # @atena/config — Env validation (Zod), queue config
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── env.ts
│   │   │   └── queue.ts
│   │   └── __tests__/
│   │       └── env.test.ts
│   │
│   ├── database/                 # @atena/database — Drizzle schema, client, migrations
│   │   ├── drizzle.config.ts
│   │   └── src/
│   │       ├── index.ts
│   │       ├── client.ts
│   │       ├── schema.ts
│   │       ├── migrate.ts
│   │       └── seed.ts
│   │
│   ├── channels/                 # @atena/channels — Channel adapters
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── channel.interface.ts
│   │   │   ├── mock.adapter.ts
│   │   │   ├── zapi.adapter.ts
│   │   │   └── meta-whatsapp.adapter.ts
│   │   └── __tests__/
│   │       ├── mock.adapter.test.ts
│   │       ├── zapi.adapter.test.ts
│   │       ├── meta-whatsapp.adapter.test.ts
│   │       └── __fixtures__/
│   │           ├── zapi-payloads/
│   │           └── meta-payloads/
│   │
│   └── shared/                   # @atena/shared — Shared types, utilities
│       └── src/
│           └── index.ts
```

### Package dependency graph

```
apps/api ──────► @atena/config
   │──────────► @atena/database ──► @atena/config
   └──────────► @atena/channels

apps/workers ──► @atena/config
   │──────────► @atena/database
   └──────────► @atena/channels

apps/panel ───► (standalone, REST calls to api)
```

## Commands

```bash
# Root commands (run from project root)
npm run dev              # Start all apps in dev mode (turbo)
npm run build            # Build all packages/apps
npm run test             # Run all tests across workspaces
npm run test:unit        # Unit tests only
npm run typecheck        # tsc --noEmit across all workspaces
npm run format           # Prettier write
npm run format:check     # Prettier check

# Database commands (delegated to @atena/database)
npm run db:generate      # Generate Drizzle migrations from schema changes
npm run db:migrate       # Run migrations
npm run db:seed          # Seed test data
npm run db:studio        # Open Drizzle Studio (visual DB browser)

# Workspace-specific commands
npm run dev --workspace=@atena/api        # Start only the API server
npm run test --workspace=@atena/channels  # Test only channels package
npm run build --workspace=@atena/config   # Build only config package
```

### First-time setup

```bash
cp .env.example .env     # Edit with your credentials
docker compose up -d     # Start PostgreSQL 16 (port 5433) + Redis 7 (port 6379)
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

**Note:** PostgreSQL is mapped to host port **5433** (not 5432) to avoid conflicts with locally installed PostgreSQL. The `DATABASE_URL` in `.env.example` reflects this.

### DevContainer

Open in VS Code with Dev Containers extension — `.devcontainer/` handles PostgreSQL, Redis, Node.js 20, and npm install automatically. Inside the devcontainer, PostgreSQL is accessed via service name `postgres:5432` (internal port).

## Architecture

**Event-Driven Producer-Consumer pattern:**

```
Channels (WhatsApp/Instagram) → Fastify Webhooks → BullMQ Queue → AI Workers → Outbound Dispatcher
                                                                       ↓
                                                              PostgreSQL + Notifications (Telegram/SSE)
```

### Key architectural patterns

- **Multi-tenancy:** Shared DB/schema, all queries filtered by `tenant_id`, RLS as safety layer. Middleware injects `tenant_id` from JWT.
- **Channel Adapter:** All channels implement `ChannelAdapter` interface in `packages/channels/src/channel.interface.ts` (`parseInbound`, `sendMessage`, `sendMedia`, `validateWebhook`). Three adapters: `ZApiAdapter`, `MetaWhatsAppAdapter`, `MockAdapter` (for dev without API credentials).
- **Message Pipeline:** Inbound → sanitize (5-layer defense) → Claude API → validate response → send/handoff.
- **Conversation State Machine:** `ai` → `waiting_human` (timeout 30min → back to `ai`) → `human` → `closed` (reopens if lead messages within 7 days).

## Key Domain Concepts

- **Lead = unique phone per month.** Same person messaging in Feb = 1 lead. Same person in March = 1 new lead. Drives billing quotas.
- **Scoring:** Events add/subtract points (e.g., +30 "how to buy", -10 "24h no response"). Score thresholds drive stage transitions: 0-20 new, 21-60 qualifying, 61+ hot.
- **Handoff triggers:** explicit request for human, complaint intent, confidence < 70%, configurable per-tenant intent rules, score threshold, max AI turns (default 15).
- **AI responds even on handoff** — always answer the lead's question before transitioning.
- **Context-aware validation:** blocking rules consider tenant's business (e.g., churches can mention "God", clinics can use medical terms).

## Git Conventions

- **Commit messages must be in English**
- **Do NOT include `Co-Authored-By` trailers in commits**
- Conventional commits (semantic): `feat(api): ...`, `fix(ai): ...`, `test(scoring): ...`
- Drizzle schema in `packages/database/src/schema.ts` is the source of truth for the data model
- All IDs are UUID v4, all timestamps are TIMESTAMPTZ
- Env validation with Zod in `packages/config/src/env.ts` — lazy proxy, throws on invalid
- `MockAdapter` for local dev without Z-API/Meta credentials
- TDD approach: write test first, implement, refactor
- Test files co-located: `packages/channels/src/zapi.adapter.ts` → `packages/channels/__tests__/zapi.adapter.test.ts`
- Vitest with `globals: true` — no need to import `describe/it/expect`
- ESM throughout (`"type": "module"`, `.js` extensions in source imports)
- Target >80% test coverage by MVP
- Cross-package imports use `@atena/*` package names (e.g., `import { env } from '@atena/config'`)
- **Always update Bruno collections** — Whenever adding, changing, or removing an API endpoint, the corresponding `.bru` files in `collections/` MUST be updated in the same commit. This includes creating new files, updating request bodies/params, and keeping environment variables current.
- **Always update Linear issues** — After completing implementation of a feature or fix tracked in Linear, update the corresponding issue statuses to "Done" using the `linearis` CLI (`linearis issues update JS-XX --status "Done"`). This includes both parent issues and all sub-issues.

## API Collections (Bruno)

The `collections/` directory contains [Bruno](https://www.usebruno.com/) HTTP request collections for testing all API endpoints. Bruno files (`.bru`) are version-controlled and must stay in sync with the API routes.

**IMPORTANT: Whenever you add, change, or remove an API route in `apps/api/src/routes/`, you MUST update the corresponding Bruno collection files in `collections/`.** This includes:

- Creating new `.bru` files for new endpoints
- Updating request bodies, query params, and docs when schemas change
- Removing `.bru` files when endpoints are deleted
- Keeping environment variables in `collections/environments/` up to date

### Collection structure

```
collections/
├── bruno.json                          # Bruno project config
├── environments/
│   ├── Local.bru                       # localhost:3000
│   └── Docker.bru                      # Docker environment
├── Health/                             # GET /health
├── Webhooks/                           # POST /webhooks/whatsapp
├── Tenants/                            # /api/v1/tenants
├── Agents/                             # /api/v1/tenants/:tenantId/agents
├── Leads/                              # /api/v1/tenants/:tenantId/leads
├── Conversations/                      # /api/v1/tenants/:tenantId/conversations
├── Messages/                           # /api/v1/.../conversations/:id/messages
├── Notes/                              # /api/v1/.../conversations/:id/notes
├── Lead Events/                        # /api/v1/tenants/:tenantId/events
├── Security Incidents/                 # /api/v1/tenants/:tenantId/security-incidents
├── Billing/                            # /api/v1/tenants/:tenantId/billing
├── Dashboard/                          # /api/v1/tenants/:tenantId/dashboard
└── Admin/                              # /api/v1/admin (DLQ, queue status — X-Admin-Token)
```

### Bruno file conventions

- File names in **Brazilian Portuguese** (e.g., `Listar leads.bru`, `Criar agent.bru`)
- Docs section in **Brazilian Portuguese** describing expected behavior
- Use environment variables (`{{tenantId}}`, `{{agentId}}`, etc.) for dynamic IDs
- Disabled query params use `~` prefix (e.g., `~stage: hot`) for optional filters
- Sequence numbers (`seq`) control display order within each folder

## Development Notes

- **No Z-API or Meta Cloud API credentials available yet** — use `MockAdapter` for all channel operations during development. The mock stores sent messages in memory for test inspection.
- Channel adapters are interchangeable at runtime based on `tenant.whatsapp_provider` config.
- The health test sets its own env vars (`DATABASE_URL`, etc.) before importing the server module.
