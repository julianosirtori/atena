# Atena

AI-powered lead handling platform for WhatsApp and Instagram.

## What is Atena

Atena is a multi-tenant SaaS that automates lead response for small businesses. Leads from paid traffic on WhatsApp and Instagram are answered instantly by AI (Claude Sonnet 4), qualified via scoring, and escalated to human agents when needed. The platform includes a real-time admin panel, Telegram notifications, and usage-based billing.

## Tech Stack

| Component | Technology |
|---|---|
| Monorepo | Turborepo + npm workspaces |
| API / Webhooks | Node.js + Fastify 5 |
| Queue | BullMQ 5 + Redis 7 |
| Database | PostgreSQL 16 + Drizzle ORM |
| AI | Claude API (Sonnet 4) via `@anthropic-ai/sdk` |
| WhatsApp | Z-API (MVP), Meta Cloud API (fallback), MockAdapter (dev) |
| Instagram | Meta Graph API |
| Notifications | Telegram Bot API |
| Frontend | React PWA + Vite + Tailwind |
| Real-time | SSE (Server-Sent Events) |
| Testing | Vitest 3 |
| Validation | Zod |
| Logging | Pino |
| Runtime | tsx (dev), Node.js 20+ (prod) |
| Infra | Docker Compose (dev), Docker + VPS (prod) |

## Architecture

```
Channels (WhatsApp/Instagram)
        │
        ▼
  Fastify Webhooks ──► BullMQ Queue ──► AI Workers ──► Outbound Dispatcher
                                             │
                                             ▼
                                   PostgreSQL + Notifications
                                        (Telegram / SSE)
```

**Multi-tenancy** — Shared database with all queries filtered by `tenant_id`. Middleware injects tenant context from JWT.

**Channel Adapters** — All channels implement a common `ChannelAdapter` interface (`parseInbound`, `sendMessage`, `sendMedia`, `validateWebhook`). Adapters are swappable per tenant at runtime.

**Conversation State Machine** — `ai` → `waiting_human` (30 min timeout → back to `ai`) → `human` → `closed` (reopens if lead messages within 7 days).

**Message Pipeline** — Inbound → sanitize (5-layer prompt injection defense) → Claude API → validate response → send or handoff.

## Project Structure

```
atena/
├── apps/
│   ├── api/          # @atena/api — Fastify HTTP server, webhooks, REST routes
│   ├── workers/      # @atena/workers — BullMQ job processors (message pipeline)
│   └── panel/        # @atena/panel — React PWA admin frontend
│
├── packages/
│   ├── config/       # @atena/config — Env validation (Zod), queue config
│   ├── database/     # @atena/database — Drizzle schema, client, migrations, seed
│   ├── channels/     # @atena/channels — Channel adapters (Z-API, Meta, Mock)
│   └── shared/       # @atena/shared — Shared types and utilities
│
└── docs/             # Architecture, data model, AI flows, security, roadmap
```

**Dependency graph:**

```
apps/api ──────► @atena/config
   │──────────► @atena/database ──► @atena/config
   └──────────► @atena/channels

apps/workers ──► @atena/config
   │──────────► @atena/database
   └──────────► @atena/channels

apps/panel ───► (standalone, REST calls to api)
```

## Quick Start

**Prerequisites:** Node.js 20+, Docker, npm

```bash
# Clone and configure
git clone <repo-url> && cd atena
cp .env.example .env          # Edit with your credentials

# Start infrastructure
docker compose up -d           # PostgreSQL (port 5433) + Redis (port 6379)

# Install and set up
npm install
npm run db:migrate
npm run db:seed

# Run
npm run dev
```

The API starts at `http://localhost:3000`. Health check: `GET /health`.

**DevContainer:** Open in VS Code with the Dev Containers extension — `.devcontainer/` handles PostgreSQL, Redis, Node.js 20, and npm install automatically.

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start all apps in dev mode (turbo) |
| `npm run build` | Build all packages and apps |
| `npm run test` | Run all tests across workspaces |
| `npm run test:unit` | Unit tests only |
| `npm run typecheck` | `tsc --noEmit` across all workspaces |
| `npm run format` | Prettier write |
| `npm run format:check` | Prettier check |
| `npm run db:generate` | Generate Drizzle migrations from schema changes |
| `npm run db:migrate` | Run migrations |
| `npm run db:seed` | Seed test data |
| `npm run db:studio` | Open Drizzle Studio (visual DB browser) |

Run a command for a single workspace:

```bash
npm run dev --workspace=@atena/api
npm run test --workspace=@atena/channels
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Server port (default: `3000`) |
| `HOST` | No | Server host (default: `0.0.0.0`) |
| `NODE_ENV` | No | `development` / `production` |
| `LOG_LEVEL` | No | Pino log level (default: `debug`) |
| `DATABASE_URL` | **Yes** | PostgreSQL connection string |
| `REDIS_URL` | **Yes** | Redis connection string |
| `CLAUDE_API_KEY` | **Yes** | Anthropic API key for Claude |
| `ZAPI_INSTANCE_ID` | No | Z-API instance ID (use MockAdapter without it) |
| `ZAPI_TOKEN` | No | Z-API authentication token |
| `ZAPI_WEBHOOK_SECRET` | No | Z-API webhook signature secret |
| `META_WHATSAPP_TOKEN` | No | Meta Cloud API access token |
| `META_WHATSAPP_VERIFY_TOKEN` | No | Meta webhook verification token |
| `META_APP_SECRET` | No | Meta app secret for signature validation |
| `TELEGRAM_BOT_TOKEN` | No | Telegram bot token for notifications |

## API Endpoints

### Infrastructure

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/webhooks/whatsapp` | WhatsApp inbound webhook |

### Tenants

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/tenants` | List all tenants |
| GET | `/api/v1/tenants/:id` | Get tenant by ID |
| PUT | `/api/v1/tenants/:id` | Update tenant |

### Agents

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/tenants/:tenantId/agents` | List agents |
| POST | `/api/v1/tenants/:tenantId/agents` | Create agent |
| PUT | `/api/v1/tenants/:tenantId/agents/:agentId` | Update agent |
| DELETE | `/api/v1/tenants/:tenantId/agents/:agentId` | Delete agent |

### Leads

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/tenants/:tenantId/leads` | List leads (filter, paginate) |
| GET | `/api/v1/tenants/:tenantId/leads/:leadId` | Get lead by ID |
| PUT | `/api/v1/tenants/:tenantId/leads/:leadId` | Update lead |

### Conversations

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/tenants/:tenantId/conversations` | List conversations (filter, paginate) |
| GET | `/api/v1/tenants/:tenantId/conversations/:conversationId` | Get conversation by ID |

### Messages

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/tenants/:tenantId/conversations/:conversationId/messages` | Get messages (cursor pagination) |

### Notes

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/tenants/:tenantId/conversations/:conversationId/notes` | List notes |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/notes` | Create note |

### Lead Events

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/tenants/:tenantId/leads/:leadId/events` | Get events for lead |
| GET | `/api/v1/tenants/:tenantId/events` | Get all events (paginate) |

### Security Incidents

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/tenants/:tenantId/security-incidents` | List incidents (filter, paginate) |
| GET | `/api/v1/tenants/:tenantId/security-incidents/:incidentId` | Get incident by ID |
| PUT | `/api/v1/tenants/:tenantId/security-incidents/:incidentId` | Resolve incident |

### Billing & Dashboard

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/tenants/:tenantId/billing/monthly-counts` | Monthly lead counts |
| GET | `/api/v1/tenants/:tenantId/dashboard` | Dashboard metrics |

## Development Notes

- **No Z-API or Meta credentials needed** — use `MockAdapter` for all channel operations during development. It stores sent messages in memory for test inspection.
- **PostgreSQL runs on port 5433** (not 5432) to avoid conflicts with locally installed PostgreSQL. Inside DevContainer, use `postgres:5432`.
- **Panel proxy** — The React frontend (apps/panel) proxies API requests to the Fastify backend during development.
- **ESM throughout** — `"type": "module"` with `.js` extensions in source imports.

## Documentation

| # | File | Contents |
|---|---|---|
| 1 | [docs/01-PRD.md](docs/01-PRD.md) | Product requirements, personas, features by release |
| 2 | [docs/02-ARQUITETURA.md](docs/02-ARQUITETURA.md) | Architecture, tech stack, directory structure |
| 3 | [docs/03-MODELO-DE-DADOS.md](docs/03-MODELO-DE-DADOS.md) | Database schema (SQL), scoring rules, stage transitions |
| 4 | [docs/04-FLUXO-IA-E-HANDOFF.md](docs/04-FLUXO-IA-E-HANDOFF.md) | AI prompt engineering, handoff state machine, Telegram bot |
| 5 | [docs/05-SEGURANCA.md](docs/05-SEGURANCA.md) | 5-layer prompt injection defense, validation rules |
| 6 | [docs/06-MODELO-DE-NEGOCIO.md](docs/06-MODELO-DE-NEGOCIO.md) | Pricing, costs, margins |
| 7 | [docs/07-ROADMAP.md](docs/07-ROADMAP.md) | Development phases and task breakdown |
| 8 | [docs/08-GLOSSARIO.md](docs/08-GLOSSARIO.md) | Domain terminology |
| 9 | [docs/09-BACKLOG.md](docs/09-BACKLOG.md) | Backlog with epics, stories, acceptance criteria |

## Contributing

- **Commits:** Conventional commits in English — `feat(api): ...`, `fix(ai): ...`, `test(scoring): ...`
- **TDD:** Write tests first, implement, refactor. Target >80% coverage.
- **Tests:** Vitest with `globals: true` (no need to import `describe`/`it`/`expect`). Co-located test files: `src/foo.ts` → `__tests__/foo.test.ts`.
- **IDs:** UUID v4 for all entity IDs, TIMESTAMPTZ for all timestamps.
- **Schema:** Drizzle schema in `packages/database/src/schema.ts` is the source of truth.
- **Env:** Validated with Zod in `packages/config/src/env.ts` — lazy proxy, throws on invalid access.
- **Imports:** Cross-package imports use `@atena/*` names (e.g., `import { env } from '@atena/config'`).

## License

TBD
