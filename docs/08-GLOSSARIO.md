# Glossário e Referências

## Glossário de Termos

### Termos de Negócio

| Termo | Definição |
|---|---|
| **Lead** | Pessoa que demonstrou interesse (mandou mensagem, clicou no anúncio). Para efeito de contagem no plano: telefone único por mês |
| **Lead quente** | Lead com alta intenção de compra (score > 60) |
| **Lead frio** | Lead que não interagiu recentemente ou demonstrou desinteresse |
| **Handoff** | Transferência da conversa da IA para um atendente humano |
| **Score** | Pontuação numérica que representa o nível de interesse/engajamento do lead |
| **Pipeline** | Visualização das etapas que o lead percorre (new → qualifying → hot → human → converted/lost) |
| **Tenant** | Cliente da plataforma (o empresário que contrata o SaaS) |
| **Churn** | Taxa de cancelamento mensal de clientes |
| **MRR** | Monthly Recurring Revenue — receita recorrente mensal |
| **CAC** | Customer Acquisition Cost — custo de aquisição de cliente |
| **LTV** | Lifetime Value — valor total que um cliente gera ao longo da relação |
| **White-label** | Versão da plataforma sem nossa marca, com a marca da agência/cliente |
| **Follow-up** | Mensagem de acompanhamento enviada quando o lead esfria |
| **Decay** | Redução automática do score por inatividade |

### Termos Técnicos

| Termo | Definição |
|---|---|
| **Webhook** | URL que recebe chamadas HTTP quando um evento ocorre |
| **Message Queue** | Fila de mensagens que desacopla quem envia de quem processa |
| **Worker** | Processo que consome tarefas de uma fila e as processa |
| **BullMQ** | Biblioteca Node.js para filas de mensagens usando Redis |
| **Drizzle ORM** | ORM TypeScript type-safe, leve, com API SQL-like |
| **Prompt Injection** | Tentativa de manipular a IA enviando instruções maliciosas |
| **System Prompt** | Instruções fixas que definem o comportamento da IA (invisíveis pro lead) |
| **Context-Aware Validation** | Validação que considera o tipo de negócio do tenant para evitar falsos positivos |
| **Multi-tenant** | Arquitetura onde múltiplos clientes compartilham a mesma infraestrutura |
| **Adapter Pattern** | Padrão que abstrai implementações diferentes atrás de uma interface comum |
| **Dead Letter Queue** | Fila onde vão mensagens que falharam após todas as tentativas |
| **SSE** | Server-Sent Events — comunicação unidirecional servidor → cliente |
| **PWA** | Progressive Web App — site que se comporta como app nativo |
| **RLS** | Row Level Security — controle de acesso por linha no PostgreSQL |
| **HITL** | Human-in-the-Loop — padrão onde IA escala para humano quando necessário |
| **Partial Unique Index** | Índice único que só aplica quando a condição WHERE é verdadeira |
| **LGPD** | Lei Geral de Proteção de Dados — legislação brasileira de privacidade |

### Termos de WhatsApp

| Termo | Definição |
|---|---|
| **WABA** | WhatsApp Business Account — conta empresarial oficial |
| **Cloud API** | API oficial da Meta hospedada na nuvem |
| **BSP** | Business Solution Provider — provedor parceiro autorizado pela Meta |
| **Template** | Mensagem pré-aprovada pela Meta para iniciar conversas |
| **Janela de 24h** | Período após mensagem do cliente onde a empresa pode responder livremente |
| **Janela de 72h** | Período estendido quando o lead vem de anúncio Click-to-WhatsApp |
| **Z-API** | API brasileira não oficial para WhatsApp |
| **Evolution API** | API open source não oficial para WhatsApp, self-hosted |
| **Baileys** | Biblioteca que simula WhatsApp Web (usada por APIs não oficiais) |

## Referências Técnicas

### Tecnologias

| Tecnologia | Documentação |
|---|---|
| Fastify | https://fastify.dev/docs/latest/ |
| Drizzle ORM | https://orm.drizzle.team/docs/overview |
| BullMQ | https://docs.bullmq.io/ |
| PostgreSQL | https://www.postgresql.org/docs/ |
| Claude API | https://docs.anthropic.com/ |
| Z-API | https://developer.z-api.io/ |
| Meta WhatsApp Cloud API | https://developers.facebook.com/docs/whatsapp/cloud-api |
| Meta Graph API (Instagram) | https://developers.facebook.com/docs/instagram-api |
| Telegram Bot API | https://core.telegram.org/bots/api |
| Vitest | https://vitest.dev/ |
| React | https://react.dev/ |
| Vite PWA | https://vite-pwa-org.netlify.app/ |
| Hetzner Cloud | https://docs.hetzner.com/cloud/ |
| Docker | https://docs.docker.com/ |

## Mapa de Documentos

```
docs/
├── 01-PRD.md                   # Visão do produto, personas, funcionalidades, métricas
├── 02-ARQUITETURA.md           # Stack, diagramas, padrões, estrutura de diretórios
├── 03-MODELO-DE-DADOS.md       # Drizzle schema, scoring, queries, contagem mensal
├── 04-FLUXO-IA-E-HANDOFF.md   # Prompt engineering, handoff configurável, Telegram Bot
├── 05-SEGURANCA.md             # 5 camadas context-aware, LGPD, prompt injection
├── 06-MODELO-DE-NEGOCIO.md     # Precificação, custos reais, projeção realista
├── 07-ROADMAP.md               # Fases para solo dev parcial, TDD, milestones
└── 08-GLOSSARIO.md             # Termos, referências, mapa de documentos
```

## Changelog da Documentação

### v2 (revisão crítica)

**Correções:**
- Métricas de MRR movidas do MVP para fases corretas (MVP não tem receita)
- `UNIQUE(tenant_id, phone)` → partial unique index (resolve bug de NULLs duplicados)
- `leads_used_this_month` substituído por tabela `monthly_lead_counts` (sem cron de reset)
- `pricing_info` separado de `products_info` no prompt (eram duplicados)
- Validação de off-topic agora é context-aware (resolve falso positivo para igrejas, clínicas)
- Contradição identidade resolvida: IA pode dizer "assistente virtual" mas não pode revelar detalhes técnicos
- Math do modelo de negócio corrigida (custos variáveis de API incluídos na projeção)
- Projeção financeira realista para solo dev com dedicação parcial

**Adições:**
- Definição formal de "lead" (telefone único por mês)
- Drizzle ORM como ORM escolhido
- SSE no lugar de "WebSocket ou SSE" (decisão tomada)
- Hetzner como provider de VPS (decisão tomada)
- Handoff configurável por tenant (preço pode ou não gerar handoff)
- Tabela `conversation_notes` (notas com histórico de quem escreveu)
- Tabela `scheduled_messages` (preparação para follow-up na Beta)
- Regras de transição de estágio (quem muda para converted, lost)
- Timeout de waiting_human documentado (30min default)
- Regra de reabertura de conversa (< 7 dias vs > 7 dias)
- Scheduled workers (cron jobs) documentados
- Seção LGPD no doc de segurança
- Plano anual ("pague 10, ganhe 12")
- Estrutura de testes (__tests__/unit, integration, e2e, __fixtures__)
- Riscos específicos para solo dev (escopo, burnout)
