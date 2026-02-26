#!/usr/bin/env bash
set -euo pipefail

# Start Atena environment
# Starts RDS, restores ElastiCache, runs migrations, scales ECS

AWS_REGION="${AWS_REGION:-sa-east-1}"
CLUSTER="atena-prod-cluster"
API_SERVICE="atena-prod-api"
WORKERS_SERVICE="atena-prod-workers"
REDIS_CLUSTER="atena-prod-redis"
REDIS_SUBNET_GROUP="atena-prod-redis-subnet"
REDIS_PARAM_GROUP="atena-prod-redis7"
RDS_INSTANCE="atena-prod-db"

echo "==> Starting Atena environment"
echo "    Region: $AWS_REGION"
echo ""

# --- Step 1: Start RDS ---
echo "[1/6] Starting RDS instance..."

RDS_STATUS=$(aws rds describe-db-instances \
  --db-instance-identifier "$RDS_INSTANCE" \
  --query 'DBInstances[0].DBInstanceStatus' \
  --output text \
  --region "$AWS_REGION" 2>/dev/null || echo "not-found")

if [ "$RDS_STATUS" = "stopped" ]; then
  aws rds start-db-instance \
    --db-instance-identifier "$RDS_INSTANCE" \
    --region "$AWS_REGION" >/dev/null

  echo "    Waiting for RDS to become available (this may take a few minutes)..."
  aws rds wait db-instance-available \
    --db-instance-identifier "$RDS_INSTANCE" \
    --region "$AWS_REGION"

  echo "[OK] RDS instance started"
elif [ "$RDS_STATUS" = "available" ]; then
  echo "[SKIP] RDS instance already available"
else
  echo "[WARN] RDS instance status: $RDS_STATUS — waiting..."
  aws rds wait db-instance-available \
    --db-instance-identifier "$RDS_INSTANCE" \
    --region "$AWS_REGION"
fi

# --- Step 2: Restore ElastiCache ---
echo "[2/6] Restoring ElastiCache Redis..."

# Check if cluster already exists
if aws elasticache describe-cache-clusters --cache-cluster-id "$REDIS_CLUSTER" --region "$AWS_REGION" >/dev/null 2>&1; then
  echo "[SKIP] ElastiCache cluster already exists"
else
  # Find latest snapshot
  LATEST_SNAPSHOT=$(aws elasticache describe-snapshots \
    --cache-cluster-id "$REDIS_CLUSTER" \
    --region "$AWS_REGION" \
    --query 'sort_by(Snapshots, &NodeSnapshots[0].SnapshotCreateTime)[-1].SnapshotName' \
    --output text 2>/dev/null || echo "None")

  # Get ECS security group ID
  ECS_SG=$(aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=atena-prod-ecs-sg" \
    --query 'SecurityGroups[0].GroupId' \
    --output text \
    --region "$AWS_REGION")

  REDIS_SG=$(aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=atena-prod-redis-sg" \
    --query 'SecurityGroups[0].GroupId' \
    --output text \
    --region "$AWS_REGION")

  if [ "$LATEST_SNAPSHOT" != "None" ] && [ -n "$LATEST_SNAPSHOT" ]; then
    echo "    Restoring from snapshot: $LATEST_SNAPSHOT"
    aws elasticache create-cache-cluster \
      --cache-cluster-id "$REDIS_CLUSTER" \
      --snapshot-name "$LATEST_SNAPSHOT" \
      --cache-subnet-group-name "$REDIS_SUBNET_GROUP" \
      --security-group-ids "$REDIS_SG" \
      --region "$AWS_REGION" >/dev/null
  else
    echo "    No snapshot found, creating fresh cluster"
    aws elasticache create-cache-cluster \
      --cache-cluster-id "$REDIS_CLUSTER" \
      --engine redis \
      --engine-version "7.1" \
      --cache-node-type cache.t4g.micro \
      --num-cache-nodes 1 \
      --cache-parameter-group-name "$REDIS_PARAM_GROUP" \
      --cache-subnet-group-name "$REDIS_SUBNET_GROUP" \
      --security-group-ids "$REDIS_SG" \
      --region "$AWS_REGION" >/dev/null
  fi

  echo "    Waiting for ElastiCache to become available..."
  aws elasticache wait cache-cluster-available \
    --cache-cluster-id "$REDIS_CLUSTER" \
    --region "$AWS_REGION"

  echo "[OK] ElastiCache cluster ready"
fi

# --- Step 3: Update SSM REDIS_URL if endpoint changed ---
echo "[3/6] Updating REDIS_URL in SSM..."

REDIS_ENDPOINT=$(aws elasticache describe-cache-clusters \
  --cache-cluster-id "$REDIS_CLUSTER" \
  --show-cache-node-info \
  --query 'CacheClusters[0].CacheNodes[0].Endpoint.Address' \
  --output text \
  --region "$AWS_REGION")

aws ssm put-parameter \
  --name "/atena/prod/REDIS_URL" \
  --type SecureString \
  --value "redis://${REDIS_ENDPOINT}:6379" \
  --overwrite \
  --region "$AWS_REGION" >/dev/null

echo "[OK] REDIS_URL updated: redis://${REDIS_ENDPOINT}:6379"

# --- Step 4: Run DB migrations ---
echo "[4/6] Running database migrations..."

# Get network config
PRIVATE_SUBNETS=$(aws ec2 describe-subnets \
  --filters "Name=tag:Name,Values=atena-prod-private-*" \
  --query 'Subnets[*].SubnetId' \
  --output text \
  --region "$AWS_REGION" | tr '\t' ',')

ECS_SG=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=atena-prod-ecs-sg" \
  --query 'SecurityGroups[0].GroupId' \
  --output text \
  --region "$AWS_REGION")

TASK_ARN=$(aws ecs run-task \
  --cluster "$CLUSTER" \
  --task-definition atena-prod-api \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$PRIVATE_SUBNETS],securityGroups=[$ECS_SG],assignPublicIp=DISABLED}" \
  --overrides '{
    "containerOverrides": [{
      "name": "api",
      "command": ["node", "packages/database/dist/migrate.js"]
    }]
  }' \
  --query 'tasks[0].taskArn' \
  --output text \
  --region "$AWS_REGION")

echo "    Migration task: $TASK_ARN"
aws ecs wait tasks-stopped --cluster "$CLUSTER" --tasks "$TASK_ARN" --region "$AWS_REGION"

EXIT_CODE=$(aws ecs describe-tasks \
  --cluster "$CLUSTER" \
  --tasks "$TASK_ARN" \
  --query 'tasks[0].containers[0].exitCode' \
  --output text \
  --region "$AWS_REGION")

if [ "$EXIT_CODE" != "0" ]; then
  echo "[ERROR] Migration failed with exit code: $EXIT_CODE"
  exit 1
fi
echo "[OK] Migrations completed"

# --- Step 5: Scale ECS services ---
echo "[5/6] Scaling ECS services to 1..."

aws ecs update-service \
  --cluster "$CLUSTER" \
  --service "$API_SERVICE" \
  --desired-count 1 \
  --region "$AWS_REGION" \
  --no-cli-pager >/dev/null

aws ecs update-service \
  --cluster "$CLUSTER" \
  --service "$WORKERS_SERVICE" \
  --desired-count 1 \
  --region "$AWS_REGION" \
  --no-cli-pager >/dev/null

echo "    Waiting for services to stabilize..."
aws ecs wait services-stable \
  --cluster "$CLUSTER" \
  --services "$API_SERVICE" "$WORKERS_SERVICE" \
  --region "$AWS_REGION"

echo "[OK] ECS services running"

# --- Step 6: Health check ---
echo "[6/6] Running health check..."

ALB_DNS=$(aws elbv2 describe-load-balancers \
  --names "atena-prod-alb" \
  --query 'LoadBalancers[0].DNSName' \
  --output text \
  --region "$AWS_REGION")

for i in $(seq 1 10); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://$ALB_DNS/health" || true)
  if [ "$STATUS" = "200" ]; then
    echo "[OK] Health check passed on attempt $i"
    break
  fi
  echo "    Attempt $i: status=$STATUS, retrying in 10s..."
  sleep 10
done

if [ "$STATUS" != "200" ]; then
  echo "[WARN] Health check did not pass after 10 attempts"
  exit 1
fi

echo ""
echo "==> Environment started!"
echo "    API: http://$ALB_DNS"
echo "    Health: http://$ALB_DNS/health"
