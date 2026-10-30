# ADR-0006 — Vue 3 + Vite dashboard in a separate workspace

**Status:** Accepted

## Context

The original plan (architecture §2.3) was a vanilla TS/JS SPA with no build step, served from
`server/src/static/`. That choice optimized for "one process to run, zero build tooling."
Re-examining the dashboard scope — FR-41…FR-47 (variant table, ordered rule editor with
reorder, per-env tabs, evaluate playground, API-key view, audit table with before/after diff)
plus FR-52 (live updates via SSE) — that surface is a component framework's home territory.
Hand-rolling it in DOM code trades real implementation effort to save a dev-time build step
only: the runtime is one process either way.

## Decision

Build the dashboard as **Vue 3 + Vite + TypeScript** in a separate `web/` workspace (npm
workspaces: `server/`, `web/`, `shared/`):

- **Naive UI** as the component library (TS-first, Vite-friendly; tables/forms/diff views
  covered with minimal custom CSS).
- **vue-router** in **hash mode** — static hosting stays trivial (no history-fallback route).
- **Pinia** for session + flags state.
- **Dev**: Vite dev server (port 5173) proxying `/api` → `:3000`. **Prod**:
  `vite build` → `web/dist`, served by the API at `/` (path from `WEB_DIST`).
- A `shared/` workspace holds the canonical rule types + all-at-once validation (FR-14),
  imported by both `server/src/domain` and `web/` — the dashboard's pre-submit validation is
  the same code the server runs, not a copy.

## Consequences

- + Component-based dev experience for a substantial SPA; Naive UI covers the audit table,
  diff view, and rule-editor forms.
- + Shared validation code removes server/dashboard validation drift (strictly improves the
  old "duplicate pure logic in a shared place" constraint).
- + Runtime unchanged: one process serves the built assets; the build is a dev/release step
  only.
- − Build step in the dev and release flow; `web/` is a real package to configure
  (trivial with npm workspaces).
- − The bundle is framework-sized (Vue + Naive UI); the old "< 100 KB static" acceptance
  criterion is replaced by a recorded bundle budget (M4 note).
