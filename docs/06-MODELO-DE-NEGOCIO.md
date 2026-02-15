# Modelo de Negócio e Precificação

## Modelo de Receita

SaaS com assinatura mensal recorrente, precificado por volume de leads (telefone único por mês).

## Por que cobrar por lead (e não por mensagem)

| Modelo | Prós | Contras |
|---|---|---|
| **Por lead (escolhido)** | Linguagem do cliente ("recebo 100 leads/mês"), previsível, simples | Leads com muitas mensagens custam mais pra nós |
| Por mensagem | Reflete custo real | Cliente não entende, gera ansiedade, imprevisível |
| Por conversa (24h) | Padrão do WhatsApp | Confuso para PMEs |
| Flat (ilimitado) | Simples | Risco de abuso, margem difícil de prever |

**Lead** é a métrica que o empresário entende. Ele pensa "recebo 100 leads do meu anúncio" — não pensa em "conversas de 24 horas" ou "templates de utilidade".

## Planos

### Tabela de planos

| | **Starter** | **Pro** | **Scale** |
|---|---|---|---|
| **Preço mensal** | R$197/mês | R$397/mês | R$797/mês |
| **Preço anual** | R$1.970/ano (= 10 meses) | R$3.970/ano | R$7.970/ano |
| **Leads/mês** | 300 | 1.000 | 3.000 |
| **Lead excedente** | R$1,00/lead | R$0,70/lead | R$0,50/lead |
| **Atendentes** | 1 | 3 | 10 |
| **Canais** | WhatsApp | WhatsApp + Instagram | WhatsApp + Instagram |
| **CRM/Pipeline** | Básico | Completo | Completo |
| **Notificação** | Telegram Bot | Telegram + PWA | Telegram + PWA |
| **Relatórios** | Básico (leads/dia, score) | Avançado (funil, campanha) | Avançado + exportação |
| **Onboarding** | Self-service + docs | Call de setup (30 min) | Call + acompanhamento mensal |
| **Suporte** | Chat (horário comercial) | Chat + email prioritário | Chat + WhatsApp direto |
| **API/Webhooks** | Não | Limitado | Completo |
| **White-label** | Não | Não | Disponível (+R$300/mês) |

### Justificativa dos preços

- **R$197**: preço de ferramenta de marketing (Mailchimp, RD Station básico). Acessível para quem gasta R$3.000+/mês em tráfego pago. ROI claro: se salvar 10 leads/mês que se perderiam, já se paga.
- **R$397**: compete com Chatfuel (R$175, sem IA real) e fica bem abaixo de SleekFlow (R$589). Entrega IA conversacional + CRM + handoff.
- **R$797**: pra quem escala é 60% mais barato que Wati (~R$1.300) e muito mais barato que Zenvia/Blip.
- **Plano anual**: "pague 10, ganhe 12" — reduz churn e melhora cash flow. Disponível a partir da v1.0.

### Regra de excedente

Quando o cliente ultrapassa o limite de leads:

1. **Nunca bloquear.** O cliente está no meio de uma campanha de tráfego — se a IA parar, ele perde dinheiro e cancela no dia seguinte.
2. Cobra excedente proporcional ao plano.
3. Notifica o cliente quando atingir 80% e 100% do limite.
4. Sugere upgrade no painel quando excede por 2+ meses consecutivos.

## Análise de Custos

### Custo por cliente (plano Starter: 300 leads/mês)

Premissas:
- Média de 10 mensagens por lead (5 do lead + 5 da IA)
- 80% dos leads vêm de anúncio (janela gratuita de 72h no WhatsApp)
- Claude Sonnet 4: ~$3/1M tokens input, ~$15/1M tokens output
- Prompt médio: ~800 tokens input, ~200 tokens output por chamada

| Custo | Cálculo | Valor |
|---|---|---|
| **Claude API** | 300 leads × 5 chamadas × ($0.0024 input + $0.003 output) = ~$8 | ~R$45 |
| **WhatsApp (Z-API)** | Plano fixo rateado | ~R$20 |
| **Infra (rateado)** | VPS + Redis + Postgres / nº de clientes | ~R$15 |
| **Telegram Bot** | Gratuito | R$0 |
| **Total custo** | | **~R$80** |
| **Receita** | Plano Starter | **R$197** |
| **Margem bruta** | | **R$117 (~59%)** |

### Custo por cliente (plano Pro: 1.000 leads/mês)

| Custo | Cálculo | Valor |
|---|---|---|
| **Claude API** | 1.000 leads × 5 chamadas × ($0.0024 + $0.003) = ~$27 | ~R$150 |
| **WhatsApp** | Z-API rateado ou Meta API (~200 templates a R$0,35) | ~R$50-70 |
| **Infra (rateado)** | | ~R$15 |
| **Total custo** | | **~R$215-235** |
| **Receita** | Plano Pro | **R$397** |
| **Margem bruta** | | **R$162-182 (~41-46%)** |

### Custo por cliente (plano Scale: 3.000 leads/mês)

| Custo | Cálculo | Valor |
|---|---|---|
| **Claude API** | 3.000 leads × 5 chamadas × ($0.0024 + $0.003) = ~$81 | ~R$450 |
| **WhatsApp** | | ~R$100-150 |
| **Infra (rateado)** | | ~R$15 |
| **Total custo** | | **~R$565-615** |
| **Receita** | Plano Scale | **R$797** |
| **Margem bruta** | | **R$182-232 (~23-29%)** |

> **Observação:** A margem do plano Scale é apertada. Se o custo do Claude subir ou o volume de mensagens por lead for maior que 10, pode ficar negativa. Monitorar de perto e considerar ajustar preço ou limitar mensagens por lead no futuro.

### Projeção com escala (custos reais, incluindo API)

| Clientes (mix) | MRR | Custo API + WhatsApp | Custo infra | Custo total | Margem |
|---|---|---|---|---|---|
| 10 (8 Starter, 2 Pro) | R$2.370 | R$660 | R$200 | R$860 | ~64% |
| 30 (20 Starter, 8 Pro, 2 Scale) | R$8.500 | R$2.600 | R$300 | R$2.900 | ~66% |
| 100 (60 Starter, 30 Pro, 10 Scale) | R$27.750 | R$10.300 | R$600 | R$10.900 | ~61% |

**Nota:** a projeção anterior superestimava margens ao ignorar custos variáveis de API. A margem real fica entre 55-65%, não 73-83%.

## Estratégia de Aquisição

### Canal 1: Gestores de tráfego

- **Por quê:** cada gestor atende 5-30 clientes. Converter 1 gestor = potencialmente 10 clientes.
- **Como:** conteúdo educativo em YouTube/Instagram sobre "como não perder leads do tráfego pago", demonstrações ao vivo, programa de afiliados.
- **Comissão:** 20% da mensalidade do primeiro ano (recorrente por 12 meses).

### Canal 2: Comunidades de tráfego pago

- **Onde:** grupos do Sobral, Tiago Tessmann, comunidades no Facebook/Telegram.
- **Como:** cases de sucesso, depoimentos, ofertas especiais para membros.

### Canal 3: Meta-marketing (usar o próprio produto)

- Rodar anúncio pra landing page da plataforma.
- Quando o lead clica, a IA da plataforma atende no WhatsApp.
- O lead experimenta o produto ao ser atendido por ele.
- Demonstração prática e orgânica do valor.

### Canal 4: Agências (white-label) — v1.0+

- Agências pequenas oferecem a plataforma com marca própria pros clientes.
- Preço: R$797/mês (Scale) + R$300 white-label = R$1.097/mês.
- Agência revende por R$500-1.000/cliente → margem pra agência + receita recorrente pra nós.

## Métricas de Negócio (KPIs)

### North Star Metric

**Leads qualificados entregues por mês** — reflete diretamente o valor que o cliente percebe.

### Métricas de aquisição

| Métrica | Meta mês 1-3 | Meta mês 6 | Meta mês 12 |
|---|---|---|---|
| Novos clientes/mês | 3 | 10 | 25 |
| CAC (custo de aquisição) | < R$300 | < R$200 | < R$150 |
| Trial → Pago (conversão) | > 30% | > 40% | > 50% |

### Métricas de retenção

| Métrica | Meta |
|---|---|
| Churn mensal | < 8% |
| NPS | > 50 |
| Tempo médio de vida (LTV) | > 8 meses |
| LTV/CAC | > 3x |

### Métricas de produto

| Métrica | Meta |
|---|---|
| Tempo de primeira resposta da IA | < 10s |
| Taxa de resolução sem handoff | > 70% |
| Taxa de handoff bem-sucedido | > 90% |
| Incidentes de segurança | < 0,1% das conversas |

## Trial / Freemium

### Opção recomendada: Trial de 7 dias (plano Pro)

- 7 dias com todas as funcionalidades do plano Pro.
- Limite de 50 leads no trial.
- Sem cartão de crédito para iniciar (reduz fricção).
- Cartão pedido no dia 5 para continuar.

### Por que não freemium

- Custo variável por lead (Claude API) torna freemium arriscado.
- PMEs que gastam R$3k+/mês em ads pagam R$197 sem pensar se o valor é claro.
- Trial demonstra valor; freemium atrai curiosos que não convertem.

## Projeção Financeira (12 meses)

> Premissas: ticket médio R$230 (maioria no Starter inicialmente), churn 8%/mês, crescimento orgânico modesto (solo dev, dedicação parcial), custos incluem API + infra.

| Mês | Clientes | MRR | Custos | Resultado |
|---|---|---|---|---|
| 1-3 | MVP (uso próprio) | R$0 | R$200 (infra) | -R$200/mês |
| 4 (Alpha) | 5 beta grátis | R$0 | R$400 | -R$400 |
| 5 (Alpha) | 8 beta grátis | R$0 | R$500 | -R$500 |
| 6 (Beta) | 3 pagantes + 5 beta | R$600 | R$600 | R$0 (breakeven) |
| 7 | 8 pagantes | R$1.800 | R$700 | R$1.100 |
| 8 | 15 pagantes | R$3.400 | R$1.200 | R$2.200 |
| 9 | 22 pagantes | R$5.000 | R$1.800 | R$3.200 |
| 10 | 30 pagantes | R$6.900 | R$2.500 | R$4.400 |
| 11 | 38 pagantes | R$8.700 | R$3.200 | R$5.500 |
| 12 | 45 pagantes | R$10.300 | R$3.800 | R$6.500 |

**Nota vs projeção anterior:** os números anteriores (150 clientes, R$45k MRR no mês 12) eram irrealistas para solo dev com dedicação parcial. Esta projeção é conservadora e assume crescimento orgânico lento nos primeiros meses, com aceleração após ter cases de sucesso.

**Meta realista mês 12:** 45 clientes, ~R$10k MRR, ~R$6.5k resultado líquido.
