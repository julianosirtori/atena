#!/usr/bin/env bash
set -euo pipefail

# Stop Atena environment to save costs
# Stops ECS services, ElastiCache, and RDS

AWS_REGION="${AWS_REGION:-sa-east-1}"
CLUSTER="atena-prod-cluster"
API_SERVICE="atena-prod-api"
WORKERS_SERVICE="atena-prod-workers"
REDIS_CLUSTER="atena-prod-redis"
RDS_INSTANCE="atena-prod-db"

echo "==> Stopping Atena environment"
echo "    Region: $AWS_REGION"
echo ""

# --- Step 1: Scale ECS to 0 ---
echo "[1/4] Scaling ECS services to 0..."

aws ecs update-service \
  --cluster "$CLUSTER" \
  --service "$API_SERVICE" \
  --desired-count 0 \
  --region "$AWS_REGION" \
  --no-cli-pager >/dev/null

aws ecs update-service \
  --cluster "$CLUSTER" \
  --service "$WORKERS_SERVICE" \
  --desired-count 0 \
  --region "$AWS_REGION" \
  --no-cli-pager >/dev/null

echo "    Waiting for tasks to drain..."
aws ecs wait services-stable \
  --cluster "$CLUSTER" \
  --services "$API_SERVICE" "$WORKERS_SERVICE" \
  --region "$AWS_REGION"

echo "[OK] ECS services scaled to 0"

# --- Step 2: Snapshot + Delete ElastiCache ---
echo "[2/4] Creating ElastiCache snapshot and deleting cluster..."

SNAPSHOT_NAME="atena-redis-$(date +%Y%m%d-%H%M%S)"

# Check if cluster exists before trying to delete
if aws elasticache describe-cache-clusters --cache-cluster-id "$REDIS_CLUSTER" --region "$AWS_REGION" >/dev/null 2>&1; then
  aws elasticache delete-cache-cluster \
    --cache-cluster-id "$REDIS_CLUSTER" \
    --final-snapshot-identifier "$SNAPSHOT_NAME" \
    --region "$AWS_REGION" >/dev/null

  echo "    Snapshot: $SNAPSHOT_NAME"
  echo "    Waiting for cluster deletion (this may take a few minutes)..."

  aws elasticache wait cache-cluster-deleted \
    --cache-cluster-id "$REDIS_CLUSTER" \
    --region "$AWS_REGION" 2>/dev/null || true

  echo "[OK] ElastiCache cluster deleted"
else
  echo "[SKIP] ElastiCache cluster not found (already deleted?)"
fi

# --- Step 3: Stop RDS ---
echo "[3/4] Stopping RDS instance..."

RDS_STATUS=$(aws rds describe-db-instances \
  --db-instance-identifier "$RDS_INSTANCE" \
  --query 'DBInstances[0].DBInstanceStatus' \
  --output text \
  --region "$AWS_REGION" 2>/dev/null || echo "not-found")

if [ "$RDS_STATUS" = "available" ]; then
  aws rds stop-db-instance \
    --db-instance-identifier "$RDS_INSTANCE" \
    --region "$AWS_REGION" >/dev/null

  echo "    Waiting for RDS to stop..."
  aws rds wait db-instance-stopped \
    --db-instance-identifier "$RDS_INSTANCE" \
    --region "$AWS_REGION"

  echo "[OK] RDS instance stopped"
elif [ "$RDS_STATUS" = "stopped" ]; then
  echo "[SKIP] RDS instance already stopped"
else
  echo "[WARN] RDS instance status: $RDS_STATUS"
fi

# --- Step 4: Summary ---
echo ""
echo "[4/4] Summary"
echo "    ECS services: scaled to 0"
echo "    ElastiCache: deleted (snapshot: $SNAPSHOT_NAME)"
echo "    RDS: stopped"
echo ""
echo "==> Environment stopped! Estimated cost while stopped: ~\$5/mês"
echo "    To restart: bash scripts/aws/start-environment.sh"
