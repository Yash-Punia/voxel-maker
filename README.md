# VoxBrush

Browser-based 2D-to-3D modeling tool. Paint shapes on a pixel grid, assign per-cell depth, preview in real-time 3D, and export to 10+ formats.

## How it works

```
Paint 2D shapes ─> Assign depth per cell ─> Real-time 3D preview ─> Export
```

Each grid cell stores a **color**, **geometric shape** (square, triangle, circle, etc.), **rotation**, and **depth** value. The mesh pipeline (`computeShapeMesh`) extrudes each cell's 2D shape profile along the Z-axis by its depth, generates front/back/side faces with vertex colors, culls hidden faces between full-cell shapes, and optionally applies greedy meshing to merge coplanar quads.

## Stack

| Layer           | Tech                                              |
| --------------- | ------------------------------------------------- |
| Framework       | React 19, TypeScript 5.9, Vite 8                  |
| State           | Zustand 5 + Immer (3 slices: grid, tool, history) |
| 3D              | Three.js + React Three Fiber + Drei               |
| Styling         | Tailwind CSS v4 (token-based, no config file)     |
| Layout          | react-resizable-panels (3-panel drag)             |
| Package manager | pnpm                                              |

## Features

**Paint editor** - pencil, eraser, fill bucket, line tool, eyedropper, rectangle select. Mirror modes (horizontal/vertical). Shape rotation via scroll/space. 32-color palette with import/save.

**Depth editor** - manual depth painting (0-32), auto-generation (luminosity, color-index, noise), extrusion modes (symmetric, front, back), depth multiplier, PNG depth map import/export.

**3D preview** - orbit controls, flat/shaded toggle, ortho/perspective camera, real-time mesh updates.

**Export formats:**

- 3D mesh: OBJ, glTF, GLB, PLY, STL, DAE
- Voxel: MagicaVoxel VOX, Minecraft JSON
- 2D: PNG (canvas), SVG (vector), GIF (animated turntable)
- Texture modes: vertex colors or atlas-based UVs

**Project management** - custom `.vxs` file format (JSON, v2 with v1 backward compat), 50-step undo/redo, dirty state tracking, sample projects, palette presets (Pico-8, Sweetie-16, Endesga-16, etc.).

## Project structure

```
src/
  core/           Pure logic: mesh generation, depth ops, shapes, atlas, palette I/O
  components/
    paint-editor/  Left panel: 2D canvas + tools
    depth-editor/  Middle panel: depth assignment
    preview-3d/    Right panel: Three.js scene + export menu
    layout/        Toolbar, status bar, modals
    ui/            Radix/shadcn primitives
  store/           Zustand slices (grid-slice, tool-slice, history-slice)
  exporters/       One file per format, consumes MeshData or Voxel[]
  hooks/           useVxsIo, useKeyboardShortcuts, useDirtyState
  styles/          Single index.css with Tailwind v4 @theme tokens
  types.ts         Shared types (ColorMap, DepthMap, ShapeMap, etc.)
```

## Development

```bash
pnpm install
pnpm dev          # Vite dev server
pnpm build        # TypeScript check + production build
pnpm lint         # ESLint
```

## Architecture notes

- **Single mesh pipeline**: `computeShapeMesh()` in `src/core/depth-ops.ts` is the canonical geometry source for both the 3D preview and all exporters.
- **Shape registry**: `src/core/shapes.ts` defines each geometric shape with `draw2D()` (canvas render), `getProfile()` (2D polygon for extrusion), and `isFullCell` (for face culling).
- **State**: Zustand store with Immer middleware. Grid slice holds document data (colorMap, depthMap, shapeMap, rotationMap). Tool slice holds ephemeral UI state. History slice stores snapshots for undo/redo.
- **No CSS modules**: all styles go through `src/styles/index.css` with Tailwind v4 `@theme` tokens and `@layer components` for reusable classes.
