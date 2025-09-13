# AI DevOps Co-Pilot — Web Shell

Modern, clean UI using **Next.js 15 + TypeScript + Tailwind + shadcn-style components**.
Pages: `/dashboard`, `/pipelines`, `/policies`.

## Quick Start (Windows + pnpm)

1. Install **Node 22+** and **pnpm 9+**:
   ```powershell
   corepack enable
   corepack prepare pnpm@9 --activate
   ```

2. From the repo root, move this folder to `C:\Projects\ai-devops-copilot\web` (or clone there).

3. Install and run:
   ```powershell
   cd web
   pnpm install
   pnpm dev
   ```
   Open http://localhost:3000

### Lint & Typecheck
```powershell
pnpm lint
pnpm typecheck
```

### End-to-End test (Playwright)
```powershell
pnpm exec playwright install
pnpm test:e2e
```

## What’s inside
- Responsive **sidebar + topbar** layout
- **Dashboard** with sample cards
- **Pipelines** with a placeholder DataTable
- **Policies** page with a form skeleton (no backend yet)
- ESLint + Prettier + Tailwind + Playwright set up

## Notes
- No external APIs required; everything renders statically.
- Keep adding pages using the same component style from `/components/ui`.
