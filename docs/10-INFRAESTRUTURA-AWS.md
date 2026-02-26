# 10. Infraestrutura AWS

## Diagrama de Arquitetura

```
                         Internet
                            │
                     ┌──────┴──────┐
                     │   Route53   │  (opcional)
                     └──────┬──────┘
                            │
              ┌─────────────┴─────────────┐
              │     VPC 10.0.0.0/16       │
              │                           │
              │  ┌─── Public Subnets ───┐ │
              │  │  10.0.1.0/24 (1a)    │ │
              │  │  10.0.2.0/24 (1b)    │ │
              │  │                      │ │
              │  │  ┌──────────────┐    │ │
              │  │  │     ALB      │    │ │
              │  │  │  (port 80/443)│   │ │
              │  │  └──────┬───────┘    │ │
              │  │         │            │ │
              │  │  ┌──────────────┐    │ │
              │  │  │  NAT Gateway │    │ │
              │  │  └──────┬───────┘    │ │
              │  └─────────┼────────────┘ │
              │            │              │
              │  ┌─── Private Subnets ──┐ │
              │  │  10.0.10.0/24 (1a)   │ │
              │  │  10.0.20.0/24 (1b)   │ │
              │  │                      │ │
              │  │  ┌────────────────┐  │ │
              │  │  │  ECS Fargate   │  │ │
              │  │  │  ┌──────────┐  │  │ │
              │  │  │  │   API    │  │  │ │
              │  │  │  │ (port 3000)│ │  │ │
              │  │  │  └──────────┘  │  │ │
              │  │  │  ┌──────────┐  │  │ │
              │  │  │  │ Workers  │  │  │ │
              │  │  │  │ (BullMQ) │  │  │ │
              │  │  │  └──────────┘  │  │ │
              │  │  └────────────────┘  │ │
              │  │                      │ │
              │  │  ┌─────────┐ ┌─────┐ │ │
              │  │  │  RDS    │ │Redis│ │ │
              │  │  │ PG 16   │ │ 7.1 │ │ │
              │  │  └─────────┘ └─────┘ │ │
              │  └──────────────────────┘ │
              └───────────────────────────┘
```

## Setup Inicial

### Pré-requisitos

- AWS CLI v2 configurado (`aws configure`)
- Terraform >= 1.7.0 instalado
- Docker instalado (para build das imagens)
- Conta AWS com permissões de administrador

### Passo a passo

#### 1. Bootstrap do backend Terraform

```bash
# Cria o bucket S3 e tabela DynamoDB para remote state
bash scripts/aws/bootstrap-terraform.sh
```

#### 2. Atualizar backend.tf

Edite `infra/backend.tf` e atualize o nome do bucket com o ID da sua conta (impresso pelo bootstrap).

#### 3. Inicializar Terraform

```bash
cd infra
terraform init
```

#### 4. Revisar e aplicar

```bash
terraform plan -out=plan.tfplan
terraform apply plan.tfplan
```

#### 5. Configurar secrets no SSM

```bash
# Substitua os valores placeholder
aws ssm put-parameter \
  --name /atena/prod/CLAUDE_API_KEY \
  --type SecureString \
  --value "sk-ant-..." \
  --overwrite

aws ssm put-parameter \
  --name /atena/prod/ADMIN_TOKEN \
  --type SecureString \
  --value "seu-token-admin" \
  --overwrite

aws ssm put-parameter \
  --name /atena/prod/TELEGRAM_BOT_TOKEN \
  --type SecureString \
  --value "123456:ABC..." \
  --overwrite
```

#### 6. Primeiro deploy

```bash
bash scripts/aws/initial-deploy.sh
```

#### 7. Configurar GitHub Actions

Adicione estes secrets no repositório GitHub (Settings → Secrets → Actions):

| Secret | Valor | Como obter |
|--------|-------|------------|
| `AWS_DEPLOY_ROLE_ARN` | ARN do role OIDC | `terraform output github_actions_role_arn` |
| `ALB_DNS_NAME` | DNS do ALB | `terraform output alb_dns_name` |
| `PRIVATE_SUBNET_IDS` | IDs das subnets privadas | `terraform output private_subnet_ids` |
| `ECS_SECURITY_GROUP_ID` | ID do SG ECS | `terraform output ecs_security_group_id` |

## Estimativa de Custos

### Rodando 24/7

| Recurso | Custo/mês |
|---------|-----------|
| ECS Fargate (2 tasks × 0.25 vCPU, 0.5GB) | ~$18 |
| RDS db.t4g.micro | ~$13 |
| ElastiCache cache.t4g.micro | ~$12 |
| ALB | ~$18 |
| NAT Gateway | ~$35 |
| CloudWatch Logs | ~$3 |
| ECR | ~$1 |
| S3/DynamoDB (state) | ~$1 |
| **Total** | **~$101/mês** |

### Com toggle liga/desliga (8h/dia)

| Recurso | Custo/mês |
|---------|-----------|
| ECS (8h/dia) | ~$6 |
| RDS (parado, storage) | ~$3 |
| ElastiCache (recriado diário) | ~$4 |
| ALB (8h/dia) | ~$8 |
| NAT Gateway (8h/dia) | ~$12 |
| Fixos (logs, ECR, state) | ~$5 |
| **Total** | **~$38/mês** |

### Ambiente parado

| Recurso | Custo/mês |
|---------|-----------|
| RDS (parado, storage 20GB) | ~$3 |
| S3 (state + snapshots) | ~$1 |
| EIP (não associado) | ~$4 |
| **Total** | **~$8/mês** |

## Deploy Automático (CI/CD)

O pipeline roda automaticamente em cada push para `main`:

1. **Build** — Constrói imagens Docker para API e Workers
2. **Push** — Envia imagens para ECR com tags `sha-{commit}` e `latest`
3. **Migrate** — Executa migrations via ECS RunTask
4. **Deploy API** — Atualiza o serviço API com nova imagem
5. **Deploy Workers** — Atualiza o serviço Workers com nova imagem
6. **Health Check** — Verifica `/health` endpoint (10 tentativas)

### Monitorar deploy

```bash
# Ver logs do deploy no GitHub Actions
# Settings → Actions → Deploy to Production

# Ver status dos serviços
aws ecs describe-services \
  --cluster atena-prod-cluster \
  --services atena-prod-api atena-prod-workers \
  --query 'services[*].{name:serviceName,desired:desiredCount,running:runningCount,status:status}'
```

## Liga/Desliga

### Parar ambiente (economia de custos)

**Via GitHub Actions:**
1. Vá em Actions → Environment Toggle
2. Clique "Run workflow"
3. Selecione "stop"

**Via CLI:**
```bash
bash scripts/aws/stop-environment.sh
```

### Iniciar ambiente

**Via GitHub Actions:**
1. Vá em Actions → Environment Toggle
2. Clique "Run workflow"
3. Selecione "start"

**Via CLI:**
```bash
bash scripts/aws/start-environment.sh
```

> **Nota:** O RDS para automaticamente após 7 dias se não for usado. Ele também reinicia automaticamente após 7 dias parado (limitação da AWS). Considere automatizar o stop com um schedule.

## Runbook Operacional

### Ver logs

```bash
# API logs (últimos 30min)
aws logs tail /ecs/atena-prod-api --since 30m --follow

# Workers logs
aws logs tail /ecs/atena-prod-workers --since 30m --follow

# Filtrar por erro
aws logs filter-log-events \
  --log-group-name /ecs/atena-prod-api \
  --filter-pattern "ERROR" \
  --start-time $(date -d '1 hour ago' +%s000)
```

### Scale up/down

```bash
# Scale API para 2 instâncias
aws ecs update-service \
  --cluster atena-prod-cluster \
  --service atena-prod-api \
  --desired-count 2

# Scale Workers para 2
aws ecs update-service \
  --cluster atena-prod-cluster \
  --service atena-prod-workers \
  --desired-count 2
```

### Rollback

```bash
# Listar task definitions anteriores
aws ecs list-task-definitions \
  --family-prefix atena-prod-api \
  --sort DESC \
  --max-items 5

# Fazer rollback para versão anterior
aws ecs update-service \
  --cluster atena-prod-cluster \
  --service atena-prod-api \
  --task-definition atena-prod-api:VERSAO_ANTERIOR
```

### Migrations manuais

```bash
# Executar migration manualmente
aws ecs run-task \
  --cluster atena-prod-cluster \
  --task-definition atena-prod-api \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[SUBNET_IDS],securityGroups=[SG_ID],assignPublicIp=DISABLED}" \
  --overrides '{
    "containerOverrides": [{
      "name": "api",
      "command": ["node", "packages/database/dist/migrate.js"]
    }]
  }'
```

## Disaster Recovery

### RDS (PostgreSQL)

- **Backups automáticos:** Retenção de 7 dias, janela 03:00-04:00 UTC
- **Final snapshot:** Criado automaticamente antes de qualquer destruição
- **Restore:** Via console AWS ou CLI `aws rds restore-db-instance-from-db-snapshot`

### ElastiCache (Redis)

- **Snapshots:** Criados pelo script `stop-environment.sh` antes de deletar
- **Restore:** Script `start-environment.sh` restaura do último snapshot
- **Dados transitórios:** Redis contém filas BullMQ — perda de dados = jobs re-enqueued

### Redeployment completo

Se precisar recriar tudo do zero:

```bash
cd infra
terraform destroy  # CUIDADO: destrói tudo
terraform apply
bash scripts/aws/initial-deploy.sh
# Reconfigurar secrets SSM
```

## Secrets

### Listar secrets atuais

```bash
aws ssm get-parameters-by-path \
  --path /atena/prod/ \
  --with-decryption \
  --query 'Parameters[*].{Name:Name,LastModified:LastModifiedDate}'
```

### Atualizar um secret

```bash
aws ssm put-parameter \
  --name /atena/prod/CLAUDE_API_KEY \
  --type SecureString \
  --value "novo-valor" \
  --overwrite

# Forçar novo deploy para pegar o novo valor
aws ecs update-service \
  --cluster atena-prod-cluster \
  --service atena-prod-api \
  --force-new-deployment
```

### Secrets gerenciados

| Parâmetro | Gerenciado por | Notas |
|-----------|---------------|-------|
| `DATABASE_URL` | Terraform | Gerado automaticamente com password do RDS |
| `REDIS_URL` | Terraform / Script | Atualizado pelo start-environment.sh se endpoint mudar |
| `CLAUDE_API_KEY` | Manual | Placeholder `CHANGE_ME` — atualizar manualmente |
| `ADMIN_TOKEN` | Manual | Placeholder `CHANGE_ME` — atualizar manualmente |
| `TELEGRAM_BOT_TOKEN` | Manual | Placeholder `CHANGE_ME` — atualizar manualmente |

## Troubleshooting

### ECS tasks não iniciam

```bash
# Ver eventos do serviço
aws ecs describe-services \
  --cluster atena-prod-cluster \
  --services atena-prod-api \
  --query 'services[0].events[:5]'

# Ver reason de tasks paradas
aws ecs list-tasks --cluster atena-prod-cluster --service-name atena-prod-api --desired-status STOPPED
aws ecs describe-tasks --cluster atena-prod-cluster --tasks TASK_ARN \
  --query 'tasks[0].{status:lastStatus,reason:stoppedReason,container:containers[0].reason}'
```

**Causas comuns:**
- Imagem não encontrada no ECR → verificar ECR login e push
- Secrets SSM não encontrados → verificar paths e permissões IAM
- Sem conectividade → verificar NAT Gateway e security groups
- OOM → aumentar `api_memory` / `workers_memory` nas variáveis

### Health check falhando

```bash
# Testar diretamente
curl -v http://$(terraform output -raw alb_dns_name)/health

# Verificar target group health
aws elbv2 describe-target-health \
  --target-group-arn $(aws elbv2 describe-target-groups \
    --names atena-prod-api-tg \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)
```

**Causas comuns:**
- API não respondendo na porta 3000 → verificar logs
- Security group bloqueando → verificar regra ALB → ECS
- Health check path errado → deve ser `/health`

### RDS conexão recusada

```bash
# Verificar status
aws rds describe-db-instances \
  --db-instance-identifier atena-prod-db \
  --query 'DBInstances[0].{status:DBInstanceStatus,endpoint:Endpoint}'
```

**Causas comuns:**
- RDS parado → `aws rds start-db-instance --db-instance-identifier atena-prod-db`
- Security group → verificar que ECS SG tem acesso à porta 5432 do RDS SG
- Credenciais → verificar SSM `DATABASE_URL`

### Redis conexão recusada

```bash
# Verificar status
aws elasticache describe-cache-clusters \
  --cache-cluster-id atena-prod-redis \
  --show-cache-node-info
```

**Causas comuns:**
- Cluster deletado (após stop) → executar `start-environment.sh`
- Endpoint mudou → verificar SSM `REDIS_URL`
- Security group → verificar que ECS SG tem acesso à porta 6379
