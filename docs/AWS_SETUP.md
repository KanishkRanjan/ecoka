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

These are the **only** GitHub secrets required. `DATABASE_URL` is read
from AWS Secrets Manager at task-runtime (see step 2). Redis is not
deployed — the backend cache module degrades gracefully when Redis is
unreachable, so no `REDIS_URL` is needed.

Optional repository **variable** (Settings → Variables → Actions):

| Variable name         | Value                                              |
| --------------------- | -------------------------------------------------- |
| `BACKEND_PUBLIC_URL`  | the backend's public URL (e.g. `http://<task-public-ip>:3000`). Leave blank if you front both services with an ALB. |

## 2. One-time AWS bootstrap

Run the script:

```bash
bash scripts/aws-setup.sh
```

It is idempotent — safe to re-run — and does the following:

1. Stores your `DATABASE_URL` (read from `.env`) in AWS Secrets Manager
   as `ecoka/database-url`. The backend task definition references it
   by ARN.
2. Creates ECR repos `ecoka-backend` and `ecoka-frontend`.
3. Creates the ECS cluster `ecoka-cluster`.
4. Discovers your default VPC's public subnets and creates a security
   group `ecoka-fargate-sg` allowing inbound 80 and 3000.
5. Registers the initial task definitions (with a placeholder image so
   ECS accepts them — the workflow replaces the image on every deploy).
6. Creates the ECS services `ecoka-backend-service` and
   `ecoka-frontend-service`, each with `assignPublicIp=ENABLED`.

CloudWatch log groups `/ecs/ecoka-backend` and `/ecs/ecoka-frontend`
are auto-created on first task run via `awslogs-create-group: true`.

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
