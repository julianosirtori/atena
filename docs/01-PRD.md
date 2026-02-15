# PRD — Plataforma de Automação de Leads com IA

## Visão do Produto

Uma plataforma SaaS que automatiza o atendimento de leads vindos de tráfego pago via WhatsApp e Instagram, utilizando inteligência artificial conversacional para qualificar, responder e transferir leads para atendentes humanos no momento certo.

## Problema

Pequenos empresários que investem em tráfego pago (R$3.000–30.000/mês) recebem dezenas a centenas de leads diários no WhatsApp. Sem equipe dedicada, a maioria desses leads esfria antes de ser respondida. O resultado: dinheiro investido em anúncio é jogado fora.

**Dados do problema:**

- Leads não respondidos em até 5 minutos têm 80% menos chance de conversão.
- Pequenos negócios não têm equipe para atendimento 24/7.
- Soluções existentes com IA real custam R$500+/mês — fora do orçamento de PMEs.
- Ferramentas baratas usam fluxos engessados ("digite 1 para vendas"), não IA conversacional.

## Definição de Lead

**Lead = telefone único por mês.** Se João manda mensagem em fevereiro, conta como 1 lead de fevereiro. Se manda de novo em março, conta como 1 novo lead de março. Leads que retornam no mesmo mês não contam novamente.

Impacto: limites do plano, contagem mensal, billing de excedente, e métricas de dashboard.

## Público-Alvo

**Persona primária:** Dono de pequeno negócio que investe em tráfego pago.

- Faturamento: R$20k–500k/mês
- Segmentos: clínicas, academias, cursos online, e-commerce, prestadores de serviço, restaurantes
- Dor: perde leads porque não consegue responder rápido
- Perfil técnico: baixo — usa WhatsApp Business, Instagram, e ferramentas de anúncio

**Persona secundária:** Gestor de tráfego / Agência de marketing digital.

- Gerencia anúncios de 5–30 clientes
- Precisa entregar resultados (leads qualificados) para os clientes
- Interesse em white-label: oferecer a plataforma com a própria marca

## Proposta de Valor

"Sua IA responde todos os leads em segundos, qualifica automaticamente, e só chama você quando o lead está pronto para comprar."

## Funcionalidades por Release

> **Contexto:** desenvolvimento solo com dedicação parcial. Estimativas ajustadas para ~15-20h/semana.

### MVP (v0.1) — 10-14 semanas

| Funcionalidade | Descrição | Prioridade |
|---|---|---|
| Conexão WhatsApp | Conectar número via Z-API (QR code) ou API oficial Meta | Must have |
| IA conversacional | Claude API respondendo leads com prompt customizado por negócio | Must have |
| Handoff configurável | Tenant define quais intents geram handoff (preço, fechamento, etc.) | Must have |
| Notificação Telegram | Bot notifica atendente com resumo + opção de resposta rápida | Must have |
| Histórico de conversas | Todas as mensagens salvas com sender (lead/IA/humano) | Must have |
| Lead scoring | Pontuação automática baseada em interações | Must have |
| Proteção anti-injection | System prompt blindado + sanitização + validação de resposta | Must have |

### Alpha (v0.2) — +6-8 semanas

| Funcionalidade | Descrição | Prioridade |
|---|---|---|
| Multi-tenant | Múltiplos clientes na mesma infraestrutura | Must have |
| Onboarding guiado | Formulário "descreva seu negócio" → prompt gerado automaticamente | Must have |
| Painel web (PWA) | Lista de leads, histórico, resposta manual | Must have |
| Pipeline kanban | Visualização de leads por estágio | Should have |
| Dashboard básico | Métricas: leads/dia, tempo de resposta, taxa de handoff | Should have |
| Contagem de leads | Contador mensal por telefone único, alertas de 80%/100%, reset automático dia 1 | Must have |

### Beta (v0.3) — +8 semanas

| Funcionalidade | Descrição | Prioridade |
|---|---|---|
| Instagram DM | Integração com Meta Graph API para Instagram | Should have |
| Relatórios avançados | Conversão por campanha, ROI estimado, funil completo | Should have |
| Cobrança | Integração com Stripe ou Asaas para planos e billing | Must have |
| Distribuição de atendentes | Round-robin, por carga, manual | Should have |
| Follow-up automático | IA envia follow-up se lead esfria (24-48h, configurável por tenant) | Should have |
| LGPD básico | Consentimento, retenção com prazo, direito ao esquecimento | Must have |

### v1.0 — +4-6 semanas

| Funcionalidade | Descrição | Prioridade |
|---|---|---|
| White-label | Agências podem oferecer com marca própria | Should have |
| API pública | Webhooks e endpoints para integrações externas | Nice to have |
| Analytics de campanha | Métricas de performance por UTM/campanha de ads | Should have |
| Respostas com mídia | IA processa imagens (Vision) e envia mídia quando relevante | Nice to have |
| Templates de prompt por vertical | Prompts pré-configurados para clínicas, academias, cursos, etc. | Should have |
| Plano anual | Desconto "pague 10, ganhe 12" para reduzir churn | Should have |

## Métricas de Sucesso

| Métrica | Meta MVP | Meta Alpha | Meta v1.0 |
|---|---|---|---|
| Tempo de primeira resposta | < 10s | < 10s | < 5s |
| Taxa de resposta da IA (sem handoff) | > 70% | > 75% | > 80% |
| Taxa de handoff bem-sucedido | > 90% | > 90% | > 95% |
| Incidentes de prompt injection | < 1% | < 0,5% | < 0,1% |
| Beta testers ativos | — | 5-10 | — |
| NPS | — | > 40 | > 60 |
| Churn mensal | — | — | < 5% |
| MRR | — | — | R$5.000 |

## Riscos e Mitigações

| Risco | Impacto | Probabilidade | Mitigação |
|---|---|---|---|
| Ban do número WhatsApp (Z-API) | Alto | Baixo | Suporte a API oficial Meta como fallback |
| IA responde algo inadequado | Alto | Médio | 5 camadas de proteção, handoff automático em caso de dúvida |
| Meta muda regras/preços | Médio | Médio | Arquitetura agnóstica de canal, adapter pattern |
| Custo do Claude API sobe | Médio | Baixo | Abstração de provider, possibilidade de modelos alternativos |
| Empresário não entende como configurar | Alto | Alto | Onboarding guiado, templates por vertical, call de setup no Pro |
| Escopo cresce demais (solo dev) | Alto | Alto | Foco rígido no MVP, validar com 1 usuário real antes de expandir |
| Burnout (dedicação parcial) | Alto | Médio | Roadmap realista, milestones pequenos, priorizar valor rápido |

## Concorrência

| Concorrente | Preço | IA Real? | Foco | Nosso diferencial |
|---|---|---|---|---|
| BotConversa | ~R$200/mês | Não (fluxos) | PMEs, no-code | IA conversacional real vs fluxograma |
| Chatfuel | R$175/mês | Limitada | Automação básica | IA mais inteligente, CRM integrado |
| SleekFlow | R$469-589/mês | Sim | Omnichannel | 50-60% mais barato com mesma qualidade |
| Zenvia | R$649+ setup | Sim | Enterprise | Sem taxa de setup, feito para PMEs |
| Wati | ~R$1.300/mês | Não | PMEs globais | 70% mais barato, foco no Brasil |
| Manychat | ~R$75/mês | Básica | Instagram/WhatsApp | IA mais sofisticada, CRM + handoff |
