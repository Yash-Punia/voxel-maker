Here's a clean, detailed prompt you can use:

---

**Project: Voxel Studio – 2D Pixel to 3D Voxel Model Builder**

Build a professional, production-grade web application called **Voxel Studio** that converts 2D pixel art into 3D voxel models. The app has three core panels: a 2D Paint Editor, a Depth Editor, and a 3D Preview & Export panel. The UI should feel like a polished desktop tool — dark theme, tight layout, precise controls.

---

**Panel 1 – 2D Paint Editor (XY Plane)**

- Render a configurable pixel grid (default 16×16, supports up to 64×64) on an HTML5 Canvas
- Tools: Pencil, Eraser, Fill Bucket, Eyedropper, Rectangle Select
- Color picker with a persistent swatch palette (save/load custom palettes)
- Each cell stores an RGBA color value; transparent cells produce no voxel
- Grid lines toggle, zoom in/out, pan support
- Undo/redo stack (at least 50 steps)
- Import a reference image and auto-quantize it to fit the grid

---

**Panel 2 – Depth Editor**

- Mirror the same grid layout from Panel 1, overlaid with a numerical depth value per cell
- Default depth for all cells is 1
- Edit modes: click a cell and type a depth value (1–32), or use a brush that paints a selected depth value across cells
- Cells visually encode their depth using brightness or a color gradient so the user can read the depth map at a glance
- Depth of 0 means the cell is suppressed even if it has a color (useful for masking)
- Symmetric extrusion in the Z axis: a depth of N means N voxels stacked centered on Z=0 (e.g. depth 4 → voxels at Z = -2, -1, 0, 1)
- Option to switch to single-sided extrusion (voxels stack from Z=0 upward only)

---

**Panel 3 – 3D Preview & Export**

- Render the 3D voxel model in real time using Three.js
- Each voxel is a unit cube; color comes from Panel 1, stack count from Panel 2
- Camera: orbit controls (rotate, zoom, pan), orthographic/perspective toggle
- Lighting: ambient + directional light, with a toggle for flat/shaded rendering
- Grid floor reference plane in the 3D viewport
- Export formats:
  - `.vox` (MagicaVoxel format)
  - `.obj` + `.mtl` (Wavefront OBJ with merged geometry and materials)
  - `.gltf` / `.glb` (for game engines and web)
  - `.ply` (point cloud / mesh)
  - `.png` snapshot of the current 3D viewport
- Before export, run a mesh optimizer that merges coplanar voxel faces to reduce polygon count

---

**Architecture & Code Quality Standards**

- Framework: React with TypeScript
- State: Zustand for global grid state (color map, depth map, grid size, tool state)
- 3D: Three.js via `@react-three/fiber` and `@react-three/drei`
- Canvas: raw HTML5 Canvas API for the 2D paint/depth panels (no heavy canvas libraries)
- File I/O: all export logic isolated in a `/exporters/` module, one file per format
- No backend required — fully client-side
- Code must be modular: each panel is a self-contained component, shared grid state flows through Zustand only
- All grid operations (fill, undo, depth apply) must be pure functions in a `/core/` utilities layer

---

**UI/UX Requirements**

- Three-column layout: Paint Editor | Depth Editor | 3D Preview
- Collapsible panels for mobile responsiveness
- Toolbar at the top with: New, Open, Save (JSON project format), Export
- Status bar at the bottom: cursor coordinates, current color, current depth value, grid size
- Keyboard shortcuts for all major tools (B = brush, E = eraser, F = fill, D = eyedropper, Z/Y = undo/redo, Space = pan)
- Dark theme using CSS variables so a light theme can be added later

---

**Project Save Format**

Save/load the full project as a `.vxs` JSON file containing: grid dimensions, the flat color array (hex + alpha per cell), the flat depth array, palette swatches, and app version. This is the foundation for future paid cloud save features.

---

This gives you a solid base. A few notes on how to use it: feed it panel by panel if the model hits context limits, ask it to scaffold the Zustand store and `/core/` utilities first before building UI, and keep the exporter module separate from the start since that's where the most complexity lives.
