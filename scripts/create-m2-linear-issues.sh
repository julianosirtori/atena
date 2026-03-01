#!/usr/bin/env bash
# Script to create Linear issues for Campaigns + CRM Avançado (M2)
# Usage: LINEAR_API_TOKEN=<your-token> bash scripts/create-m2-linear-issues.sh
#
# Requires: linearis CLI v2025.12.3+
# Team: JS (993fc19f-615c-4e2d-b465-32b37089a2bb)

set -euo pipefail

TEAM="JS"

# ──────────────────────────────────────────────────────────────────────
# Step 0: Get label IDs
# ──────────────────────────────────────────────────────────────────────
echo "=== Fetching labels ==="
LABELS_JSON=$(linearis labels list --team "$TEAM")
echo "$LABELS_JSON" | head -30

# Extract label IDs (adjust jq paths based on linearis output format)
MVP_LABEL=$(echo "$LABELS_JSON" | jq -r '.[] | select(.name == "MVP") | .id')
BACKEND_LABEL=$(echo "$LABELS_JSON" | jq -r '.[] | select(.name == "backend") | .id')
FRONTEND_LABEL=$(echo "$LABELS_JSON" | jq -r '.[] | select(.name == "frontend") | .id')
PAINEL_LABEL=$(echo "$LABELS_JSON" | jq -r '.[] | select(.name == "Painel") | .id')

echo "MVP=$MVP_LABEL"
echo "backend=$BACKEND_LABEL"
echo "frontend=$FRONTEND_LABEL"
echo "Painel=$PAINEL_LABEL"

if [[ -z "$MVP_LABEL" || -z "$BACKEND_LABEL" || -z "$FRONTEND_LABEL" || -z "$PAINEL_LABEL" ]]; then
  echo "ERROR: Could not find all required labels. Check label names."
  exit 1
fi

# ──────────────────────────────────────────────────────────────────────
# Epic 1: S-026-CAMP: Gestão de Campanhas (Backend)
# Labels: MVP, backend
# ──────────────────────────────────────────────────────────────────────
echo ""
echo "=== Creating Epic 1: S-026-CAMP ==="
EPIC1=$(linearis issues create \
  --team "$TEAM" \
  --title "S-026-CAMP: Gestão de Campanhas (Backend)" \
  --description "Épico que cobre toda a implementação backend do sistema de campanhas: schema, API CRUD, matching de leads, integração com pipeline de IA, lifecycle worker e métricas." \
  --labels "$MVP_LABEL,$BACKEND_LABEL" \
  --status "Backlog" \
  2>&1)
EPIC1_ID=$(echo "$EPIC1" | jq -r '.id // .identifier // empty')
EPIC1_KEY=$(echo "$EPIC1" | jq -r '.identifier // empty')
echo "Epic 1 created: $EPIC1_KEY ($EPIC1_ID)"

echo "  Creating sub-issues for Epic 1..."

linearis issues create --team "$TEAM" --status "Backlog" --estimate 2 \
  --parent-ticket "$EPIC1_KEY" \
  --labels "$MVP_LABEL,$BACKEND_LABEL" \
  --title "Criar tabela campaigns, enums e migration" \
  --description "Criar enums campaign_status (draft/active/paused/completed) e campaign_type (launch/promotion/recurring/evergreen/other). Criar tabela campaigns com: id, tenant_id, name, description, type, status, start_date, end_date, auto_activate, products_info, pricing_info, faq, custom_instructions, fallback_message, handoff_rules (JSONB), utm_rules (JSONB), is_default, goal_leads, goal_conversions, created_at, updated_at. Indexes: tenant_id, status, is_default. Gerar e rodar migration via Drizzle."
echo "  1/8 done"

linearis issues create --team "$TEAM" --status "Backlog" --estimate 1 \
  --parent-ticket "$EPIC1_KEY" \
  --labels "$MVP_LABEL,$BACKEND_LABEL" \
  --title "Criar tabela lead_campaigns + modificações em leads/conversations" \
  --description "Criar tabela lead_campaigns (id, tenant_id, lead_id FK, campaign_id FK, matched_by enum utm/manual/default, matched_at, UNIQUE lead_id+campaign_id). Adicionar: leads.active_campaign_id FK campaigns, leads.pipeline_stage_id FK pipeline_stages, conversations.campaign_id FK campaigns. Estender eventTypeEnum com campaign_joined, campaign_completed, pipeline_stage_moved, automation_triggered."
echo "  2/8 done"

linearis issues create --team "$TEAM" --status "Backlog" --estimate 3 \
  --parent-ticket "$EPIC1_KEY" \
  --labels "$MVP_LABEL,$BACKEND_LABEL" \
  --title "CRUD API de campanhas + schemas Zod + Bruno collections" \
  --description "Implementar endpoints: POST/GET/GET:id/PUT/DELETE /api/v1/tenants/:tenantId/campaigns, POST activate/pause/complete. Schemas Zod para create/update. Bruno collections em collections/Campanhas/. Delete só permite status draft."
echo "  3/8 done"

linearis issues create --team "$TEAM" --status "Backlog" --estimate 2 \
  --parent-ticket "$EPIC1_KEY" \
  --labels "$MVP_LABEL,$BACKEND_LABEL" \
  --title "Serviço de matching campanha↔lead (UTM auto + manual + default)" \
  --description "Criar campaign.service.ts com algoritmo: 1) se lead já tem activeCampaignId ativa → manter; 2) match por UTM params vs utm_rules; 3) fallback para campanha isDefault; 4) inserir lead_campaigns + atualizar lead.activeCampaignId + criar lead_event. Integrar em webhook.service.ts após upsertLead."
echo "  4/8 done"

linearis issues create --team "$TEAM" --status "Backlog" --estimate 3 \
  --parent-ticket "$EPIC1_KEY" \
  --labels "$MVP_LABEL,$BACKEND_LABEL" \
  --title "Pipeline de IA com contexto de campanha (merge config + prompt)" \
  --description "Criar campaign.merge.ts: mergeCampaignConfig(tenant, campaign). Strategy: productsInfo/pricingInfo/faq = replace; customInstructions = append; handoffRules = shallow merge. Modificar message.pipeline.ts para buscar campanha ativa do lead e aplicar merge antes de buildSystemPrompt()."
echo "  5/8 done"

linearis issues create --team "$TEAM" --status "Backlog" --estimate 2 \
  --parent-ticket "$EPIC1_KEY" \
  --labels "$MVP_LABEL,$BACKEND_LABEL" \
  --title "Lifecycle automatizado de campanhas (worker BullMQ)" \
  --description "Worker BullMQ (cron 15min): 1) auto-ativar campanhas draft com autoActivate=true e startDate<=now; 2) auto-completar campanhas active com endDate<now; 3) limpar leads com activeCampaignId de campanhas completed. Adicionar queues CAMPAIGN_LIFECYCLE, BROADCAST, AUTOMATION em config."
echo "  6/8 done"

linearis issues create --team "$TEAM" --status "Backlog" --estimate 2 \
  --parent-ticket "$EPIC1_KEY" \
  --labels "$MVP_LABEL,$BACKEND_LABEL" \
  --title "Endpoint de métricas por campanha" \
  --description "GET /api/v1/tenants/:tenantId/campaigns/:id/metrics. Retornar: totalLeads, leadsByStage, handoffRate, avgScore, conversionRate, topIntents, leadsOverTime. Queries otimizadas com agregações SQL."
echo "  7/8 done"

linearis issues create --team "$TEAM" --status "Backlog" --estimate 3 \
  --parent-ticket "$EPIC1_KEY" \
  --labels "$MVP_LABEL,$BACKEND_LABEL" \
  --title "Testes do módulo de campanhas (>80% coverage)" \
  --description "Testes unitários e de integração para: campaign.merge.ts, campaign.service.ts, campaign-lifecycle.worker.ts, campaigns routes, message.pipeline.ts campaign-aware. Cobertura >80%."
echo "  8/8 done"

# ──────────────────────────────────────────────────────────────────────
# Epic 2: S-027-CAMP: Painel de Campanhas (Frontend)
# Labels: Painel, frontend
# ──────────────────────────────────────────────────────────────────────
echo ""
echo "=== Creating Epic 2: S-027-CAMP ==="
EPIC2=$(linearis issues create \
  --team "$TEAM" \
  --title "S-027-CAMP: Painel de Campanhas (Frontend)" \
  --description "Épico que cobre toda a interface do painel para gestão de campanhas: listagem, wizard de criação, detalhes com métricas, edição, filtros no inbox e associação manual." \
  --labels "$PAINEL_LABEL,$FRONTEND_LABEL" \
  --status "Backlog" \
  2>&1)
EPIC2_ID=$(echo "$EPIC2" | jq -r '.id // .identifier // empty')
EPIC2_KEY=$(echo "$EPIC2" | jq -r '.identifier // empty')
echo "Epic 2 created: $EPIC2_KEY ($EPIC2_ID)"

echo "  Creating sub-issues for Epic 2..."

linearis issues create --team "$TEAM" --status "Backlog" --estimate 2 \
  --parent-ticket "$EPIC2_KEY" \
  --labels "$PAINEL_LABEL,$FRONTEND_LABEL" \
  --title "Página de listagem /campanhas" \
  --description "Tela com tabela/cards de campanhas do tenant. Filtros por status e tipo. Badges de status com cores. Botão criar nova campanha. Contadores de leads por campanha."
echo "  1/7 done"

linearis issues create --team "$TEAM" --status "Backlog" --estimate 3 \
  --parent-ticket "$EPIC2_KEY" \
  --labels "$PAINEL_LABEL,$FRONTEND_LABEL" \
  --title "Wizard de criação (5 etapas)" \
  --description "Wizard multi-step: 1) Info básica (nome, tipo, datas); 2) Configuração IA (products, pricing, FAQ, instructions); 3) Regras UTM (builder visual); 4) Metas (goal_leads, goal_conversions); 5) Revisão + ativar/salvar draft. React Hook Form + Zod."
echo "  2/7 done"

linearis issues create --team "$TEAM" --status "Backlog" --estimate 3 \
  --parent-ticket "$EPIC2_KEY" \
  --labels "$PAINEL_LABEL,$FRONTEND_LABEL" \
  --title "Página de detalhes /campanhas/:id com métricas" \
  --description "Dashboard da campanha: cards de métricas (leads, conversão, score médio), gráfico de leads ao longo do tempo (Recharts), lista de leads associados, timeline de eventos, ações (pausar/completar/editar)."
echo "  3/7 done"

linearis issues create --team "$TEAM" --status "Backlog" --estimate 2 \
  --parent-ticket "$EPIC2_KEY" \
  --labels "$PAINEL_LABEL,$FRONTEND_LABEL" \
  --title "Edição de campanha existente" \
  --description "Reutilizar wizard de criação em modo edição. Campos restritos baseado no status (ex: não editar UTM se campanha ativa com leads). Confirmação para mudanças que afetam leads ativos."
echo "  4/7 done"

linearis issues create --team "$TEAM" --status "Backlog" --estimate 1 \
  --parent-ticket "$EPIC2_KEY" \
  --labels "$PAINEL_LABEL,$FRONTEND_LABEL" \
  --title "Filtro de campanha no inbox" \
  --description "Adicionar dropdown de campanha no filtro do inbox. Filtrar conversas por conversation.campaign_id. Indicador visual de campanha na lista de conversas."
echo "  5/7 done"

linearis issues create --team "$TEAM" --status "Backlog" --estimate 1 \
  --parent-ticket "$EPIC2_KEY" \
  --labels "$PAINEL_LABEL,$FRONTEND_LABEL" \
  --title "Associação manual lead↔campanha" \
  --description "No perfil do lead, permitir associar/desassociar manualmente a uma campanha. Select com campanhas ativas do tenant. Registrar matched_by='manual' no lead_campaigns."
echo "  6/7 done"

linearis issues create --team "$TEAM" --status "Backlog" --estimate 2 \
  --parent-ticket "$EPIC2_KEY" \
  --labels "$PAINEL_LABEL,$FRONTEND_LABEL" \
  --title "Testes do módulo frontend de campanhas" \
  --description "Testes com Vitest + Testing Library para componentes de campanhas. Mock de API calls. Testes de wizard navigation, validação de formulários, renderização de métricas."
echo "  7/7 done"

# ──────────────────────────────────────────────────────────────────────
# Epic 3: S-028-CRM: CRM Avançado & Outbound
# Labels: Painel, backend, frontend
# ──────────────────────────────────────────────────────────────────────
echo ""
echo "=== Creating Epic 3: S-028-CRM ==="
EPIC3=$(linearis issues create \
  --team "$TEAM" \
  --title "S-028-CRM: CRM Avançado & Outbound" \
  --description "Épico que cobre funcionalidades de CRM avançado: templates de mensagem, segmentação de leads, broadcast (envio em massa), follow-up sequences e analytics de atribuição." \
  --labels "$PAINEL_LABEL,$BACKEND_LABEL,$FRONTEND_LABEL" \
  --status "Backlog" \
  2>&1)
EPIC3_ID=$(echo "$EPIC3" | jq -r '.id // .identifier // empty')
EPIC3_KEY=$(echo "$EPIC3" | jq -r '.identifier // empty')
echo "Epic 3 created: $EPIC3_KEY ($EPIC3_ID)"

echo "  Creating sub-issues for Epic 3..."

linearis issues create --team "$TEAM" --status "Backlog" --estimate 2 \
  --parent-ticket "$EPIC3_KEY" \
  --labels "$PAINEL_LABEL,$BACKEND_LABEL,$FRONTEND_LABEL" \
  --title "Templates de mensagem WhatsApp (CRUD)" \
  --description "Tabela message_templates (id, tenant_id, name, content, variables JSONB, category, status). CRUD API + Zod schemas. Preview com variáveis substituídas. Bruno collections."
echo "  1/9 done"

linearis issues create --team "$TEAM" --status "Backlog" --estimate 2 \
  --parent-ticket "$EPIC3_KEY" \
  --labels "$PAINEL_LABEL,$BACKEND_LABEL,$FRONTEND_LABEL" \
  --title "Segmentação de leads (CRUD + preview)" \
  --description "Tabela lead_segments (id, tenant_id, name, rules JSONB). Rules: filtros por stage, score range, campanha, tags, último contato. CRUD API com endpoint de preview (contagem de leads que match). Bruno collections."
echo "  2/9 done"

linearis issues create --team "$TEAM" --status "Backlog" --estimate 3 \
  --parent-ticket "$EPIC3_KEY" \
  --labels "$PAINEL_LABEL,$BACKEND_LABEL,$FRONTEND_LABEL" \
  --title "Broadcast — envio em massa (CRUD + worker BullMQ)" \
  --description "Tabela broadcasts (id, tenant_id, segment_id, template_id, status, scheduled_at, sent_count, failed_count). CRUD API. Worker BullMQ para processar envio em lotes com rate limiting. Tracking de delivery status."
echo "  3/9 done"

linearis issues create --team "$TEAM" --status "Backlog" --estimate 3 \
  --parent-ticket "$EPIC3_KEY" \
  --labels "$PAINEL_LABEL,$BACKEND_LABEL,$FRONTEND_LABEL" \
  --title "Follow-up sequences por campanha" \
  --description "Tabela follow_up_sequences (id, tenant_id, campaign_id, name, steps JSONB). Steps: [{delay, template_id, condition}]. Worker BullMQ para executar steps com delays. Cancelamento automático se lead responde."
echo "  4/9 done"

linearis issues create --team "$TEAM" --status "Backlog" --estimate 2 \
  --parent-ticket "$EPIC3_KEY" \
  --labels "$PAINEL_LABEL,$BACKEND_LABEL,$FRONTEND_LABEL" \
  --title "Analytics de atribuição" \
  --description "Endpoint de analytics: leads por fonte UTM, conversões por campanha, funil de temperatura, tempo médio de conversão. Queries otimizadas com CTEs."
echo "  5/9 done"

linearis issues create --team "$TEAM" --status "Backlog" --estimate 2 \
  --parent-ticket "$EPIC3_KEY" \
  --labels "$PAINEL_LABEL,$BACKEND_LABEL,$FRONTEND_LABEL" \
  --title "Tela de broadcasts" \
  --description "Interface para criar/agendar broadcasts: selecionar segmento, template, data/hora. Lista de broadcasts com status (draft/scheduled/sending/sent). Métricas de envio (enviados, falhas, taxa)."
echo "  6/9 done"

linearis issues create --team "$TEAM" --status "Backlog" --estimate 2 \
  --parent-ticket "$EPIC3_KEY" \
  --labels "$PAINEL_LABEL,$BACKEND_LABEL,$FRONTEND_LABEL" \
  --title "Tela de segmentos e templates" \
  --description "CRUD visual de segmentos com builder de regras drag-and-drop. CRUD de templates com editor e preview. Contagem em tempo real de leads que match o segmento."
echo "  7/9 done"

linearis issues create --team "$TEAM" --status "Backlog" --estimate 2 \
  --parent-ticket "$EPIC3_KEY" \
  --labels "$PAINEL_LABEL,$BACKEND_LABEL,$FRONTEND_LABEL" \
  --title "Tela de follow-up sequences" \
  --description "Editor visual de sequências: timeline de steps com delays e condições. Preview do fluxo. Métricas de execução (leads em cada step, taxas de conclusão)."
echo "  8/9 done"

linearis issues create --team "$TEAM" --status "Backlog" --estimate 3 \
  --parent-ticket "$EPIC3_KEY" \
  --labels "$PAINEL_LABEL,$BACKEND_LABEL,$FRONTEND_LABEL" \
  --title "Testes do módulo CRM (>80% coverage)" \
  --description "Testes unitários e de integração para templates, segmentos, broadcasts, follow-ups e analytics. Mock de channel adapters para broadcast. Cobertura >80%."
echo "  9/9 done"

# ──────────────────────────────────────────────────────────────────────
# Epic 4: S-029-PIPE: Pipeline Avançado
# Labels: Painel, backend, frontend
# ──────────────────────────────────────────────────────────────────────
echo ""
echo "=== Creating Epic 4: S-029-PIPE ==="
EPIC4=$(linearis issues create \
  --team "$TEAM" \
  --title "S-029-PIPE: Pipeline Avançado" \
  --description "Épico que cobre o pipeline avançado com estágios customizáveis, automações, kanban visual e ações rápidas." \
  --labels "$PAINEL_LABEL,$BACKEND_LABEL,$FRONTEND_LABEL" \
  --status "Backlog" \
  2>&1)
EPIC4_ID=$(echo "$EPIC4" | jq -r '.id // .identifier // empty')
EPIC4_KEY=$(echo "$EPIC4" | jq -r '.identifier // empty')
echo "Epic 4 created: $EPIC4_KEY ($EPIC4_ID)"

echo "  Creating sub-issues for Epic 4..."

linearis issues create --team "$TEAM" --status "Backlog" --estimate 2 \
  --parent-ticket "$EPIC4_KEY" \
  --labels "$PAINEL_LABEL,$BACKEND_LABEL,$FRONTEND_LABEL" \
  --title "Tabela pipeline_stages + seed + leads.pipelineStageId" \
  --description "Tabela pipeline_stages (id, tenant_id, name, position, color, is_won, is_lost). Seed com estágios padrão (Novo, Qualificando, Proposta, Negociação, Ganho, Perdido). FK em leads.pipeline_stage_id."
echo "  1/9 done"

linearis issues create --team "$TEAM" --status "Backlog" --estimate 2 \
  --parent-ticket "$EPIC4_KEY" \
  --labels "$PAINEL_LABEL,$BACKEND_LABEL,$FRONTEND_LABEL" \
  --title "Tabela pipeline_automations + CRUD API" \
  --description "Tabela pipeline_automations (id, tenant_id, trigger_stage_id, action_type enum, action_config JSONB, is_active). Actions: send_message, assign_agent, create_task, notify. CRUD API + Bruno collections."
echo "  2/9 done"

linearis issues create --team "$TEAM" --status "Backlog" --estimate 2 \
  --parent-ticket "$EPIC4_KEY" \
  --labels "$PAINEL_LABEL,$BACKEND_LABEL,$FRONTEND_LABEL" \
  --title "Worker de automações do pipeline" \
  --description "Worker BullMQ que escuta eventos pipeline_stage_moved. Busca automações ativas para o stage. Executa ações (enviar mensagem, notificar, etc). Retry com backoff exponencial."
echo "  3/9 done"

linearis issues create --team "$TEAM" --status "Backlog" --estimate 2 \
  --parent-ticket "$EPIC4_KEY" \
  --labels "$PAINEL_LABEL,$BACKEND_LABEL,$FRONTEND_LABEL" \
  --title "Configuração de estágios no painel" \
  --description "Tela de settings para gerenciar estágios do pipeline. Drag-and-drop para reordenar (dnd-kit). CRUD inline. Cores customizáveis. Flags is_won/is_lost."
echo "  4/9 done"

linearis issues create --team "$TEAM" --status "Backlog" --estimate 3 \
  --parent-ticket "$EPIC4_KEY" \
  --labels "$PAINEL_LABEL,$BACKEND_LABEL,$FRONTEND_LABEL" \
  --title "Kanban com estágios customizáveis" \
  --description "Visão kanban do pipeline com colunas por estágio. Cards de leads com info resumida (nome, score, campanha). Drag-and-drop entre colunas (dnd-kit). Atualização otimista."
echo "  5/9 done"

linearis issues create --team "$TEAM" --status "Backlog" --estimate 2 \
  --parent-ticket "$EPIC4_KEY" \
  --labels "$PAINEL_LABEL,$BACKEND_LABEL,$FRONTEND_LABEL" \
  --title "Múltiplas visões + filtros avançados" \
  --description "Toggle entre visão kanban e tabela. Filtros: campanha, score range, agente, data de criação, tags. Salvamento de filtros como 'visões' favoritas."
echo "  6/9 done"

linearis issues create --team "$TEAM" --status "Backlog" --estimate 2 \
  --parent-ticket "$EPIC4_KEY" \
  --labels "$PAINEL_LABEL,$BACKEND_LABEL,$FRONTEND_LABEL" \
  --title "Cards enriquecidos + ações rápidas" \
  --description "Cards do kanban com: último mensagem, score badge, tempo desde último contato, campanha badge. Quick actions: mover estágio, atribuir agente, iniciar conversa, adicionar nota."
echo "  7/9 done"

linearis issues create --team "$TEAM" --status "Backlog" --estimate 3 \
  --parent-ticket "$EPIC4_KEY" \
  --labels "$PAINEL_LABEL,$BACKEND_LABEL,$FRONTEND_LABEL" \
  --title "Configuração de automações no painel" \
  --description "Tela para criar/editar automações do pipeline. Trigger: seletor de estágio. Ações: builder visual com tipos (mensagem, notificação, atribuição). Toggle ativo/inativo. Log de execuções."
echo "  8/9 done"

linearis issues create --team "$TEAM" --status "Backlog" --estimate 2 \
  --parent-ticket "$EPIC4_KEY" \
  --labels "$PAINEL_LABEL,$BACKEND_LABEL,$FRONTEND_LABEL" \
  --title "Testes do pipeline avançado (>80% coverage)" \
  --description "Testes para pipeline_stages CRUD, automations CRUD, worker de automações, kanban interactions. Cobertura >80%."
echo "  9/9 done"

# ──────────────────────────────────────────────────────────────────────
# Summary
# ──────────────────────────────────────────────────────────────────────
echo ""
echo "============================================"
echo "All issues created successfully!"
echo "  Epic 1: $EPIC1_KEY - S-026-CAMP: Gestão de Campanhas (Backend) [8 sub-issues]"
echo "  Epic 2: $EPIC2_KEY - S-027-CAMP: Painel de Campanhas (Frontend) [7 sub-issues]"
echo "  Epic 3: $EPIC3_KEY - S-028-CRM: CRM Avançado & Outbound [9 sub-issues]"
echo "  Epic 4: $EPIC4_KEY - S-029-PIPE: Pipeline Avançado [9 sub-issues]"
echo "  Total: 4 epics + 33 sub-issues = 37 issues"
echo "============================================"
echo ""
echo "Listing all created issues..."
linearis issues list --team "$TEAM" --status "Backlog" | head -60
