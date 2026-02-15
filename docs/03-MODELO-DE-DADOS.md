# Modelo de Dados

## Diagrama ER Simplificado

```
tenants ─┬──< leads ──< conversations ──< messages
         │       │              │
         │       │              └──< conversation_notes
         │       └──< lead_events
         │
         ├──< agents
         │
         └──< monthly_lead_counts
```

## Convenções

- **ORM:** Drizzle ORM (schema em TypeScript, migrations geradas)
- **IDs:** UUID v4 em todas as tabelas
- **Timestamps:** TIMESTAMPTZ com default `now()`
- **Multi-tenant:** `tenant_id` NOT NULL + foreign key em todas as tabelas
- **Soft delete:** não usado no MVP (hard delete com LGPD no futuro)

## Schema SQL

> O source of truth será o arquivo `src/db/schema.ts` do Drizzle. O SQL abaixo serve como referência e documentação.

### Tenants (clientes da plataforma)

```sql
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,

    -- Plano e limites
    plan TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'pro', 'scale')),
    leads_limit INT NOT NULL DEFAULT 300,
    agents_limit INT NOT NULL DEFAULT 1,

    -- Configuração do negócio (alimenta o prompt)
    business_name TEXT NOT NULL,
    business_description TEXT,
    products_info TEXT,
    pricing_info TEXT,                              -- preços (separado de products_info)
    faq TEXT,
    business_hours TEXT,
    payment_methods TEXT,
    custom_instructions TEXT,

    -- Configuração de canais
    whatsapp_provider TEXT DEFAULT 'zapi' CHECK (whatsapp_provider IN ('zapi', 'meta_cloud')),
    whatsapp_config JSONB DEFAULT '{}',
    instagram_config JSONB DEFAULT '{}',
    telegram_bot_config JSONB DEFAULT '{}',

    -- Configuração de handoff (configurável por tenant)
    handoff_rules JSONB NOT NULL DEFAULT '{
        "score_threshold": 60,
        "max_ai_turns": 15,
        "business_hours_only": false,
        "handoff_intents": ["complaint"],
        "auto_handoff_on_price": false,
        "follow_up_enabled": false,
        "follow_up_delay_hours": 24
    }',

    -- Billing
    stripe_customer_id TEXT,
    billing_status TEXT NOT NULL DEFAULT 'trial'
        CHECK (billing_status IN ('trial', 'active', 'past_due', 'cancelled')),
    trial_ends_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
```

**Mudanças vs versão anterior:**
- `business_name` agora NOT NULL (obrigatório no onboarding)
- `pricing_info` separado de `products_info` (eram duplicados no prompt)
- `handoff_rules.handoff_intents` substituiu `always_handoff_intents` — array configurável, default só `complaint`
- `handoff_rules.auto_handoff_on_price` — flag explícita para handoff ao perguntar preço (default false)
- `handoff_rules.follow_up_enabled` e `follow_up_delay_hours` — preparação para follow-up automático
- `leads_used_this_month` removido — substituído pela tabela `monthly_lead_counts`

### Monthly Lead Counts (contagem mensal de leads)

```sql
CREATE TABLE monthly_lead_counts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    year_month TEXT NOT NULL,                        -- formato '2026-02'
    lead_count INT NOT NULL DEFAULT 0,
    notified_80 BOOLEAN DEFAULT false,              -- já notificou 80%?
    notified_100 BOOLEAN DEFAULT false,             -- já notificou 100%?

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    UNIQUE(tenant_id, year_month)
);
```

**Por quê tabela separada?** Evita cron job de reset no dia 1. A contagem é por `year_month` — basta incrementar. Sem risco de esquecer o reset. Histórico de uso fica preservado para relatórios.

**Lógica de contagem:**
```sql
-- Quando chega mensagem inbound, verifica se lead é novo no mês:
-- 1. Busca lead pelo telefone
-- 2. Se lead.last_counted_month != '2026-02', incrementa monthly_lead_counts
-- 3. Atualiza lead.last_counted_month = '2026-02'
```

### Agents (atendentes humanos)

```sql
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    name TEXT NOT NULL,
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('admin', 'agent')),

    is_active BOOLEAN DEFAULT true,
    is_online BOOLEAN DEFAULT false,
    max_concurrent INT DEFAULT 10,
    active_conversations INT DEFAULT 0,

    telegram_chat_id TEXT,
    notification_preferences JSONB DEFAULT '{
        "telegram": true,
        "web_push": true,
        "sound": true
    }',

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    UNIQUE(tenant_id, email)
);

CREATE INDEX idx_agents_tenant ON agents(tenant_id);
```

### Leads

```sql
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Identificação
    name TEXT,
    phone TEXT,
    instagram_id TEXT,
    email TEXT,
    avatar_url TEXT,

    -- Canal de origem
    channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'instagram')),
    source TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,

    -- Qualificação
    stage TEXT NOT NULL DEFAULT 'new'
        CHECK (stage IN ('new', 'qualifying', 'hot', 'human', 'converted', 'lost')),
    score INT NOT NULL DEFAULT 0,
    tags TEXT[] DEFAULT '{}',

    -- Atribuição
    assigned_to UUID REFERENCES agents(id),

    -- Contagem mensal
    last_counted_month TEXT,                        -- '2026-02' — último mês em que contou como lead

    -- Metadata flexível
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    first_contact_at TIMESTAMPTZ DEFAULT now(),
    last_contact_at TIMESTAMPTZ DEFAULT now(),
    last_message_at TIMESTAMPTZ,                    -- para cálculo de follow-up e decay
    converted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Partial unique: só aplica quando o valor não é NULL
CREATE UNIQUE INDEX idx_leads_phone ON leads(tenant_id, phone) WHERE phone IS NOT NULL;
CREATE UNIQUE INDEX idx_leads_instagram ON leads(tenant_id, instagram_id) WHERE instagram_id IS NOT NULL;

CREATE INDEX idx_leads_tenant ON leads(tenant_id);
CREATE INDEX idx_leads_stage ON leads(tenant_id, stage);
CREATE INDEX idx_leads_score ON leads(tenant_id, score DESC);
CREATE INDEX idx_leads_campaign ON leads(tenant_id, utm_campaign) WHERE utm_campaign IS NOT NULL;
CREATE INDEX idx_leads_last_message ON leads(tenant_id, last_message_at) WHERE last_message_at IS NOT NULL;
```

**Mudanças vs versão anterior:**
- `UNIQUE(tenant_id, phone)` → partial unique index com `WHERE phone IS NOT NULL` (resolve o bug de NULLs duplicados)
- `last_counted_month` — controla se lead já foi contado no mês corrente
- `last_message_at` — separado de `last_contact_at`, usado pelo cron de decay e follow-up
- CHECK constraints em `stage` e `channel`

### Regras de Transição de Estágio

| Estágio | Quem muda | Trigger |
|---|---|---|
| `new` → `qualifying` | Automático (scoring) | Score atinge 21 |
| `qualifying` → `hot` | Automático (scoring) | Score atinge 61 |
| `hot` → `human` | Automático (handoff) | Handoff triggered |
| `human` → `converted` | Manual (atendente) | Atendente marca como convertido no painel |
| `human` → `lost` | Manual (atendente) ou automático | Atendente marca, ou conversa fechada sem conversão após 7 dias |
| `qualifying` → `lost` | Automático (decay) | Score cai abaixo de 0 por inatividade |
| Qualquer → `new` | Nunca | Não regride automaticamente |

### Conversations

```sql
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,

    channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'instagram')),
    status TEXT NOT NULL DEFAULT 'ai'
        CHECK (status IN ('ai', 'waiting_human', 'human', 'closed')),

    assigned_agent_id UUID REFERENCES agents(id),

    -- Métricas
    ai_messages_count INT DEFAULT 0,
    human_messages_count INT DEFAULT 0,
    lead_messages_count INT DEFAULT 0,
    first_response_time_ms INT,

    -- IA
    ai_model TEXT DEFAULT 'claude-sonnet-4-20250514',
    ai_summary TEXT,

    -- Handoff
    handoff_reason TEXT,
    handoff_at TIMESTAMPTZ,

    -- Timestamps
    opened_at TIMESTAMPTZ DEFAULT now(),
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_conversations_tenant ON conversations(tenant_id);
CREATE INDEX idx_conversations_lead ON conversations(lead_id);
CREATE INDEX idx_conversations_status ON conversations(tenant_id, status);
CREATE INDEX idx_conversations_waiting ON conversations(tenant_id, handoff_at)
    WHERE status = 'waiting_human';
```

**Mudanças vs versão anterior:**
- `internal_notes` removido (movido para tabela `conversation_notes`)
- Adicionado índice parcial para conversas em `waiting_human` (query mais frequente)

### Conversation Notes (notas internas dos atendentes)

```sql
CREATE TABLE conversation_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agents(id),

    content TEXT NOT NULL,

    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notes_conversation ON conversation_notes(conversation_id, created_at);
```

**Por quê tabela separada?** Múltiplos atendentes podem adicionar notas. Com TEXT simples, não tinha histórico de quem escreveu o quê.

### Messages

```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    sender_type TEXT NOT NULL CHECK (sender_type IN ('lead', 'ai', 'agent', 'system')),
    sender_agent_id UUID REFERENCES agents(id),

    content TEXT NOT NULL,
    content_type TEXT DEFAULT 'text'
        CHECK (content_type IN ('text', 'image', 'audio', 'video', 'document')),
    media_url TEXT,

    ai_metadata JSONB DEFAULT '{}',

    delivery_status TEXT DEFAULT 'sent'
        CHECK (delivery_status IN ('queued', 'sent', 'delivered', 'read', 'failed')),
    external_id TEXT,

    injection_flags TEXT[] DEFAULT '{}',
    validation_result TEXT DEFAULT 'valid'
        CHECK (validation_result IN ('valid', 'blocked', 'modified')),

    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX idx_messages_tenant ON messages(tenant_id);
```

**Mudanças:**
- `sender_type` agora inclui `'system'` (mensagens automáticas como "Vou te conectar com um consultor")
- CHECK constraints em todos os campos de tipo enum

### Lead Events

```sql
CREATE TABLE lead_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,

    event_type TEXT NOT NULL CHECK (event_type IN (
        'stage_change', 'score_change', 'assigned', 'unassigned',
        'tag_added', 'tag_removed', 'handoff', 'follow_up_sent',
        'converted', 'lost', 'reopened'
    )),
    from_value TEXT,
    to_value TEXT,

    created_by TEXT NOT NULL,                       -- 'ai', 'system', 'scheduled', 'agent:{uuid}'
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_lead_events_lead ON lead_events(lead_id, created_at);
```

**Mudanças:**
- `event_type` agora tem CHECK constraint com todos os tipos válidos
- Adicionados tipos: `follow_up_sent`, `converted`, `lost`, `reopened`, `unassigned`, `tag_removed`
- `created_by` pode ser `'scheduled'` (cron jobs)

### Scheduled Messages (preparação para follow-up — Beta)

```sql
CREATE TABLE scheduled_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

    message_type TEXT NOT NULL CHECK (message_type IN ('follow_up', 'reminder', 'campaign')),
    content TEXT,                                   -- se NULL, IA gera na hora do envio
    scheduled_for TIMESTAMPTZ NOT NULL,

    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'sent', 'cancelled', 'failed')),
    sent_at TIMESTAMPTZ,
    cancelled_reason TEXT,

    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_scheduled_pending ON scheduled_messages(scheduled_for)
    WHERE status = 'pending';
```

**Nota:** tabela criada no MVP mas não populada. Follow-up automático é feature da Beta.

### Security Incidents

```sql
CREATE TABLE security_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id),
    lead_id UUID REFERENCES leads(id),

    incident_type TEXT NOT NULL CHECK (incident_type IN (
        'injection_attempt', 'prompt_leak', 'off_topic',
        'over_promise', 'validation_failed', 'identity_leak'
    )),
    severity TEXT NOT NULL DEFAULT 'low'
        CHECK (severity IN ('low', 'medium', 'high', 'critical')),

    lead_message TEXT,
    ai_response TEXT,
    detection_layer TEXT CHECK (detection_layer IN ('sanitization', 'prompt', 'validation')),
    action_taken TEXT CHECK (action_taken IN ('blocked', 'handoff', 'generic_response')),

    resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES agents(id),

    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_security_tenant ON security_incidents(tenant_id, created_at);
CREATE INDEX idx_security_unresolved ON security_incidents(tenant_id)
    WHERE resolved = false;
```

## Lead Scoring

### Tabela de pontuação

| Evento | Pontos | Quem detecta |
|---|---|---|
| Primeiro contato | +10 | Worker (primeira msg do lead) |
| Respondeu mensagem da IA | +5 | Worker (msg inbound quando status='ai') |
| Perguntou sobre preço | +20 | IA (intent='buying' ou extracted_info) |
| Perguntou sobre prazo/entrega | +15 | IA (extracted_info) |
| Perguntou como comprar/contratar | +30 | IA (intent='buying', confidence alta) |
| Enviou áudio/foto | +5 | Worker (content_type != 'text') |
| Mencionou concorrente | +10 | IA (extracted_info) |
| Pediu para falar com humano | +15 | Worker (detecção de palavras-chave) |
| Não respondeu em 24h | -10 | Cron job `decay-scores` |
| Não respondeu em 48h | -20 | Cron job `decay-scores` (cumulativo: -10 + -20 = -30 total) |
| Pediu para parar/sair | -50 | IA (intent='farewell' + contexto) |
| Reclamação/frustração | +5 | IA (intent='complaint') |

### Regras de mudança de estágio

```
score 0-20:   stage = 'new'
score 21-60:  stage = 'qualifying'
score 61+:    stage = 'hot' → verifica handoff conforme tenant config
```

Estágios `human`, `converted`, `lost` não dependem de score — são controlados por handoff, ação do atendente, ou timeout.

## Queries Frequentes

```sql
-- Leads aguardando atendimento humano (query mais usada)
SELECT l.*, c.ai_summary, c.handoff_reason, c.handoff_at
FROM leads l
JOIN conversations c ON c.lead_id = l.id
WHERE l.tenant_id = $1
  AND c.status = 'waiting_human'
ORDER BY l.score DESC, c.handoff_at ASC;

-- Contagem de leads no mês (para verificar limite)
SELECT lead_count
FROM monthly_lead_counts
WHERE tenant_id = $1 AND year_month = $2;

-- Dashboard: leads por estágio (mês corrente)
SELECT stage, COUNT(*) as count
FROM leads
WHERE tenant_id = $1
  AND last_counted_month = $2
GROUP BY stage;

-- Dashboard: tempo médio de primeira resposta
SELECT AVG(first_response_time_ms) as avg_ms
FROM conversations
WHERE tenant_id = $1
  AND created_at >= now() - interval '7 days';

-- Leads para decay (cron job)
SELECT l.id, l.score,
  EXTRACT(EPOCH FROM now() - l.last_message_at) / 3600 as hours_since_last
FROM leads l
JOIN conversations c ON c.lead_id = l.id AND c.status = 'ai'
WHERE l.last_message_at < now() - interval '24 hours'
  AND l.stage NOT IN ('converted', 'lost');
```
