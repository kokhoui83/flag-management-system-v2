# FMS dashboard — FigCraft draft

Open [`fms-dashboard.figcraft`](./fms-dashboard.figcraft) in FigCraft. The file contains
ten desktop screens, ten state frames (loading, empty, error, confirmations, validation,
one-time secrets, product-owner editor, create flag), five mobile frames, a visual
design-system page, a user-flow page, and selected prototype navigation links. Rendered previews
are in [`previews/`](./previews/); the screen specifications remain in
[`docs/07-dashboard-design.md`](../../docs/07-dashboard-design.md).
The [design system](./design-system-preview.png) and
[user flow](./user-flow-preview.png) are also available as previews. Screens of the
implemented dashboard, for comparison, are in [`../implemented/`](../implemented/).

This is a static visual reference, not an interactive prototype. Navigation links are
created, but inputs, toggles and action buttons are illustrative. The visual system uses
DejaVu Sans from the container rather than the specified Inter and JetBrains Mono. Colors are a
partial variable collection and are not yet bound to layers; the component examples are not yet
reusable components. The draft shows only data the API provides: username login, one stored
version per flag, "Not configured" environments, and members without sign-in status.

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
