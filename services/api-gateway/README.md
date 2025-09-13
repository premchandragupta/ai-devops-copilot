# api-gateway (NestJS + Prisma + PostgreSQL)

Exposes:
- `GET /health`
- `GET /projects`
- `POST /projects` { name }
- `GET /pipelines`
- `POST /pipelines` { name, projectId, repoUrl? }

## Prereqs
- Windows 11, Node 22, pnpm 9
- Docker Desktop running
- Postgres running from repo compose (`infra/docker/compose.yml`) with db `adc`

## Environment
Create **repo root** `.env` (one level above `services/api-gateway`), with:
```
POSTGRES_URL=postgres://postgres:postgres@localhost:5432/adc
```

## Install & Run (dev)
```powershell
cd C:\Projects\ai-devops-copilot\services\api-gateway
pnpm install
pnpm prisma:generate
npx prisma migrate dev --name init
pnpm dev
```
Open: http://localhost:3001/health

### Create data (examples)
```powershell
# create a project
curl -X POST http://localhost:3001/projects -H "Content-Type: application/json" -d "{\"name\":\"My First Project\"}"

# list projects
curl http://localhost:3001/projects

# create a pipeline (use a real projectId from list above)
curl -X POST http://localhost:3001/pipelines -H "Content-Type: application/json" -d "{\"name\":\"Web CI\", \"projectId\":\"<PROJECT_ID>\"}"
```

## Lint / Typecheck / Test
```powershell
pnpm lint
pnpm typecheck
pnpm test
```

## Build & Start (prod)
```powershell
pnpm build
node dist/main.js
```

## Docker (later)
Build inside monorepo (root must contain .env with POSTGRES_URL):
```powershell
docker build -t api-gateway .
docker run --rm -p 3001:3001 --env-file ..\..\.env api-gateway
```
