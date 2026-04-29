#!/usr/bin/env bash
# One-time AWS resource bootstrap for ECOKA on ECS Fargate.
# Run this from the project root with your AWS credentials already in
# the environment (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY /
# AWS_SESSION_TOKEN, e.g. from an AWS Academy Learner Lab).
#
# Idempotent: re-running is safe — existing resources are left alone.
#
# Usage:
#   bash scripts/aws-setup.sh
#
# Requires: aws CLI v2, jq.

set -euo pipefail

REGION="us-east-1"
ACCOUNT_ID="449926879297"
CLUSTER="ecoka-cluster"
BACKEND_REPO="ecoka-backend"
FRONTEND_REPO="ecoka-frontend"
BACKEND_SERVICE="ecoka-backend-service"
FRONTEND_SERVICE="ecoka-frontend-service"
DB_SECRET_NAME="ecoka/database-url"
SG_NAME="ecoka-fargate-sg"

# ---------------------------------------------------------------------
# 0. Load DATABASE_URL from .env (gitignored)
# ---------------------------------------------------------------------
if [ ! -f .env ]; then
  echo "ERROR: .env not found. Create one with DATABASE_URL set (see .env.example)." >&2
  exit 1
fi
# shellcheck disable=SC1091
DATABASE_URL="$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2-)"
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL not set in .env." >&2
  exit 1
fi

echo "===> AWS account: $(aws sts get-caller-identity --query Account --output text) (expecting $ACCOUNT_ID)"
echo "===> Region:      $REGION"

# ---------------------------------------------------------------------
# 1. Secrets Manager: store DATABASE_URL
# ---------------------------------------------------------------------
echo "===> [1/6] Secrets Manager: $DB_SECRET_NAME"
if aws secretsmanager describe-secret --secret-id "$DB_SECRET_NAME" --region "$REGION" >/dev/null 2>&1; then
  echo "       updating existing secret value"
  aws secretsmanager put-secret-value \
    --secret-id "$DB_SECRET_NAME" \
    --secret-string "$DATABASE_URL" \
    --region "$REGION" >/dev/null
else
  aws secretsmanager create-secret \
    --name "$DB_SECRET_NAME" \
    --secret-string "$DATABASE_URL" \
    --region "$REGION" >/dev/null
fi

# ---------------------------------------------------------------------
# 2. ECR repositories
# ---------------------------------------------------------------------
echo "===> [2/6] ECR repositories"
for REPO in "$BACKEND_REPO" "$FRONTEND_REPO"; do
  if aws ecr describe-repositories --repository-names "$REPO" --region "$REGION" >/dev/null 2>&1; then
    echo "       $REPO exists"
  else
    aws ecr create-repository --repository-name "$REPO" --region "$REGION" >/dev/null
    echo "       created $REPO"
  fi
done

# ---------------------------------------------------------------------
# 3. ECS cluster
# ---------------------------------------------------------------------
echo "===> [3/6] ECS cluster $CLUSTER"
EXISTING="$(aws ecs describe-clusters --clusters "$CLUSTER" --region "$REGION" \
  --query 'clusters[?status==`ACTIVE`].clusterName' --output text)"
if [ "$EXISTING" = "$CLUSTER" ]; then
  echo "       cluster exists"
else
  aws ecs create-cluster --cluster-name "$CLUSTER" --region "$REGION" >/dev/null
  echo "       created cluster"
fi

# ---------------------------------------------------------------------
# 4. Discover default VPC + subnets + ensure security group
# ---------------------------------------------------------------------
echo "===> [4/6] Networking (default VPC, public subnets, security group)"
VPC_ID="$(aws ec2 describe-vpcs --filters Name=isDefault,Values=true \
  --query 'Vpcs[0].VpcId' --output text --region "$REGION")"
if [ -z "$VPC_ID" ] || [ "$VPC_ID" = "None" ]; then
  echo "ERROR: no default VPC in $REGION. Create one or set SUBNETS/SG manually." >&2
  exit 1
fi
echo "       VPC: $VPC_ID"

SUBNETS="$(aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=$VPC_ID" "Name=map-public-ip-on-launch,Values=true" \
  --query 'Subnets[].SubnetId' --output text --region "$REGION" | tr '\t' ',' )"
if [ -z "$SUBNETS" ]; then
  SUBNETS="$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" \
    --query 'Subnets[].SubnetId' --output text --region "$REGION" | tr '\t' ',')"
fi
echo "       Subnets: $SUBNETS"

SG_ID="$(aws ec2 describe-security-groups \
  --filters "Name=vpc-id,Values=$VPC_ID" "Name=group-name,Values=$SG_NAME" \
  --query 'SecurityGroups[0].GroupId' --output text --region "$REGION" 2>/dev/null || true)"
if [ -z "$SG_ID" ] || [ "$SG_ID" = "None" ]; then
  SG_ID="$(aws ec2 create-security-group \
    --group-name "$SG_NAME" \
    --description "ECOKA Fargate inbound 80/3000" \
    --vpc-id "$VPC_ID" \
    --query 'GroupId' --output text --region "$REGION")"
  aws ec2 authorize-security-group-ingress --group-id "$SG_ID" \
    --protocol tcp --port 80   --cidr 0.0.0.0/0 --region "$REGION" >/dev/null || true
  aws ec2 authorize-security-group-ingress --group-id "$SG_ID" \
    --protocol tcp --port 3000 --cidr 0.0.0.0/0 --region "$REGION" >/dev/null || true
  echo "       created SG: $SG_ID"
else
  echo "       SG: $SG_ID"
fi

# ---------------------------------------------------------------------
# 5. Register initial task definitions
# ---------------------------------------------------------------------
echo "===> [5/6] Register task definitions"
# The task defs ship with image="<IMAGE>"; ECS will reject that on first
# register. Substitute a placeholder Hello image so the service can be
# created. The GitHub Actions workflow will replace the image on every
# deploy thereafter.
PLACEHOLDER="public.ecr.aws/docker/library/busybox:latest"

for KIND in backend frontend; do
  TMP="$(mktemp)"
  jq --arg img "$PLACEHOLDER" '
    .containerDefinitions |= map(
      if .image == "<IMAGE>" then .image = $img else . end
    )
  ' ".aws/task-definition-${KIND}.json" > "$TMP"
  aws ecs register-task-definition --cli-input-json "file://$TMP" --region "$REGION" \
    --query 'taskDefinition.taskDefinitionArn' --output text
  rm -f "$TMP"
done

# ---------------------------------------------------------------------
# 6. Create ECS services (idempotent)
# ---------------------------------------------------------------------
echo "===> [6/6] ECS services"
NETWORK_CFG="awsvpcConfiguration={subnets=[${SUBNETS}],securityGroups=[${SG_ID}],assignPublicIp=ENABLED}"

ensure_service () {
  local NAME="$1" FAMILY="$2"
  local STATUS
  STATUS="$(aws ecs describe-services --cluster "$CLUSTER" --services "$NAME" \
    --region "$REGION" --query 'services[0].status' --output text 2>/dev/null || echo NONE)"
  if [ "$STATUS" = "ACTIVE" ]; then
    echo "       $NAME exists (ACTIVE)"
    return
  fi
  aws ecs create-service \
    --cluster "$CLUSTER" \
    --service-name "$NAME" \
    --task-definition "$FAMILY" \
    --launch-type FARGATE \
    --desired-count 1 \
    --network-configuration "$NETWORK_CFG" \
    --region "$REGION" \
    --query 'service.serviceName' --output text
}

ensure_service "$BACKEND_SERVICE"  "ecoka-backend"
ensure_service "$FRONTEND_SERVICE" "ecoka-frontend"

cat <<EOF

✅ Setup complete.

Next steps:
  1. In your GitHub repo: Settings → Secrets and variables → Actions
     Add three repository secrets:
       AWS_ACCESS_KEY_ID
       AWS_SECRET_ACCESS_KEY
       AWS_SESSION_TOKEN
  2. (Optional) Add repo variable BACKEND_PUBLIC_URL = http://<backend-public-IP>
     Find the IP via:
       aws ecs list-tasks --cluster $CLUSTER --service-name $BACKEND_SERVICE --region $REGION
       aws ecs describe-tasks --cluster $CLUSTER --tasks <task-id> --region $REGION \\
         --query 'tasks[0].attachments[0].details[?name==\`networkInterfaceId\`].value' --output text
       aws ec2 describe-network-interfaces --network-interface-ids <eni-id> --region $REGION \\
         --query 'NetworkInterfaces[0].Association.PublicIp' --output text
  3. Push to main:  git push origin main --force-with-lease
  4. Watch the deploy:  GitHub → Actions → "AWS ECR + ECS Deployment"
EOF
