# Roadmap de Desenvolvimento

> **Contexto:** desenvolvimento solo, dedicação parcial (~15-20h/semana).
> Estimativas calibradas para essa realidade. Um sprint = 1 semana (15-20h úteis).

## Visão de Fases

```
[MVP]             [Alpha]           [Beta]            [Launch]
10-14 semanas     +6-8 semanas      +8 semanas        +4 semanas
│                 │                 │                 │
▼                 ▼                 ▼                 ▼
1 tenant          Multi-tenant      Billing           Primeiros
WhatsApp+IA       Onboarding        Instagram         clientes
Handoff           Painel PWA        Follow-up         pagantes
Telegram Bot      Pipeline          LGPD              Landing page
```

**Timeline total estimado:** ~7-8 meses até primeiros clientes pagantes.

## Fase 1: MVP (Semanas 1-14)

**Objetivo:** sistema funcional para uso próprio ou de 1 cliente piloto.

### Bloco 1: Fundação (Semanas 1-3)

| Tarefa | Estimativa | Detalhes |
|---|---|---|
| Setup projeto | 4h | Fastify + TypeScript + Docker Compose + Vitest |
| Drizzle schema | 6h | Todas as tabelas, migrations, seed |
| BullMQ setup | 3h | Redis + filas + configuração |
| Webhook WhatsApp | 4h | POST /webhooks/whatsapp |
| Z-API adapter | 6h | Envio/recepção, parse de payloads |
| Testes de fundação | 4h | Health check, schema, webhook básico |
| **Total bloco** | **~27h** | **~2 semanas** |

**Milestone:** mensagem chega, é salva no banco, e responde "echo".

### Bloco 2: IA + Prompt (Semanas 4-7)

| Tarefa | Estimativa | Detalhes |
|---|---|---|
| Prompt builder | 6h | System prompt dinâmico com dados do tenant |
| Claude service | 4h | Chamada à API, timeout, retry |
| Response parser | 4h | Parse JSON, fallbacks, validation |
| Prompt guard (sanitização) | 6h | Injection detection, input cleaning |
| Prompt guard (validação) | 6h | Output validation, context-aware |
| Message worker | 10h | Core: consome fila, IA, salva, envia |
| Lead scoring | 4h | Cálculo, mudança de stage |
| Testes IA | 8h | Sanitização, parsing, worker, scoring |
| **Total bloco** | **~48h** | **~3 semanas** |

**Milestone:** IA conversa com leads, responde contextualmente, pontua.

### Bloco 3: Handoff + Telegram (Semanas 8-11)

| Tarefa | Estimativa | Detalhes |
|---|---|---|
| Handoff service | 8h | Triggers, transição de estado, timeout |
| Handoff configurável | 4h | Config por tenant: quais intents geram handoff |
| Telegram Bot | 10h | Notificações, botões, resposta rápida |
| Resposta via Telegram | 6h | Atendente responde → sai no WhatsApp |
| Devolver pra IA | 3h | Comando no Telegram |
| Testes handoff | 6h | Transições, timeout, Telegram mocks |
| **Total bloco** | **~37h** | **~2-3 semanas** |

**Milestone:** IA transfere para humano, atendente responde pelo Telegram.

### Bloco 4: Polimento MVP (Semanas 12-14)

| Tarefa | Estimativa | Detalhes |
|---|---|---|
| Logging e incidents | 4h | Security incidents, interaction logs |
| Error handling | 4h | Retry, dead letter queue, fallbacks |
| Meta Cloud API adapter | 6h | Adapter paralelo ao Z-API |
| Testes e2e | 6h | Cenários completos, injection, erros |
| Deploy VPS | 4h | Docker Compose na Hetzner, domínio, SSL |
| Documentação | 3h | README, envs, como usar |
| **Total bloco** | **~27h** | **~2 semanas** |

**Milestone:** MVP deployed, rodando em produção com 1 número.

### Critérios de aceite do MVP

- [ ] Lead manda mensagem no WhatsApp → IA responde em < 10s
- [ ] IA mantém conversa contextual (lembra últimas 10 mensagens)
- [ ] IA responde apenas sobre o negócio configurado
- [ ] Handoff funciona conforme config do tenant (preço: sim/não)
- [ ] Handoff automático quando lead pede humano
- [ ] Atendente recebe notificação no Telegram com resumo
- [ ] Atendente responde via Telegram → lead recebe no WhatsApp
- [ ] Atendente pode devolver conversa pra IA
- [ ] Timeout de waiting_human funciona (30min default)
- [ ] Tentativa de prompt injection é ignorada pela IA
- [ ] Respostas da IA são validadas (context-aware) antes de enviar
- [ ] Todas as mensagens são salvas no banco
- [ ] Conversa fechada reabre com contexto se lead volta

## Fase 2: Alpha (Semanas 15-22)

**Objetivo:** multi-tenant funcional com painel web, 5-10 beta testers gratuitos.

### Bloco 5: Multi-tenant + Auth (Semanas 15-17)

| Tarefa | Estimativa | Detalhes |
|---|---|---|
| Autenticação | 6h | JWT + refresh tokens |
| Middleware tenant | 4h | Isolamento por tenant_id |
| RLS PostgreSQL | 3h | Camada extra de segurança |
| API CRUD | 8h | Leads, conversations, agents, tenants |
| Contagem mensal | 4h | monthly_lead_counts, alertas 80%/100% |
| Testes isolamento | 6h | 2 tenants, acesso cruzado, limites |
| **Total bloco** | **~31h** | **~2 semanas** |

### Bloco 6: Onboarding (Semanas 18-19)

| Tarefa | Estimativa | Detalhes |
|---|---|---|
| Formulário onboarding | 6h | "Descreva seu negócio" → prompt gerado |
| Conexão WhatsApp pelo painel | 4h | QR code Z-API ou token Meta |
| Configuração Telegram | 3h | Vincular bot ao atendente |
| Teste de onboarding | 3h | Fluxo completo em < 15 min |
| **Total bloco** | **~16h** | **~1 semana** |

### Bloco 7: Painel PWA (Semanas 20-22)

| Tarefa | Estimativa | Detalhes |
|---|---|---|
| Setup React + Vite + Tailwind | 3h | PWA config |
| Lista de leads | 6h | Tabela filtável por estágio, score |
| Chat view | 8h | Histórico com sender types diferenciados |
| Responder pelo painel | 6h | Input + envio via REST |
| SSE real-time | 4h | Notificações no painel |
| Pipeline kanban | 6h | Drag-and-drop de estágios |
| Dashboard básico | 4h | Leads/dia, score médio, taxa handoff |
| PWA install | 3h | Manifest, service worker, install prompt |
| **Total bloco** | **~40h** | **~3 semanas** |

### Critérios de aceite da Alpha

- [ ] Novo cliente se cadastra e configura em < 15 minutos
- [ ] Dados de tenants são completamente isolados
- [ ] Painel mostra leads, conversas e pipeline em tempo real
- [ ] Atendente pode responder pelo painel web
- [ ] PWA funciona instalada no celular
- [ ] Contador mensal funciona sem cron de reset
- [ ] 5-10 beta testers usando ativamente

## Fase 3: Beta (Semanas 23-30)

**Objetivo:** produto cobrável, com billing e relatórios.

### Bloco 8: Billing + LGPD (Semanas 23-25)

| Tarefa | Estimativa | Detalhes |
|---|---|---|
| Integração Stripe/Asaas | 8h | Planos, checkout, webhook de pagamento |
| Trial management | 4h | 7 dias grátis, notificações de expiração |
| Controle de limites | 4h | Verificação de leads, bloqueio de funcionalidades |
| LGPD básico | 6h | Consentimento, endpoint de dados, deleção |
| **Total bloco** | **~22h** | **~1.5 semanas** |

### Bloco 9: Instagram + Follow-up (Semanas 26-28)

| Tarefa | Estimativa | Detalhes |
|---|---|---|
| Meta Graph API adapter | 8h | Instagram DM |
| Unificação de lead | 4h | Mesmo lead no WhatsApp e Instagram = 1 perfil |
| Follow-up automático | 8h | Scheduled worker, mensagens de follow-up |
| Decay scores (cron) | 4h | -10/-20 por inatividade |
| **Total bloco** | **~24h** | **~1.5 semanas** |

### Bloco 10: Relatórios + Polimento (Semanas 29-30)

| Tarefa | Estimativa | Detalhes |
|---|---|---|
| Relatórios avançados | 8h | Funil, tempo de resposta, por campanha |
| Distribuição de atendentes | 6h | Round-robin, manual |
| Conversation notes | 3h | Notas internas com histórico |
| Configurações avançadas | 4h | Handoff rules editáveis pelo painel |
| **Total bloco** | **~21h** | **~1.5 semanas** |

## Fase 4: Launch (Semanas 31-34)

| Tarefa | Estimativa | Detalhes |
|---|---|---|
| Landing page | 8h | Página de venda do produto |
| Testes de carga | 4h | Simular 100+ leads simultâneos |
| Segurança audit | 4h | Rate limiting, CORS, headers |
| Termos de uso + privacidade | 4h | Documentação legal básica |
| Go-to-market | 8h | Primeiros posts, anúncios, outreach |
| **Total bloco** | **~28h** | **~2 semanas** |

## Prioridades do Crescimento (pós-launch)

### Alta prioridade

| Feature | Impacto | Esforço |
|---|---|---|
| Templates de prompt por vertical | Onboarding instantâneo | Médio |
| Analytics de campanha (UTM) | ROI por campanha de ads | Médio |
| Plano anual | Reduz churn, melhora cash flow | Baixo |

### Média prioridade

| Feature | Impacto | Esforço |
|---|---|---|
| White-label | Canal de agências | Alto |
| API pública + Webhooks | Integrações externas | Médio |
| IA com Vision (imagens) | Processa fotos de produtos, catálogos | Médio |

### Baixa prioridade

| Feature | Impacto | Esforço |
|---|---|---|
| App mobile (Expo) | Atendentes com app dedicado | Alto |
| Integração Google Ads | Dados de campanha | Alto |
| Agendamento nativo | Marcar reunião pela IA | Médio |

## Dívida Técnica

| Item | Quando resolver | Risco se adiar |
|---|---|---|
| Testes automatizados (unit + integration) | Desde o início (TDD) | — |
| CI/CD pipeline | Alpha | Deploys manuais, erros |
| Backup automatizado | Antes do Alpha (beta testers) | Perda de dados |
| Rate limiting por tenant | Beta | Abuso de API |
| Observabilidade (logs estruturados, métricas) | Beta | Debugging cego |
| Cache de respostas similares | Após 30+ clientes | Custo alto de API |
| Migração Z-API → Meta API oficial | Oferecer como opção no Alpha | Risco de ban |
