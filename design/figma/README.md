# Figma build — resume kit

Ready-to-run `use_figma` scripts that complete the FMS dashboard design in
["FMS Dashboard — Design"](https://www.figma.com/design/EQJ5mH28fzRW9qzwS8O0Lf).
The screen specs these scripts implement live in
[`docs/07-dashboard-design.md`](../../docs/07-dashboard-design.md).

## What is already on canvas (verified 2026-11-09)

- Pages: `00 · Design System`, `01 · Screens`, `02 · User Flow`
- Variable collections: `FMS Color` (pre-reference values — step 0 refreshes them to the
  reference palette), `FMS Spacing` (8), `FMS Radius` (5)
- Text styles: `display h1 h2 h3 body body-sm caption caption-strong overline mono mono-sm`

## How to run

Each file is the `code` payload of one Figma MCP `use_figma` call against file key
`EQJ5mH28fzRW9qzwS8O0Lf`. Run **in order**, sequentially:

| # | Script | Builds |
| --- | --- | --- |
| 0 | `00-tokens.js` | Refresh `FMS Color` values to the reference palette (sampled from the FlagOps reference); add missing role/status/code tokens; drop deprecated dark-rail tokens |
| 1 | `01-icons.js` | 30 icon components × 2 tones (sections on `00`) |
| 2 | `02-atoms.js` | Buttons, badges (+Pending), Pill/ON·OFF, env chips, role tags, toggles, inputs, tabs, cards, avatar, empty/diff |
| 3 | `03-shell.js` | Light `Rail`, `Topbar`, `AppShell` (1440×900) — **returns the AppShell id** |
| 4 | `04-screens-a.js` | Login, Projects (card grid), Flags (env summary cards + inline ON/OFF pills + create-flag drawer) |
| 5 | `05-screens-b.js` | Flag editor, Playground |
| 6 | `06-screens-c.js` | API keys, Audit, Members (Active/Pending statuses) |
| 7 | `07-screens-d.js` | Roles & permissions matrix (correct FR-54/58/59 cells), Project access |
| 8 | `08-user-flow.js` | Role-based flow diagram on `02 · User Flow` |

Notes:

- Steps 4–7 resolve `AppShell` by name from the `00 · Design System` page
  (`getComp('AppShell')`), so `SHELL_ID` in `04-screens-a.js` is a documentation hook only.
- Scripts are largely idempotent (they skip or rebuild named components/sections), so a
  failed step can be re-run after fixing the error.
- On any error, obey the MCP response's `safeToRetryWithoutCanvasRead` flag and fix the
  specific property/API mismatch — this Figma revision has been observed to differ from
  stock typings in: `createVariable(name, collection, type)` + `setValueForMode`,
  vector `data` as SVG path strings (`M/L/C/Z` only), and no `lineCap`/`lineJoin` on
  `VECTOR` nodes.

## Why this exists

The canvas build started 2026-11-09 and was blocked by the Figma Starter-plan MCP call
quota (20/month on a View seat). The screen language was then revised against the
"FlagOps" reference file (read-only; see the visual-reference note in
[`docs/07-dashboard-design.md`](../../docs/07-dashboard-design.md)) — the scripts above
carry that revision (light shell, slate palette, status pills, card grid, drawer, matrix,
project access).

Resume the build once the quota resets or the seat is upgraded to Full/Dev (200 calls/day),
then take one screenshot pass over the `01 · Screens` frames to verify.
