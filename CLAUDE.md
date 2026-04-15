# CLAUDE.md — Voxel Studio

Project conventions. Read before editing.

## Stack

React 19 · TypeScript 5.9 · Vite 8 · Tailwind CSS v4 · Zustand + Immer · Three.js + R3F · pnpm

---

## Tailwind v4

- **No config file.** Theme tokens live in `src/styles/index.css` under `@theme { ... }`. To add a new token, edit that file.
- **Use `size-*` instead of `h-* w-*` when both dimensions are equal.**
  - `size-6` beats `w-6 h-6`
  - `size-full` beats `w-full h-full`
- **Prefer canonical classes over arbitrary values.**
  - `h-11` not `h-[44px]`
  - `min-w-110` not `min-w-[440px]`
  - IDE suggests canonical equivalents — apply them.
- **Use semantic tokens from `@theme`**, not raw colors.
  - `bg-bg-panel`, `bg-bg-secondary`, `text-text-primary`, `text-text-muted`, `border-border`
  - Raw `bg-slate-800` etc. bypass the design system — don't.
- **Use `inset-0` over `top-0 left-0 right-0 bottom-0`.**
- **Use `gap-*` on flex/grid parents** instead of `space-*` utilities.
- **Use `focus:outline-hidden`** for accessible focus (v4 idiom). Do not chain `focus:outline-none focus:ring-*`.
- **Reusable styles go in `@layer components`** in `src/styles/index.css`: `.btn`, `.btn-primary`, `.btn-icon`, `.tool-btn`, `.swatch`. Don't re-create them inline.
- **Arbitrary values are allowed only when no token fits** — e.g. tight letter-spacing, specific percentage widths. Always justify them with a comment if non-obvious.

## React

- **Functional components only. Named exports.**
  - `export function PaintEditor() { ... }` — not default exports.
- **Hooks rules:**
  - Wrap handlers passed into `useEffect` deps in `useCallback`.
  - Use `useMemo` for expensive derivations from store state (mesh generation, color counts).
  - For canvas-style components that read from the store but shouldn't re-render, subscribe via `useStore.subscribe(() => draw())` and read via `useStore.getState()` inside the draw callback.
- **Don't prop-drill.** Reach into `useStore()` or `useStore.getState()` inside the component or handler.
- **Refs for transient interaction state** (drag, hover, selection start) — never React state. React state re-renders; drag doesn't need that.
- **Never access `ref.current` during render.** Write in `useEffect`, read in events. Eslint's `react-hooks/refs` enforces this.

## Zustand + Immer

- **All mutations go through slice actions.** Never mutate store state directly from components.
- **Action pattern:**
  ```ts
  setFoo: (v) => set((state: SliceType) => { state.foo = v; })
  ```
- **Every grid-mutation action must set `state.isDirty = true`**. The exceptions are `clearDirty` (obviously) and `clearGrid` (which sets it false — a fresh canvas is clean).
- **Slices live in `src/store/*-slice.ts`** and are composed in `src/store/index.ts`.
- **Tool-state slice vs grid-state slice:** put UI/ephemeral state (active tool, zoom, cursor, mirror mode) in `tool-slice`; persistent document state (colorMap, depthMap, palette) in `grid-slice`.

## Three.js / R3F

- **Always use `BufferGeometry` + `Float32BufferAttribute`** for custom meshes. Don't hand-roll `THREE.Geometry`.
- **Always dispose** textures, geometries, materials, and renderers when a scene is temporary (e.g. offscreen exporter scene). Leak = memory creep.
- **`MeshStandardMaterial` with `vertexColors: true`** is the default for colored meshes; switch to `map: texture` for atlas mode.
- **For nearest-neighbour textures** (atlases, pixel art): `texture.magFilter = THREE.NearestFilter; texture.minFilter = THREE.NearestFilter; texture.generateMipmaps = false;`.
- **R3F's `<Canvas>` remounts on camera type change.** When switching ortho/persp, pass `orthographic={bool}` plus the appropriate camera props; don't swap via `<OrthographicCamera>` children.

## TypeScript

- **Strict mode is on.** No `any` without a comment explaining why.
- **`interface` for object shapes that might extend; `type` for unions, intersections, and one-offs.**
- **Explicit return types on exported functions.** Inference is fine for local helpers.
- **For untyped npm packages:** create a `.d.ts` in `src/types/`, declare the module with just the APIs you use. Don't `declare module "x";` without shapes unless truly opaque.
- **Prefer readonly arrays** when the function doesn't mutate: `function f(arr: readonly string[])`.

## File organization

- **All filenames kebab-case.** `shape-picker.tsx`, not `ShapePicker.tsx` or `shapePicker.tsx`.
- **`src/core/`** — pure logic, no React, no DOM access except where essential (canvas/blob for I/O). Testable in isolation.
- **`src/components/`** — React components. Sub-folders by feature: `paint-editor/`, `depth-editor/`, `preview-3d/`, `layout/`.
- **`src/hooks/`** — custom hooks.
- **`src/store/`** — Zustand slices + root store.
- **`src/types.ts`** — shared types used across >1 module. Component-local types inline.
- **`src/exporters/`** — one file per output format. Each exports a single `exportXxx(...)` function.
- **`src/styles/index.css`** — the *only* CSS file. No CSS modules, no component-local `.css` files.

## UI / UX

- **Icon-only buttons must have `title`.** If the tooltip would just repeat a visible label, skip it.
- **Keyboard shortcuts visible inline on primary actions.** Small muted mono text: `<span className="text-[9px] opacity-60 font-mono">Ctrl+S</span>`. Saves, undo/redo, and similar frequently-used actions qualify.
- **Tooltip copy:** ≤ 60 chars. Format: `"Action (Shortcut)"` or `"Label — brief description"`. Never a paragraph.
- **Never add emojis** to UI, code, comments, or docs unless the user explicitly asks. Applies to commit messages too.
- **Confirmations for destructive actions only when dirty.** Cheap-to-reverse actions (switching tools, zooming) don't need prompts.
- **Always push an undo snapshot before a destructive bulk mutation** (`clearGrid`, depth regeneration, image import, sample load, resize).
- **Modals close on `Esc` and on backdrop click.** Register both via `useEffect` + `e.target === e.currentTarget`.

## Exporters

- **Use the download pattern:**
  ```ts
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
  ```
- **Canvas → PNG via `canvas.toBlob(...)`**, not `toDataURL` (avoids large strings, respects memory).
- **Every new exporter registers in** `src/components/preview-3d/export-menu.tsx`'s `FORMATS` table with its label, group, `supports*` flags, and a `note`.
- **Mesh exports consume `MeshData`** from `computeShapeMesh()`. Voxel exports consume `Voxel[]` from `computeVoxels()`. Don't re-derive geometry per exporter.

## Build / Lint

- **`pnpm lint` must pass** before commit. Zero warnings target (we allow minor IDE warnings during active edits).
- **`pnpm build` must pass** (TS strict + Vite build).
- **Don't use `// @ts-ignore` or `// eslint-disable-next-line`** without a one-line comment justifying it.
- **No auto-generated code in the repo** — no build artifacts, no `dist/` committed, no `node_modules/`.

## Commit messages

- **Conventional-commit prefix** (`feat`, `fix`, `refactor`, `docs`, `chore`).
- **Scope in parens** is the feature area: `feat(export)`, `fix(paint)`, `feat(depth)`, `docs(plan)`.
- **Subject line under ~70 chars.** Body explains *why*, not *what* — the diff shows what.
- **Claude-authored commits** end with a `Co-Authored-By: Claude ...` trailer only when the user invokes `/commit` or asks for one.

## When in doubt

- Read `docs/implementation-plan.md` for the product roadmap and status.
- Read `docs/testing-guide.md` to understand how users are expected to exercise features.
- Read `docs/tailwind-migration.md` for v4-specific idioms.
