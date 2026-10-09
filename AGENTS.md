<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Compass — instructions for Codex, MiniMax Desktop and Polar Desktop

**Canonical checkout: `C:\dev\compass` (`/mnt/c/dev/compass` under WSL). The OneDrive copy is retired; never develop there.**

Read [COORDINATION.md](COORDINATION.md), [team protocol](docs/team/PROTOCOL.md), [00-VISION.md](00-VISION.md) and [00-DESIGN.md](00-DESIGN.md) before changing the project.

## Shared execution contract

The user requested cleanup/alignment before the functional backlog. Codex coordinates; MiniMax implements by default; Polar independently reviews by default. Roles are assigned per task in `docs/project-state.json`. MiniMax directly accesses this repository; Polar currently reviews remotely. Codex is authorized to message both desktop conversations. Follow the remote proxy review workflow in the team protocol; never describe a proxy command as local execution by Polar.

Run `node scripts/project-sync.mjs status` and `node scripts/project-sync.mjs check`. Only the assigned task owner or its assigned reviewer may claim the active task. Claim before edits, including documentation. One active task, one writer, shared main checkout. Do not create/switch branches or worktrees, choose new features, or override another app's claim. Read-only research may overlap.

Current status lives only in `docs/project-state.json`; `COORDINATION.md` is generated. Use the handoff/review workflow in the team protocol. Historical docs in `docs/archive/` do not authorize tasks or establish current deployment health. Do not copy status into other files. Changes to requirements need a decision revision in state and the relevant spec update in the same review.

## Architecture and quality

- Public multi-user signup and tenant-scoped periods/preferences/mutations are implemented; preserve ownership checks and database-backed throttles.
- Compass: understandable personal financial planning and automation; every feature feeds financial state → policy → decision → execution. Pay period is the organizing unit.
- PostgreSQL everywhere, Prisma 7 with `@prisma/adapter-pg`; schema and db adapter are authoritative. SQLite references are historical. pnpm is the package manager; package.json/lockfile own exact versions.
- Next.js App Router + React + strict TypeScript, Tailwind v4, Base UI, TanStack Query, Zustand, dnd-kit, Recharts, Zod. Read installed Next guides before application code changes.
- Money in integer cents; no floating-point financial calculations. Validate API/action inputs with Zod; no untracked any.
- AI, imports and widgets follow the plugin architecture. Registry/provider consolidation is incomplete and queued; do not pretend empty registries are shipped implementations.
- Server components by default. Server actions for internal mutations; API routes for external integrations. Never put server/database imports in client dependency graphs.
- Prisma imports use `@/generated/prisma/client`, not `@prisma/client`; generated files are not manually edited.
- Audit allocations, rule executions and autonomous actions. L1 planning is distinct from real payments. Simulated provider success never proves settlement.
- Persist user layouts; browser-local layout is current implementation, database views remain queued. Accessibility and plain English are required.
- Inspect and preserve existing changes and assets. Do not reset shared work, delete data, print secrets or stage unrelated paths.

## Required verification and handoff

`pnpm project:sync` regenerates COORDINATION.md while holding a claim. `pnpm project:check` checks consistency/encoding. `pnpm project:test` checks coordination behavior. Install the local pre-commit guard with `pnpm project:install-hooks`; it rejects partially staged maintained snapshots and never stages files automatically. For application changes also run `pnpm tsc`, `pnpm lint`, appropriate runtime checks and `pnpm build` when relevant. Skips must be reported as incomplete.

Record evidence, changed paths, risks, exact base commit and next owner in docs/team using the template. Handoff releases the writer claim to the independent reviewer. No task is done without recorded approval. A new edit invalidates prior approval. Propose a fresh-session handoff at natural breakpoints; all apps resume from shared state.

Do not ask permission for routine authorized work. Clarify missing essentials and obtain authorization for sensitive unapproved actions. Do not begin the functional backlog until ALIGN-01 is accepted.
