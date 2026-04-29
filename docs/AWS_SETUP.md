# AWS deployment setup

The `aws-deployment.yml` workflow pushes images to ECR and rolls them
out to ECS Fargate. Before the first run, the AWS resources below must
exist; after that, every push to `main` redeploys.

## 1. GitHub repository secrets

Settings → Secrets and variables → Actions → **New repository secret**:

| Secret name              | Value                                              |
| ------------------------ | -------------------------------------------------- |
| `AWS_ACCESS_KEY_ID`      | from your AWS Learner Lab `~/.aws/credentials`     |
| `AWS_SECRET_ACCESS_KEY`  | from `~/.aws/credentials`                          |
| `AWS_SESSION_TOKEN`      | from `~/.aws/credentials` (refresh each lab session) |
| `DATABASE_URL`           | your Neon Postgres connection string               |
| `REDIS_URL`              | e.g. `redis://<elasticache-endpoint>:6379` — or omit if not running Redis |

And one **repository variable** (Settings → Variables → Actions):

| Variable name         | Value                                              |
| --------------------- | -------------------------------------------------- |
| `BACKEND_PUBLIC_URL`  | the backend's public URL (ALB DNS or service IP). Leave blank if frontend nginx is the only public entrypoint and routes `/api` to backend. |

## 2. AWS resources to create once

These are one-time clicks; the workflow doesn't create them.

### ECR repositories

```bash
aws ecr create-repository --repository-name ecoka-backend  --region us-east-1
aws ecr create-repository --repository-name ecoka-frontend --region us-east-1
```

### CloudWatch log groups

The task definitions set `awslogs-create-group: true`, so the first
deployment auto-creates `/ecs/ecoka-backend` and `/ecs/ecoka-frontend`.

### ECS cluster (Fargate)

```bash
aws ecs create-cluster --cluster-name ecoka-cluster --region us-east-1
```

### ECS services

Both services need a VPC, public subnets, and a security group that
allows inbound on the container port. In Learner Lab, use the default
VPC and create one SG that allows 0.0.0.0/0 on TCP 80 + 3000.

You'll have to register the **initial** task definition once before the
first GitHub-driven deploy (the workflow can update services but cannot
create them):

```bash
aws ecs register-task-definition --cli-input-json file://.aws/task-definition-backend.json
aws ecs register-task-definition --cli-input-json file://.aws/task-definition-frontend.json

aws ecs create-service \
  --cluster ecoka-cluster \
  --service-name ecoka-backend-service \
  --task-definition ecoka-backend \
  --launch-type FARGATE \
  --desired-count 1 \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxx],securityGroups=[sg-xxxx],assignPublicIp=ENABLED}"

aws ecs create-service \
  --cluster ecoka-cluster \
  --service-name ecoka-frontend-service \
  --task-definition ecoka-frontend \
  --launch-type FARGATE \
  --desired-count 1 \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxx],securityGroups=[sg-xxxx],assignPublicIp=ENABLED}"
```

(Replace `subnet-xxxx` and `sg-xxxx` with values from your VPC.)

## 3. Networking choices

The frontend container is an nginx serving the SPA + reverse-proxying
`/api` to `http://backend:3000`. That hostname only resolves under
docker-compose. On ECS you have three options:

- **Single ALB, two target groups** — frontend on `/`, backend on `/api/*`.
  Simplest for a demo: bake `VITE_API_BASE=""` (same-origin) and let the
  ALB route. You don't have to change `nginx.conf` if both services
  share the ALB hostname.
- **Two services with public IPs** — set `BACKEND_PUBLIC_URL` to the
  backend task's public DNS so the frontend SPA calls it cross-origin.
  Simplest if you don't want to set up an ALB.
- **ECS Service Connect / Cloud Map** — backend reachable as
  `backend.local`. Update `frontend/nginx.conf` `proxy_pass` accordingly.

## 4. Trigger a deploy

```bash
git push origin main             # auto-deploy on main
# or run from GitHub UI: Actions → "AWS ECR + ECS Deployment" → Run workflow
```

The workflow:
1. Builds both images, pushes to ECR with tags `<commit-sha>` and `latest`
2. Renders the task definition JSON (substituting image + secrets)
3. Updates the ECS service and waits for steady state

## 5. Local dev still works

`docker compose up --build` is unaffected — it doesn't read this
workflow or the task definitions.

## 6. Costs / cleanup

Fargate accrues per-second cost while services run. To stop:

```bash
aws ecs update-service --cluster ecoka-cluster --service ecoka-backend-service  --desired-count 0
aws ecs update-service --cluster ecoka-cluster --service ecoka-frontend-service --desired-count 0
```
