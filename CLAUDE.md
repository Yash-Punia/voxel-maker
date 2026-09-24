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
pnpm build    # TS strict + Vite build, must pass
pnpm preview
```

Minor IDE warnings during active edits are tolerated. `pnpm lint` and `pnpm build` both passing is the gate.

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
| Build gate | `pnpm lint && pnpm build` |
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

The app is one stage with four modes, not a set of side-by-side panels. `mode` lives in `tool-slice` and drives everything:

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
- **Every dialog lives in `dialog-host.tsx`** at the page root and opens from an app event. The exception is `app-menu.tsx`, which owns its own unsaved-work confirm because it also owns the file inputs that confirm gates.
- **Dialogs are built from `@/components/ui/dialog`,** which already pins the header and the footer and closes on Esc and backdrop. Do not hand-roll a modal div.
- **Destructive actions open `ConfirmDialog`.** `window.confirm` is not used anywhere.
- **Every keyboard shortcut is drawn by `@/components/ui/kbd`.** `Kbd` splits a chord on `+` into one chip per key, `KbdRange` shows a run like 1 through 9. Pass `tone="inverted"` inside a tooltip, whose surface is theme-constant bone. Never hand-roll a `<kbd>`.
- **A tooltip must not open on programmatic focus.** `TooltipTrigger` marks the focus event handled, because Radix opens a tooltip on any focus, including the focus a dialog or popover moves when it opens. That tooltip becomes the top dismissable layer and swallows the first Escape, so the overlay behind it needs two presses. Hover tooltips are unaffected.
- **Keyboard focus is themed, never the browser default.** A real `outline` in the accent colour, declared once in the stylesheet for every control class. Never remove a focus style without replacing it.
- **Keys whose legend is a symbol render as a lucide icon** (arrows, Shift, Enter) with the key name in an `sr-only` span. Keys whose legend is a word stay a word, because an Option glyph means nothing on Windows.
- **Press feedback:** the shared classes (`.btn`, `.icon-btn`, `.chip`, `.swatch`, `.seg-item`, `.mode-tab`) already include `active:scale-[0.98]` plus a transition. A one-off button appends them inline. Native form controls (`input[type=checkbox|radio|color|range]`, `select`) and their wrapping labels are exempt, since they have built-in press states and scaling their labels feels noisy.
- **Number keys follow the mode.** Draw picks a shape, depth sets the brush depth. Anything mode-specific belongs inside the mode branch of `use-keyboard-shortcuts.ts`.

## Assistant

The assistant is an agent loop that runs in the browser and edits the board through tools. `src/ai/` holds the whole feature and imports no React.

- **`providers/` is the only place a provider SDK appears.** `anthropic.ts` uses the official SDK, `openai-compatible.ts` is raw fetch, and both satisfy the `ChatProvider` interface in `types.ts`. Nothing outside that folder knows which one is running. Adding a provider means a new file there plus a row in `providers/index.ts`.
- **One transcript.** `chatTurns` is both what the UI renders and what gets replayed to the provider, so the two can never drift. An assistant turn keeps the provider's own content blocks in `raw` and replays them verbatim, which is what keeps reasoning blocks intact across tool calls.
- **Tools are the enforcement boundary.** Every tool runs through the same store actions the UI uses, so the undo stack, the dirty flag and the 3D rebuild behave as if a person had done it. A tool validates and clamps every field it is handed. Never trust a coordinate, a colour or an id from the model.
- **The agent takes exactly one undo snapshot per turn,** before its first mutating tool, so Ctrl+Z reverts the whole turn. The transcript offers a revert button while that snapshot is still the newest thing on the stack.
- **Adding anything a user can read means widening a read tool in the same change.** `get_project` covers state, `read_board` covers the artwork. If the UI can show it and no tool returns it, the assistant is blind to it.
- **Batch writes.** `applyCellEdits` and `applyDepthEdits` in `board-io.ts` write once for a whole batch. Painting cell by cell through `setCell` rebuilds the mesh per cell.
- **`MAX_STEPS` in `agent.ts` caps the loop.** It is spending someone's money.
- **Two dialects share the OpenAI chat shape, and the stream parser reads both.** OpenAI splits one tool call into fragments across chunks keyed by `index`, with the id only on the first. Google sends each tool call complete in its own chunk, with a fresh id and no `index` at all. The accumulator keys on the id when there is one and on the index otherwise. Keying on `index` alone concatenates separate calls into one unparseable string.
- **A provider's error body never reaches the user.** `provider-error.ts` turns any status and any body shape into one sentence, the provider's own words as an optional detail, and an action the panel renders as a button (open settings, or try again). Adding a provider means mapping its failures there, not printing its JSON.

## Store specifics

- **Every grid-mutation action sets `state.isDirty = true`.** The exceptions are `clearDirty` and `clearGrid`, which sets it false because a fresh canvas is clean.
- **`tool-slice`** holds UI and ephemeral state: the active mode, tool, zoom, cursor, mirror mode, depth tint, and the 3D view toggles. **`grid-slice`** holds persistent document state: colorMap, depthMap, palette. **`chat-slice`** holds the assistant transcript and the provider settings, and is the only slice that writes to localStorage.
- Push an undo snapshot before `clearGrid`, depth regeneration, image import, sample load, and resize.

## File organization

- **All filenames kebab-case.** `shape-picker.tsx`, not `ShapePicker.tsx`.
- `src/core/` pure logic. No React, no DOM access except where essential (canvas and blob for I/O). Testable in isolation. Holds `theme.ts` (canvas colours), `canvas-view.ts` (framing and board painting) and `app-events.ts`.
- `src/components/` React components, sub-foldered by feature: `workspace/`, `paint-editor/`, `depth-editor/`, `preview-3d/`, `export/`, `layout/`, `ui/`.
- `src/components/ui/` shared primitives only: `dialog`, `confirm-dialog`, `dropdown-menu`, `popover`, `tooltip`, `segmented`, `icon-button`, `kbd`. Anything used by two features belongs here.
- `src/ai/` the assistant: provider adapters, the tool surface, the agent loop, the system prompt. No React.
- `src/components/assistant/` the assistant panel, its transcript and its settings dialog.
- `src/hooks/` custom hooks.
- `src/store/` Zustand slices plus the root store.
- `src/types.ts` shared types used across more than one module. Component-local types inline.
- `src/exporters/` one file per output format.
- `src/styles/index.css` the *only* CSS file. No CSS modules, no component-local `.css`.

## Exporters

- **Every new exporter registers in `src/components/export/export-panel.tsx`'s `FORMATS` table** with its label, group (`mesh`, `voxel`, `image`, `animated`), `supports*` flags, and a `note`. The group decides which type tab it appears under.
- **Mesh exports consume `MeshData`** from `computeShapeMesh()`. Voxel exports consume `Voxel[]` from `computeVoxels()`. Never re-derive geometry per exporter.

## Local overrides

- **A `Co-Authored-By: Claude` trailer is permitted here,** but only when the user invokes `/commit` or explicitly asks for one. This is looser than the shared rule, which forbids it outright.

## When in doubt

- `docs/implementation-plan.md` for the product roadmap and status.
- `docs/testing-guide.md` for how users are expected to exercise features.
- `docs/tailwind-migration.md` for v4-specific idioms.
