#!/usr/bin/env bash
set -euo pipefail

# Bootstrap Terraform backend (S3 + DynamoDB)
# Run this ONCE before the first `terraform init`

AWS_REGION="${AWS_REGION:-sa-east-1}"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
BUCKET_NAME="atena-terraform-state-${ACCOUNT_ID}"
TABLE_NAME="atena-terraform-lock"

echo "==> Bootstrapping Terraform backend"
echo "    Region:   $AWS_REGION"
echo "    Account:  $ACCOUNT_ID"
echo "    Bucket:   $BUCKET_NAME"
echo "    Table:    $TABLE_NAME"
echo ""

# --- S3 Bucket ---
if aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
  echo "[OK] S3 bucket already exists: $BUCKET_NAME"
else
  echo "[+] Creating S3 bucket: $BUCKET_NAME"
  aws s3api create-bucket \
    --bucket "$BUCKET_NAME" \
    --region "$AWS_REGION" \
    --create-bucket-configuration LocationConstraint="$AWS_REGION"

  aws s3api put-bucket-versioning \
    --bucket "$BUCKET_NAME" \
    --versioning-configuration Status=Enabled

  aws s3api put-bucket-encryption \
    --bucket "$BUCKET_NAME" \
    --server-side-encryption-configuration '{
      "Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]
    }'

  aws s3api put-public-access-block \
    --bucket "$BUCKET_NAME" \
    --public-access-block-configuration \
      BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

  echo "[OK] S3 bucket created"
fi

# --- DynamoDB Table ---
if aws dynamodb describe-table --table-name "$TABLE_NAME" --region "$AWS_REGION" >/dev/null 2>&1; then
  echo "[OK] DynamoDB table already exists: $TABLE_NAME"
else
  echo "[+] Creating DynamoDB table: $TABLE_NAME"
  aws dynamodb create-table \
    --table-name "$TABLE_NAME" \
    --attribute-definitions AttributeName=LockID,AttributeType=S \
    --key-schema AttributeName=LockID,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region "$AWS_REGION"

  aws dynamodb wait table-exists \
    --table-name "$TABLE_NAME" \
    --region "$AWS_REGION"

  echo "[OK] DynamoDB table created"
fi

echo ""
echo "==> Bootstrap complete!"
echo ""
echo "Next steps:"
echo "  1. Update infra/backend.tf bucket name to: $BUCKET_NAME"
echo "  2. Run: cd infra && terraform init"
echo "  3. Run: terraform plan"
echo "  4. Run: terraform apply"
