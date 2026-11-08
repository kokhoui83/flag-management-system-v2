# Figma build — resume kit

Ready-to-run `use_figma` scripts that complete the FMS dashboard design in
["FMS Dashboard — Design"](https://www.figma.com/design/EQJ5mH28fzRW9qzwS8O0Lf).
The screen specs these scripts implement live in
[`docs/07-dashboard-design.md`](../../docs/07-dashboard-design.md).

## What is already on canvas (verified 2026-11-09)

- Pages: `00 · Design System`, `01 · Screens`, `02 · User Flow`
- Variable collections: `FMS Color` (35), `FMS Spacing` (8), `FMS Radius` (5)
- Text styles: `display h1 h2 h3 body body-sm caption caption-strong overline mono mono-sm`

## How to run

Each file is the `code` payload of one Figma MCP `use_figma` call against file key
`EQJ5mH28fzRW9qzwS8O0Lf` (session `694f9928-a08a-4b64-a32f-f1e3149af1bc`).
Run **in order**, sequentially:

| # | Script | Builds |
| --- | --- | --- |
| 1 | `01-icons.js` | 30 icon components × 2 tones (sections on `00`) |
| 2 | `02-atoms.js` | Buttons, badges, env chips, role tags, toggles, inputs, tabs, cards, avatar, empty/diff |
| 3 | `03-shell.js` | `Rail`, `Topbar`, `AppShell` (1440×900) — **returns the AppShell id** |
| 4 | `04-screens-a.js` | Login, Projects, Flags — **set `SHELL_ID`** at the top from step 3's return value |
| 5 | `05-screens-b.js` | Flag editor, Playground — set `SHELL_ID` if used (it is only referenced via `getComp('AppShell')`) |
| 6 | `06-screens-c.js` | API keys, Audit, Members |
| 7 | `07-user-flow.js` | Role-based flow diagram on `02 · User Flow` |

Notes:

- Steps 4–6 resolve `AppShell` by name from the `00 · Design System` page
  (`getComp('AppShell')`), so `SHELL_ID` in `04-screens-a.js` is a documentation hook only.
- Scripts are largely idempotent (they skip or rebuild named components), so a failed step
  can be re-run after fixing the error.
- On any error, obey the MCP response's `safeToRetryWithoutCanvasRead` flag and fix
  the specific property/API mismatch — this Figma revision has been observed to differ
  from stock typings in: `createVariable(name, collection, type)` + `setValueForMode`,
  vector `data` as SVG path strings (`M/L/C/Z` only), and no `lineCap`/`lineJoin` on
  `VECTOR` nodes.

## Why this exists

The canvas build started 2026-11-09 and was blocked by the Figma Starter-plan MCP call
quota (20/month on a View seat) after tokens/text-styles were committed. Resume the build
once the quota resets or the seat is upgraded to Full/Dev (200 calls/day), then take one
screenshot pass over the `01 · Screens` frames to verify.
