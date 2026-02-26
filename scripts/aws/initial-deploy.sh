#!/usr/bin/env bash
set -euo pipefail

# Initial deploy — run ONCE after `terraform apply`
# Builds images, pushes to ECR, runs migrations, scales ECS

AWS_REGION="${AWS_REGION:-sa-east-1}"
CLUSTER="atena-prod-cluster"

echo "==> Initial deploy for Atena"
echo "    Region: $AWS_REGION"
echo ""

# --- Step 1: Get ECR URLs ---
echo "[1/6] Getting ECR repository URLs..."

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
API_REPO="${ECR_REGISTRY}/atena-api"
WORKERS_REPO="${ECR_REGISTRY}/atena-workers"

echo "    API repo:     $API_REPO"
echo "    Workers repo: $WORKERS_REPO"

# --- Step 2: Login to ECR ---
echo "[2/6] Logging in to ECR..."

aws ecr get-login-password --region "$AWS_REGION" | \
  docker login --username AWS --password-stdin "$ECR_REGISTRY"

echo "[OK] ECR login successful"

# --- Step 3: Build + push API ---
echo "[3/6] Building and pushing API image..."

docker build \
  --build-arg TARGET_APP=api \
  -t "$API_REPO:latest" \
  -t "$API_REPO:initial" \
  .

docker push "$API_REPO:latest"
docker push "$API_REPO:initial"

echo "[OK] API image pushed"

# --- Step 4: Build + push Workers ---
echo "[4/6] Building and pushing Workers image..."

docker build \
  --build-arg TARGET_APP=workers \
  -t "$WORKERS_REPO:latest" \
  -t "$WORKERS_REPO:initial" \
  .

docker push "$WORKERS_REPO:latest"
docker push "$WORKERS_REPO:initial"

echo "[OK] Workers image pushed"

# --- Step 5: Run migrations ---
echo "[5/6] Running database migrations..."

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

# --- Step 6: Scale ECS ---
echo "[6/6] Scaling ECS services to 1..."

aws ecs update-service \
  --cluster "$CLUSTER" \
  --service atena-prod-api \
  --desired-count 1 \
  --region "$AWS_REGION" \
  --no-cli-pager >/dev/null

aws ecs update-service \
  --cluster "$CLUSTER" \
  --service atena-prod-workers \
  --desired-count 1 \
  --region "$AWS_REGION" \
  --no-cli-pager >/dev/null

echo "    Waiting for services to stabilize..."
aws ecs wait services-stable \
  --cluster "$CLUSTER" \
  --services atena-prod-api atena-prod-workers \
  --region "$AWS_REGION"

# Health check
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --names "atena-prod-alb" \
  --query 'LoadBalancers[0].DNSName' \
  --output text \
  --region "$AWS_REGION")

echo ""
echo "==> Initial deploy complete!"
echo "    API: http://$ALB_DNS"
echo "    Health: http://$ALB_DNS/health"
echo ""
echo "Next steps:"
echo "  1. Update SSM secrets: CLAUDE_API_KEY, ADMIN_TOKEN, TELEGRAM_BOT_TOKEN"
echo "     aws ssm put-parameter --name /atena/prod/CLAUDE_API_KEY --type SecureString --value 'your-key' --overwrite"
echo "  2. Force new deployment to pick up secrets:"
echo "     aws ecs update-service --cluster $CLUSTER --service atena-prod-api --force-new-deployment"
