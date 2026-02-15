# Arquitetura Técnica

## Visão Geral

O sistema segue uma arquitetura **Event-Driven** com padrão **Producer-Consumer**. Mensagens chegam de múltiplos canais, são enfileiradas para processamento assíncrono, passam pela IA, e retornam ao lead pelo mesmo canal.

## Diagrama de Alto Nível

```
                    ┌──────────────┐     ┌──────────────┐
                    │  WhatsApp    │     │  Instagram   │
                    │  (Z-API /    │     │  (Meta       │
                    │   Meta API)  │     │   Graph API) │
                    └──────┬───────┘     └──────┬───────┘
                           │                     │
                           ▼                     ▼
                    ┌────────────────────────────────────┐
                    │         API Gateway (Fastify)      │
                    │      Webhooks + Rate Limiting      │
                    │      Tenant Resolution             │
                    └──────────────┬─────────────────────┘
                                   │
                                   ▼
                    ┌────────────────────────────────────┐
                    │       Message Queue (BullMQ)       │
                    │            Redis Streams           │
                    └──────────────┬─────────────────────┘
                                   │
                          ┌────────┴────────┐
                          ▼                 ▼
                   ┌─────────────┐  ┌──────────────┐
                   │  AI Worker  │  │  AI Worker   │
                   │  (process)  │  │  (process)   │
                   └──────┬──────┘  └──────┬───────┘
                          │                │
                          ▼                ▼
                   ┌────────────────────────────────┐
                   │         PostgreSQL              │
                   │  tenants, leads, conversations  │
                   │  messages, pipeline, agents     │
                   └────────────────┬───────────────┘
                                    │
                          ┌─────────┴──────────┐
                          ▼                    ▼
                   ┌─────────────┐     ┌──────────────┐
                   │  Outbound   │     │  Notification │
                   │  Dispatcher │     │  Service      │
                   │  (WhatsApp/ │     │  (Telegram    │
                   │   Instagram)│     │   Bot / PWA)  │
                   └─────────────┘     └──────────────┘
```

## Stack Tecnológica

| Componente | Tecnologia | Justificativa |
|---|---|---|
| API / Webhooks | Node.js + Fastify | Performance, ecossistema rico, familiaridade |
| Fila de mensagens | BullMQ + Redis | Retry automático, dead letter queue, concurrency control |
| Banco de dados | PostgreSQL | JSONB, ACID, full-text search |
| ORM | Drizzle ORM | Type-safe, SQL-like, leve, migrations nativas |
| IA | Claude API (Sonnet 4) | Custo-benefício, excelente em português |
| WhatsApp | Z-API (inicial) + Meta Cloud API (oficial) | Z-API para MVP rápido, Meta API para compliance |
| Instagram | Meta Graph API | Única opção oficial para DMs |
| Notificações | Telegram Bot API | Gratuito, botões inline, sem limites |
| Painel/CRM | React (PWA) | Funciona como app no celular, sem App Store |
| Real-time | SSE (Server-Sent Events) | Mais simples que WebSocket, unidirecional server→client é suficiente pro painel |
| Testes | Vitest | Rápido, compatível com TypeScript, API similar ao Jest |
| Infra | Docker + VPS (Hetzner) | Custo baixo (~€5-10/mês), data centers EU, boa performance |

### Por que SSE e não WebSocket

O painel precisa de atualizações em tempo real (novo lead, nova mensagem, mudança de status). SSE é suficiente porque:

- A comunicação é unidirecional: server → client (notificações)
- Ações do atendente (responder, assumir, devolver) usam chamadas REST normais
- SSE reconecta automaticamente, sem lib extra
- Menos complexidade que Socket.io (sem necessidade de rooms, namespaces, etc.)

Se no futuro precisar de bidirecional (chat ao vivo entre atendentes), migrar para WebSocket.

## Padrões Arquiteturais

| Padrão | Onde é aplicado |
|---|---|
| Event-Driven Architecture | Arquitetura geral — tudo reage a eventos |
| Producer-Consumer | API produz tarefas, Workers consomem |
| Message Queue | BullMQ como broker entre API e Workers |
| Pipeline (Pipes and Filters) | Mensagem passa por: recepção → sanitização → IA → validação → envio |
| Human-in-the-Loop (HITL) | IA decide quando escalar para humano |
| Multi-tenant | Todos os clientes na mesma infra, isolados por tenant_id |
| Adapter Pattern | Canal de comunicação abstraído (Z-API, Meta API, Instagram) |
| RAG simplificado | Histórico do lead injetado no prompt antes de chamar a IA |

## Estrutura de Diretórios

```
project/
├── src/
│   ├── api/                        # Fastify - webhooks e API REST
│   │   ├── webhooks/
│   │   │   ├── whatsapp.ts
│   │   │   └── instagram.ts
│   │   ├── routes/
│   │   │   ├── leads.ts
│   │   │   ├── conversations.ts
│   │   │   ├── agents.ts
│   │   │   ├── tenants.ts
│   │   │   └── dashboard.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts             # JWT + refresh tokens
│   │   │   └── tenant.ts           # Injeta tenant_id no contexto
│   │   └── server.ts
│   │
│   ├── workers/                    # Processadores de fila
│   │   ├── message.worker.ts       # Processa mensagens com IA
│   │   ├── notification.worker.ts  # Envia notificações
│   │   ├── scoring.worker.ts       # Atualiza scores
│   │   └── scheduled.worker.ts     # Cron jobs (reset leads, follow-up futuro)
│   │
│   ├── channels/                   # Adapters de canal
│   │   ├── channel.interface.ts
│   │   ├── zapi.adapter.ts
│   │   ├── meta-whatsapp.adapter.ts
│   │   └── instagram.adapter.ts
│   │
│   ├── ai/                         # Integração com IA
│   │   ├── claude.service.ts
│   │   ├── prompt.builder.ts
│   │   ├── response.parser.ts
│   │   └── prompt.guard.ts
│   │
│   ├── services/                   # Lógica de negócio
│   │   ├── lead.service.ts
│   │   ├── conversation.service.ts
│   │   ├── handoff.service.ts
│   │   ├── scoring.service.ts
│   │   ├── tenant.service.ts
│   │   └── billing.service.ts      # Contagem de leads, limites
│   │
│   ├── notifications/
│   │   ├── telegram.bot.ts
│   │   └── sse.service.ts          # Server-Sent Events pro painel
│   │
│   ├── db/
│   │   ├── schema.ts               # Drizzle schema (source of truth)
│   │   ├── migrations/
│   │   ├── seed.ts                 # Dados de teste
│   │   └── client.ts               # Conexão e instância do Drizzle
│   │
│   └── config/
│       ├── env.ts
│       └── queue.ts
│
├── __tests__/                      # Testes
│   ├── unit/                       # Testes unitários (sem I/O)
│   │   ├── ai/
│   │   │   ├── prompt.builder.test.ts
│   │   │   ├── prompt.guard.test.ts
│   │   │   └── response.parser.test.ts
│   │   └── services/
│   │       ├── scoring.test.ts
│   │       └── handoff.test.ts
│   ├── integration/                # Testes com banco real
│   │   ├── webhooks/
│   │   ├── workers/
│   │   └── services/
│   ├── e2e/                        # Testes manuais com APIs reais
│   │   ├── zapi.e2e.ts
│   │   └── claude.e2e.ts
│   ├── __fixtures__/               # Payloads reais de webhook
│   │   ├── zapi-payloads/
│   │   ├── meta-payloads/
│   │   └── tenants/
│   └── setup.ts                    # Setup do banco de teste
│
├── panel/                          # Frontend React (PWA)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Leads.tsx
│   │   │   ├── Chat.tsx
│   │   │   ├── Pipeline.tsx
│   │   │   └── Settings.tsx
│   │   └── components/
│   └── vite.config.ts
│
├── docker-compose.yml
├── Dockerfile
├── drizzle.config.ts
├── vitest.config.ts
└── README.md
```

## Fluxo de Processamento de Mensagem

```
1. Lead manda mensagem no WhatsApp
       │
       ▼
2. Z-API/Meta recebe → dispara webhook POST /webhooks/whatsapp
       │
       ▼
3. API Gateway (Fastify):
   a. Valida assinatura do webhook
   b. Identifica tenant pelo número de WhatsApp
   c. Busca ou cria lead pelo telefone (upsert)
   d. Atualiza contagem mensal se lead novo no mês
   e. Salva mensagem inbound
   f. Publica na fila: { tenant_id, lead_id, message, channel }
   g. Responde 200 OK em < 100ms
       │
       ▼
4. Message Worker consome da fila:
   a. Carrega tenant (prompt, config, handoff_rules)
   b. Carrega conversa (status, histórico)
   c. Verifica estado:
      - status === 'human' → ignora (msg vai pro painel via SSE)
      - status === 'closed' → reabre como 'ai', carrega últimas 5 msgs como contexto
      - status === 'ai' → continua processamento
   d. Sanitiza mensagem (prompt guard)
   e. Monta prompt: system + knowledge + últimas 10 msgs + mensagem atual
   f. Chama Claude API
   g. Parseia resposta JSON (intent, confidence, should_handoff, score_delta)
   h. Valida resposta (anti-leak, anti-off-topic, anti-over-promise)
   i. Se inválida → mensagem genérica + handoff
   j. Se válida → continua
       │
       ▼
5. Pós-processamento:
   a. Salva mensagem outbound no banco
   b. Atualiza score do lead
   c. Avalia se intent gera handoff (conforme config do tenant)
   d. Se should_handoff:
      - Envia resposta da IA pro lead primeiro (responde a pergunta!)
      - Envia mensagem de transição
      - Muda conversation.status → 'waiting_human'
      - Dispara notificação (Telegram + SSE)
      - Gera resumo da conversa
   e. Se não handoff:
      - Envia resposta pro lead via channel adapter
```

## Multi-Tenancy

O sistema usa **multi-tenancy por filtro** (shared database, shared schema). Todas as tabelas possuem `tenant_id` e todas as queries filtram por ele.

### Isolamento garantido por:

- `tenant_id` obrigatório (NOT NULL) em todas as tabelas
- Middleware Fastify que injeta `tenant_id` em todo request autenticado
- Drizzle queries sempre incluem `.where(eq(table.tenantId, ctx.tenantId))`
- Row Level Security (RLS) do PostgreSQL como camada extra de segurança

```sql
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON leads
    USING (tenant_id = current_setting('app.current_tenant')::uuid);
```

## Channel Adapter Pattern

Cada canal de comunicação implementa uma interface comum:

```typescript
interface ChannelAdapter {
  parseInbound(payload: unknown): InboundMessage
  sendMessage(to: string, content: string, options?: SendOptions): Promise<DeliveryResult>
  sendMedia(to: string, media: MediaPayload): Promise<DeliveryResult>
  validateWebhook(req: FastifyRequest): boolean
}

interface InboundMessage {
  externalId: string
  from: string               // Telefone ou ID do remetente
  content: string
  mediaUrl?: string
  mediaType?: 'image' | 'audio' | 'video' | 'document'
  timestamp: Date
  channel: 'whatsapp' | 'instagram'
  raw: unknown               // Payload original pra debug
}
```

**Benefício:** trocar de Z-API para Meta API, ou adicionar Instagram, é trocar de adapter. O worker e toda a lógica de IA não mudam.

## Scheduled Workers (Cron Jobs)

| Job | Frequência | Ação |
|---|---|---|
| `reset-monthly-leads` | Dia 1, 00:00 UTC-3 | Reseta `leads_used_this_month` de todos os tenants |
| `decay-scores` | Diário, 03:00 | Aplica -10/-20 em leads que não responderam em 24h/48h |
| `close-stale-conversations` | Diário, 04:00 | Fecha conversas sem atividade há 7+ dias |
| `follow-up` (Beta) | A cada 1h | Envia follow-up para leads que esfriaram (configurável por tenant) |
| `cleanup-old-messages` (v1.0) | Semanal | Remove mensagens > prazo de retenção (LGPD) |

Implementados via BullMQ Repeatable Jobs, não crontab do sistema.

## Escalabilidade

| Volume | Infra | Workers | Observação |
|---|---|---|---|
| Até 500 leads/dia | VPS 2GB (Hetzner CX22, ~€5/mês) | 1 | Suficiente para ~50 tenants no Starter |
| 500–2.000 leads/dia | VPS 4GB (Hetzner CX32, ~€10/mês) | 2–3 | Escala horizontal de workers |
| 2.000–10.000 leads/dia | Cloud (AWS/GCP) | 5–10 | Banco dedicado, Redis cluster |
| 10.000+ leads/dia | Kubernetes | Auto-scale | Múltiplas réplicas, sharding |

O gargalo não é o Node.js — é o tempo de resposta da Claude API (~2-5s por chamada). Workers paralelos resolvem isso.
