# FMS dashboard — FigCraft draft

Open [`fms-dashboard.figcraft`](./fms-dashboard.figcraft) in FigCraft. The file contains
ten desktop screens, three additional states, a visual design-system page, a user-flow
page, and selected prototype navigation links. Rendered screen previews are in
[`previews/`](./previews/); the screen specifications remain in
[`docs/07-dashboard-design.md`](../../docs/07-dashboard-design.md).
The [design system](./design-system-preview.png) and
[user flow](./user-flow-preview.png) are also available as previews.

This is a first-pass draft, not a fully interactive prototype. Navigation links are
created, but most inputs, toggles, action buttons, error states, and confirmations are
illustrative. The visual system uses DejaVu Sans from the container rather than the
specified Inter and JetBrains Mono. Colors are a partial variable collection and are not
yet bound to layers; the component examples are not yet reusable components.
The draft's email login, per-environment stored versions, Active/Pending member statuses,
and claim that new flags start disabled need correction to match the current API; see
the [design status](../../docs/07-dashboard-design.md#8-figcraft-build--status).

## Rebuild

The generator is [`build.mjs`](./build.mjs); it targets the local Docker image
`figcraft-cli:0.18.1`. The test command also requires the repository's npm dependencies.
From the repository root:

```sh
./node_modules/.bin/vitest run design/figcraft/build.test.mjs
node design/figcraft/build.mjs > design/figcraft/build-commands.json
docker run --rm --network none --user "$(id -u):$(id -g)" \
  -v "$PWD/design/figcraft:/work/design" --entrypoint figcraft-cli \
  figcraft-cli:0.18.1 run /work/design/build-commands.json \
  --out /work/design/fms-dashboard.rebuilt.figcraft
```

The rebuilt file is separate so it cannot overwrite edits made in FigCraft. Review it
before replacing the original; regeneration does not preserve manual canvas edits.
The intermediate `build-commands.json` can be removed after the build.

To render all screen frames from the saved document:

```sh
docker run --rm --network none --user "$(id -u):$(id -g)" \
  -v "$PWD/design/figcraft:/work/design" --entrypoint figcraft-cli \
  figcraft-cli:0.18.1 export /work/design/fms-dashboard.figcraft \
  --page '01 · Screens' -o /work/design/previews
```

MCP and a FigCraft-specific skill are not required for this CLI workflow. MCP may be
configured separately for direct agent interaction with a live FigCraft session.
