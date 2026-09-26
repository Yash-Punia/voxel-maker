# CLAUDE.md

@~/.claude/rules/base.md

@~/.claude/rules/frontend.md

@~/.claude/rules/typescript.md

@~/.claude/rules/state.md

@~/.claude/rules/three-js.md

## Project overview

VoxBrush. React 19, TypeScript 5.9, Vite 8, Tailwind v4, Zustand plus Immer, Three.js plus R3F, pnpm.

## Commands

```bash
pnpm dev
pnpm lint     # must pass before commit, zero-warnings target
pnpm test     # vitest, must pass
pnpm build    # TS strict + Vite build, must pass
pnpm preview
```

Minor IDE warnings during active edits are tolerated. `pnpm lint`, `pnpm test` and `pnpm build` all passing is the gate.

## Stack declaration

| Parameter | This project |
|---|---|
| Package manager | `pnpm` |
| Icon library | `lucide-react` |
| Color system | Ember on true black. Semantic tokens from `@theme` in `src/styles/index.css`: `bg-stage`, `bg-bg-panel`, `bg-bg-secondary`, `bg-bg-elevated`, `text-text-primary`, `text-text-muted`, `border-border`, `border-border-strong`, `accent` (`#ff5c38`). Raw `bg-slate-800` and friends bypass the design system. |
| Canvas colors | `src/core/theme.ts`. The 2D canvases cannot read Tailwind tokens, so every colour painted into a canvas is declared there and mirrored in the `@theme` block. Change both together. |
| Type scale | Tailwind defaults |
| Default radius | Tailwind defaults, `--radius: 10px` |
| Focus pattern | `focus:outline-hidden`, the v4 idiom. Do not chain `focus:outline-none focus:ring-*`. |
| Body font | sans |
| Class helper | `cn()` |
| Build gate | `pnpm lint && pnpm test && pnpm build` |
| AI providers | Anthropic through `@anthropic-ai/sdk`, plus any OpenAI-compatible base URL through `fetch`. The person supplies their own key and it is kept in their browser. |

## Brand assets

The mark is an isometric voxel whose top face is a painted 2x2 board: the flat art on top, the depth it extrudes into below. Ember tones, so it belongs to the same palette as the UI.

- `public/logo.svg` is the mark alone, `public/favicon.svg` is the same mark on a dark rounded plate, and `src/components/ui/logo.tsx` is the inline copy the app renders. **All three hold the same paths. Change one and change the other two.**
- `public/apple-touch-icon.png`, `icon-192.png`, `icon-512.png` and `og-image.png` are rendered from those SVGs and checked in. Re-render them whenever the mark changes.
- The mark opens the project menu in the top bar and heads the welcome step of the tour. It is decorative in both places, so the `<svg>` is `aria-hidden` and the button carries the name.

## Tailwind v4 specifics

- **No config file.** Theme tokens live in `src/styles/index.css` under `@theme { ... }`. To add a token, edit that file.
- **Reusable styles go in `@layer components`** in the same file: `.rail`, `.icon-btn`, `.btn`, `.btn-primary`, `.btn-ghost`, `.btn-lg`, `.btn-dense`, `.field`, `.surface`, `.seg`, `.seg-item`, `.swatch`, `.chip`, `.mode-tab`, `.stage-glow`, `.label-section`, `.label-title`. Do not re-create them inline.
- **Never build a class name by string concatenation.** Tailwind's scanner misses candidates written as `` `swatch size-6${x ? ' active' : ''}` `` and the utility is silently never generated, which ships a 2px element. Always `cn('swatch size-6', x && 'active')`.
- Arbitrary values are allowed only when no token fits, for example tight letter-spacing or a specific percentage width. Justify non-obvious ones with a comment.

## Workspace shell

The app is one stage with four modes, not a set of side-by-side panels. `mode` lives in `tool-slice` and drives everything. Five tabs is the limit: a sixth needs the bar rethought rather than another tab.

- `src/components/workspace/workspace.tsx` renders the stage for the current mode and the rails that belong to it.
- `src/components/layout/top-bar.tsx` floats over the stage: project menu and history on the left, the current mode's cluster in the middle, help on the right. Each mode contributes one cluster component (`tool-cluster`, `depth-cluster`, `model-cluster`).
- `src/components/layout/mode-bar.tsx` is the only navigation: project status, the four mode tabs, and the view controls.
- Rails float over the stage edges (`shape-rail`, `palette-rail`, `depth-rail`). A rail is a `.rail` container, never a docked panel.
- **The 3D preview is mounted once for the session.** It fills the stage in model mode and drops to a corner card everywhere else. Keep it at the same position in the JSX tree so switching modes never rebuilds the scene, and never mount a second `<Canvas>`.

## Local conventions

- **One tooltip system.** Radix, through `IconButton` or a `Tooltip` wrapper. The native `title` attribute is not used anywhere: it has its own delay, its own look, and it cannot hold a key chip.
- **Icon-only controls use `IconButton`,** which pairs the button with a tooltip and an `aria-label`. A bare `.icon-btn` needs both written by hand.
- **A control whose outcome is not obvious from its label gets a tooltip too.** `Segmented` options take a `title` for this, so choices like Luma against Slot, or an export format, explain themselves on hover instead of only after being picked. Controls that already say what they do in words do not get one.
- **Commands that several surfaces can fire go through `src/core/app-events.ts`,** never through a ref or a prop chain. `useAppEvent` subscribes. Add the name to `APP_EVENTS` first.
- **Unsaved work is written to IndexedDB on a two second debounce** by `use-draft-autosave.ts`, and cleared the moment the project is saved. A draft existing therefore means exactly one thing: the tab died with unsaved work in it. `beforeunload` only covers a deliberate close and does nothing for a crash, a force quit or a reboot. Restoring is never automatic, because silently replacing the board would be its own data loss. Every IndexedDB call is wrapped, since private browsing and blocked site data both make it throw, and losing the safety net must never take the app with it.
- **The autosave subscriber compares document references, not the whole store.** Immer returns a new reference for anything it touched, so identity separates a real edit from a cursor move. Subscribing to everything means the pointer moving over the board resets the debounce forever and nothing is ever written.
- **Every dialog lives in `dialog-host.tsx`** at the page root and opens from an app event. The exception is `app-menu.tsx`, which owns its own unsaved-work confirm because it also owns the file inputs that confirm gates.
- **Dialogs are built from `@/components/ui/dialog`,** which already pins the header and the footer and closes on Esc and backdrop. Do not hand-roll a modal div.
- **Destructive actions open `ConfirmDialog`.** `window.confirm` is not used anywhere.
- **Failures toast, they never `alert`.** `toast.error` and `toast.warning` in `src/core/toast.ts` emit the `toast` app event, and the one `Toaster` at the page root renders it. The emitter is pure, so `src/exporters/` and `src/core/` can report a problem without importing React. `error` means the action did not happen, `warning` means it happened with a degraded result. There are no success toasts: an export downloads a file, which is its own feedback. Native `alert`, `confirm` and `prompt` are not used anywhere.
- **Every keyboard shortcut is drawn by `@/components/ui/kbd`.** `Kbd` splits a chord on `+` into one chip per key, `KbdRange` shows a run like 1 through 9. Pass `tone="inverted"` inside a tooltip, whose surface is theme-constant bone. Never hand-roll a `<kbd>`.
- **A tooltip must not open on programmatic focus.** `TooltipTrigger` marks the focus event handled, because Radix opens a tooltip on any focus, including the focus a dialog or popover moves when it opens. That tooltip becomes the top dismissable layer and swallows the first Escape, so the overlay behind it needs two presses. Hover tooltips are unaffected.
- **Keyboard focus is themed, never the browser default.** A real `outline` in the accent colour, declared once in the stylesheet for every control class. Never remove a focus style without replacing it.
- **Keys whose legend is a symbol render as a lucide icon** (arrows, Shift, Enter) with the key name in an `sr-only` span. Keys whose legend is a word stay a word, because an Option glyph means nothing on Windows.
- **Press feedback:** the shared classes (`.btn`, `.icon-btn`, `.chip`, `.swatch`, `.seg-item`, `.mode-tab`) already include `active:scale-[0.98]` plus a transition. A one-off button appends them inline. Native form controls (`input[type=checkbox|radio|color|range]`, `select`) and their wrapping labels are exempt, since they have built-in press states and scaling their labels feels noisy.
- **Number keys follow the mode.** Draw picks a shape, depth sets the brush depth. Anything mode-specific belongs inside the mode branch of `use-keyboard-shortcuts.ts`. `H` follows the mode the same way: it fits the board on a board stage and frames the model in model mode. Comma and full stop step frames, with Shift they step assets, and `P` plays.
- **Scroll the one container that owns the list, never `scrollIntoView`.** It walks up and scrolls every scrollable ancestor, so it shifts the page as well as the thing you meant. The transcript's scroller is marked `data-chat-scroller` and found with `closest`, so the DOM can move without breaking it.

## Assistant

The assistant is an agent loop that runs in the browser and edits the board through tools. `src/ai/` holds the whole feature and imports no React.

- **`providers/` is the only place a provider SDK appears.** `anthropic.ts` uses the official SDK, `openai-compatible.ts` is raw fetch, and both satisfy the `ChatProvider` interface in `types.ts`. Nothing outside that folder knows which one is running. Adding a provider means a new file there plus a row in `providers/index.ts`.
- **One transcript.** `chatTurns` is both what the UI renders and what gets replayed to the provider, so the two can never drift. An assistant turn keeps the provider's own content blocks in `raw` and replays them verbatim, which is what keeps reasoning blocks intact across tool calls.
- **Tools are the enforcement boundary.** Every tool runs through the same store actions the UI uses, so the undo stack, the dirty flag and the 3D rebuild behave as if a person had done it. A tool validates and clamps every field it is handed. Never trust a coordinate, a colour or an id from the model.
- **The agent's turn snapshot holds the scenes too,** because it can arrange as well as draw. Without them Ctrl+Z reverts the drawing and leaves the arrangement.
- **The agent takes exactly one undo snapshot per turn,** before its first mutating tool, so Ctrl+Z reverts the whole turn. The transcript offers a revert button while that snapshot is still the newest thing on the stack.
- **The house style is measured, not described.** `src/core/style-profile.ts` derives which palette colours, shapes, depth range, board size and fill density the project already uses, and the system prompt carries it on every request. `get_style` returns the same profile as a tool. It returns null under 24 painted cells, because one barely-started board is noise and an invented profile is worse than none. This is the answer to the one complaint asset packs cannot fix: matching has to mean matching something measurable, not a word like "cosy" in a prompt.
- **Discovery then detail, for every kind of record.** `list_assets` with `switch_asset`, `list_scenes` with `switch_scene`, `get_scene` for the open one. Scenes shipped with only the detail half, so the model could make an arrangement and never find its way back to it while the person could see every one in the rail.
- **Adding anything a user can read means widening a read tool in the same change.** `get_project` covers state, `read_board` covers the artwork. If the UI can show it and no tool returns it, the assistant is blind to it.
- **Batch writes.** `applyCellEdits` and `applyDepthEdits` in `board-io.ts` write once for a whole batch. Painting cell by cell through `setCell` rebuilds the mesh per cell.
- **`MAX_STEPS` in `agent.ts` caps the loop.** It is spending someone's money.
- **A turn may create at most `MAX_NEW_ASSETS_PER_TURN` assets, which is 16,** because a 4-bit auto-tile set is sixteen variants by definition and a cap that cannot finish one is a cap in the wrong place. One prompt can fan out into a whole set, and every asset is more steps and more spend. The cap lives in `tools.ts` and `agent.ts` calls `resetTurnLimits()` at the start of every turn. It is enforced in the tool and not the prompt, because a prompt is a request and a tool is a boundary.
- **A set is made one asset at a time.** `create_asset` for a new prop, `duplicate_asset` then edit for a variant. Duplicating keeps the family's silhouette, and the prompt says so, because redrawing from nothing gives unrelated objects that happen to share a palette.
- **Two dialects share the OpenAI chat shape, and the stream parser reads both.** OpenAI splits one tool call into fragments across chunks keyed by `index`, with the id only on the first. Google sends each tool call complete in its own chunk, with a fresh id and no `index` at all. The accumulator keys on the id when there is one and on the index otherwise. Keying on `index` alone concatenates separate calls into one unparseable string.
- **A provider's error body never reaches the user.** `provider-error.ts` turns any status and any body shape into one sentence, the provider's own words as an optional detail, and an action the panel renders as a button (open settings, or try again). Adding a provider means mapping its failures there, not printing its JSON.

## Store specifics

- **Every grid-mutation action sets `state.isDirty = true`.** The exceptions are `clearDirty` and `clearGrid`, which sets it false because a fresh canvas is clean.
- **Clicking a placement selects it, it never deletes it.** Removing is an explicit action in the inspector, so a mis-click on a crowded ground plan cannot throw away work. Placing on an empty cell still happens on one click, because that costs nothing to undo.
- **Deleting an asset removes its placements from every scene.** A scene stores asset ids and nothing else, so a placement of a deleted asset is a hole that renders as nothing and reads as a bug. The confirm counts them first, because a confirm has to name the whole consequence and not just the obvious half.
- **`scene-slice`** holds arrangements. A scene places assets on a ground grid and stores references, never artwork, so editing an asset updates every scene using it and a scene costs almost nothing however many props it places. A project starts with no scene, because most are a set of props that never arrange anything.
- **`src/core/scene-assembly.ts` is the only place board space meets scene space.** A board mesh already comes out X across, Y up and Z deep, centred, so placing one is a quarter turn about Y and a translation with no axis swapping. Assets stand upright: a prop drawn front-on stands on the ground looking like itself. The lift of half the board height is what puts its feet on the floor rather than through it.
- **Scenes are always meshed with the optimiser on, and it is not a setting.** Measured on 100 assets of 32x32: 1,228,800 triangles and 84 MB against 1,200 triangles and 0.1 MB. An unoptimised scene is not slow, it is unusable.
- **`asset-slice`** holds the set: every asset, and which one is active. The asset being edited stays flat in `grid-slice`, so no canvas, tool, hook or assistant tool knows about sets. `switchAsset` writes the live maps back into their asset and loads the next.
- **A `Snapshot` carries the asset it belongs to, and undo returns there before applying it.** Without that a stack spanning assets paints the wrong board, and switching would have to throw the history away. Deleting an asset drops its snapshots, since they can never be replayed. The agent's one snapshot per turn also pins the asset list, so Ctrl+Z takes back a turn that created assets and not just its painting. That delete ends the redo line, because the boards are gone.
- **One palette and one depth scale for the whole project.** A per-asset palette is refused, not missing. Shared colour is what makes a set look like it belongs together.
- **Adding a field to the document is a checklist, not one line.** Scenes were added and three of these were missed, so a crash lost every arrangement and a new project kept scenes pointing at deleted assets. Every new piece of document state goes in all five:
  1. The type in `src/types.ts` and the slice that owns it.
  2. `VxsFile` plus the save and load in `use-vxs-io.ts`, and a reader in `vxs-format.ts` if old files need normalising.
  3. `Draft` in `draft-storage.ts`, the write in `use-draft-autosave.ts`, **and its `documentState()` list**, or an edit to it never even triggers a save.
  4. The restore in `recover-draft-dialog.tsx`.
  5. `resetAssets`, so a new project does not keep it.
- **Save format v3.0 holds `assets[]`, each with a `frames[]`.** A frame is a whole board: colours, depths, shapes and rotations. Frames are discrete, the way sprite animation works, never interpolated. Every old version is normalised in `src/core/vxs-format.ts` and nowhere else, so callers only ever see v3.0 shapes.
- **Changing frame is the same move as changing asset:** commit the live maps into the current frame, then apply the next. Everything outside the store still sees one flat board.
- **Playback and onion skin are view state, in `tool-slice`.** Ticking a frame must never dirty the project or enter the undo stack, so the 3D preview reads the frame being played straight out of the asset and leaves the live board alone. Commit before playing, or the frame being edited plays back stale.
- **`tool-slice`** holds UI and ephemeral state: the active mode, tool, zoom, cursor, mirror mode, depth tint, and the 3D view toggles. **`grid-slice`** holds persistent document state: colorMap, depthMap, palette. **`chat-slice`** holds the assistant transcript and the provider settings, and is the only slice that writes to localStorage.
- Push an undo snapshot before `clearGrid`, depth regeneration, image import, sample load, and resize.
- **Every scene mutation records one too, after its guards and not before.** A placement is as undoable as a brush stroke, and a scene holds references only so a snapshot of one costs almost nothing. Pushing above the guards would put a no-op on the stack, and Ctrl+Z that appears to do nothing is worse than no undo at all.
- **A `Snapshot` carries the scenes as well as the board.** Anything that can change the document has to be in it, or undo silently half-reverts.

## File organization

- **All filenames kebab-case.** `shape-picker.tsx`, not `ShapePicker.tsx`.
- **Tests live beside the module, as `<name>.test.ts`.** Vitest, node environment, no DOM. `src/core/` is pure by rule so it needs none, and the store runs headless. Anything that needs a canvas, a WebGL context or IndexedDB is covered by the manual test scripts in `docs/`, not here, because faking those proves the fake works.
- **Test the thing that fails silently.** A wrong mesh still renders, a bad migration still loads, a snapshot replayed on the wrong board still paints. Those are what the suite is for, not for asserting that a setter sets.
- `src/core/` pure logic. No React, no DOM access except where essential (canvas and blob for I/O). Testable in isolation. Holds `theme.ts` (canvas colours), `canvas-view.ts` (framing and board painting), `app-events.ts`, `toast.ts`, `offscreen-render.ts` (the shared export scene), `style-profile.ts` (the measured house style) and `draft-storage.ts` (crash recovery).
- `src/core/vxs-format.ts` is the only place a save file is validated or migrated. Never read a raw `.vxs` field at a call site.
- `src/components/` React components, sub-foldered by feature: `workspace/`, `paint-editor/`, `depth-editor/`, `scene-editor/`, `preview-3d/`, `export/`, `layout/`, `ui/`.
- `src/components/ui/` shared primitives only: `dialog`, `confirm-dialog`, `dropdown-menu`, `popover`, `tooltip`, `toaster`, `segmented`, `icon-button`, `kbd`. Anything used by two features belongs here.
- `src/ai/` the assistant: provider adapters, the tool surface, the agent loop, the system prompt. No React.
- `src/components/assistant/` the assistant panel, its transcript and its settings dialog.
- `src/hooks/` custom hooks.
- `src/store/` Zustand slices plus the root store.
- `src/types.ts` shared types used across more than one module. Component-local types inline.
- `src/exporters/` one file per output format.
- `src/styles/index.css` the *only* CSS file. No CSS modules, no component-local `.css`.

## Exporters

- **Every new exporter registers in `src/components/export/export-panel.tsx`'s `FORMATS` table** with its label, group (`mesh`, `voxel`, `image`, `animated`, `sprite`), `supports*` flags, and a `note`. The group decides which type tab it appears under.
- **A tileset is a 4-bit auto-tile set: sixteen variants indexed by which sides have a matching neighbour.** The bit vocabulary lives in `src/core/tile-mask.ts`, not in the exporter, because the asset rail needs it and importing the exporter for four checkboxes pulls the whole thing into the main bundle. The mask lives on the asset as `tileMask`, absent on an ordinary prop. The sheet runs mask 0 to 15 in order, because an engine indexes it by that number, so the order is a contract and the JSON states it. The 47-tile blob set is deliberately not built until 4-bit is proven.
- **The tiled view repeats the board around itself while drawing,** so a seam shows where it will be seen. Only the centre copy is edited.
- **Frame-aware exports take `MeshData[]`, one per animation frame.** The sprite sheet fills its rows with them and GIF plays them instead of turning a turntable. A still asset passes a list of one, so there is no second code path.
- **Mesh exports consume `MeshData`** from `computeShapeMesh()`. Voxel exports consume `Voxel[]` from `computeVoxels()`. Never re-derive geometry per exporter.
- **Anything that renders the model to pixels goes through `createOffscreenScene` in `src/core/offscreen-render.ts`.** The turntable and the sprite sheet share it, so their lighting, framing and material cannot drift. Never build a second WebGL scene in an exporter. The scene is temporary, so `dispose()` is not optional: a leaked context is not collected and browsers cap how many exist.
- **Sprite cells render through an orthographic camera.** A perspective camera changes a prop's footprint across the sheet, so the cells stop tiling on an isometric grid. The turntable keeps perspective, which is why the camera kind is an option rather than a constant.
- **A sprite sheet ships three files:** the colour sheet, an optional normal map painted from the same angles, and a JSON layout. The JSON is what stops an engine having to infer the cell grid, so it is not optional when the sheet gains a frame axis.

## Local overrides

- **A `Co-Authored-By: Claude` trailer is permitted here,** but only when the user invokes `/commit` or explicitly asks for one. This is looser than the shared rule, which forbids it outright.

## When in doubt

- `docs/implementation-plan.md` for the product roadmap and status.
- `docs/testing-guide.md` for how users are expected to exercise features.
- `docs/tailwind-migration.md` for v4-specific idioms.
