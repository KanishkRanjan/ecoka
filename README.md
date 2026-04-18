# ECOKA

The intelligent tech discovery platform — built from `idea.md`.

ECOKA is an e-commerce MVP that combines spec-first search, an ecosystem
compatibility engine, and an **Eco-Score** that rates every product on
repairability, energy efficiency, and carbon footprint.

## Quickstart

```bash
cp .env.example .env
# Paste your Neon (or any Postgres) connection string into DATABASE_URL.

docker compose up --build
```

| URL                                | What it serves                |
| ---------------------------------- | ----------------------------- |
| http://localhost:5173              | React/Vite frontend (nginx)   |
| http://localhost:3000/health       | Backend health endpoint       |
| http://localhost:3000/api/products | Product list                  |

The backend's first boot pushes the Prisma schema to your database and
seeds ~20 realistic products (laptops, monitors, GPUs, phones, etc.).

## Architecture

```
┌──────────────┐    ┌────────────────┐    ┌─────────────┐
│ Frontend     │───▶│ Backend (Node) │───▶│ Postgres    │
│ React+Vite   │    │ Express+Prisma │    │ (Neon)      │
│ + Tailwind   │    └────────────────┘    └─────────────┘
└──────────────┘            │
                            ▼
                    ┌─────────────┐
                    │ Redis cache │
                    └─────────────┘
```

### Key endpoints

| Endpoint                          | Description                             |
| --------------------------------- | --------------------------------------- |
| `GET /api/products?q=&category=`  | Spec-first search with filters          |
| `GET /api/products/:slug`         | Product detail                          |
| `GET /api/recommend/:slug`        | Similar-spec + eco-friendly alternatives|
| `GET /api/compat?stack=&item=`    | Compatibility check with reasons        |
| `POST /api/advisor`               | NL advisor (rule-based, LLM-swappable)  |
| `GET/POST /api/cart/:sid/...`     | Anonymous Redis-backed cart             |

### Eco-Score

Computed per product in `backend/src/ecoScore.ts`:
- **40%** repairability (0–10)
- **30%** energy efficiency (0–10)
- **30%** carbon footprint (lower = better; reference cap 500 kg CO2e)

Final score is rounded to 0–100. The frontend displays it as a tier
badge (Excellent / Good / Fair / Low).

### Compatibility engine

`backend/src/routes/compat.ts` evaluates rules between any two products
(e.g. "TB4 monitor needs a TB4 host port"). Rules are pure functions over
the `specs` JSON, so adding a new rule is one entry in the array.

### Recommendations

`backend/src/recommend.ts` builds an 8-feature numeric vector per product
and ranks candidates within the same category by cosine similarity.
The `ecoBias` parameter shifts the ranking toward higher Eco-Scores for
"eco-friendly alternative" suggestions.

## Development

```bash
# Backend (in another terminal)
cd backend
npm install
npx prisma generate
npx prisma db push          # syncs schema to your DATABASE_URL
npm run prisma:seed
npm run dev                 # http://localhost:3000

# Frontend
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

### Tests

```bash
cd backend && npm test      # vitest: ecoScore + recommend
```

## CI

`.github/workflows/ci.yml` runs on every push and PR:
- **backend**: install → `prisma generate` → lint → typecheck → test
- **frontend**: install → lint → build
- **docker** (main only): build both images via Buildx

No registry credentials are configured; CI verifies the Dockerfiles
build but does not push images. Add a `docker/login-action` step and
push to GHCR if/when desired.

## Deferred from `idea.md`

These pieces from the original spec are intentionally out of scope for
the MVP and tracked for future iteration:

- **Elasticsearch** — replaced by Postgres `ILIKE`/`contains` for now.
- **AI Tech Advisor (LLM)** — `/api/advisor` is rule-based; the swap-in
  point for an LLM call is marked in `routes/advisor.ts`.
- **Predictive price-drop alerts** — see `ml/README.md`.
- **Verified benchmarks ingestion** — `benchmarks` JSON is on the model
  but is currently seeded statically.
- **Auth, payments, real checkout** — cart is anonymous and persists in
  Redis only.
- **Cloud deploy (AWS/GCP)** — only docker-compose is provided.

## Project layout

```
ecoka/
├── backend/        # Node + Express + Prisma + Redis
├── frontend/       # React + Vite + Tailwind
├── ml/             # placeholder for future ML services
├── docker-compose.yml
├── .github/workflows/ci.yml
├── .env.example
└── idea.md         # the original product spec
```
