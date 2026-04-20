export interface ShapeDef {
  id: string;
  label: string;
  // Draw the shape on a 2D canvas. (x, y) is the top-left of the cell in canvas pixels.
  // size is the cell pixel size. rotation is 0|1|2|3 (×90°).
  draw2D: (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rotation: number) => void;
  // Returns a 2D polygon for 3D extrusion. Vertices are in [0,1]×[0,1] cell-local space.
  // indices is a list of triangles (each a triple of vertex indices).
  getProfile: (rotation: number) => { vertices: [number, number][]; indices: [number, number, number][] };
  // True only if the shape fills the entire cell — used to cull adjacent faces.
  isFullCell: boolean;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

// Rotate a [0,1]-space point 90° steps around cell center (0.5, 0.5).
function rotatePoint(px: number, py: number, steps: number): [number, number] {
  let x = px - 0.5;
  let y = py - 0.5;
  for (let i = 0; i < steps; i++) {
    [x, y] = [-y, x];
  }
  return [x + 0.5, y + 0.5];
}

function rotateVertices(
  verts: [number, number][],
  steps: number
): [number, number][] {
  return verts.map(([px, py]) => rotatePoint(px, py, steps));
}

// Apply a canvas rotation transform around the cell center, draw, then restore.
function withRotation(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  steps: number,
  fn: () => void
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((steps * Math.PI) / 2);
  ctx.translate(-cx, -cy);
  fn();
  ctx.restore();
}

// Draw a filled polygon from [0,1]-space vertices scaled to (x, y, size).
function drawPolygon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  verts: [number, number][]
) {
  ctx.beginPath();
  ctx.moveTo(x + verts[0][0] * size, y + verts[0][1] * size);
  for (let i = 1; i < verts.length; i++) {
    ctx.lineTo(x + verts[i][0] * size, y + verts[i][1] * size);
  }
  ctx.closePath();
  ctx.fill();
}

// Draw an arc-based shape (quarter circle). angles in radians.
function drawArc(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
  cornerX: number,
  cornerY: number
) {
  ctx.beginPath();
  ctx.moveTo(cornerX, cornerY);
  ctx.arc(cx, cy, r, startAngle, endAngle);
  ctx.closePath();
  ctx.fill();
}

// Triangulate a convex polygon (fan from vertex 0).
function fanTriangles(n: number): [number, number, number][] {
  const tris: [number, number, number][] = [];
  for (let i = 1; i < n - 1; i++) {
    tris.push([0, i, i + 1]);
  }
  return tris;
}

// ─── shape definitions ────────────────────────────────────────────────────────

const square: ShapeDef = {
  id: 'square',
  label: 'Square',
  isFullCell: true,

  draw2D(ctx, x, y, size) {
    ctx.fillRect(x, y, size, size);
  },

  getProfile() {
    const verts: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1]];
    return { vertices: verts, indices: [[0, 1, 2], [0, 2, 3]] };
  },
};

// Right triangle — right angle at bottom-left, hypotenuse from top-left to bottom-right.
// Rotation 0: fills bottom-left triangle.
const triangle: ShapeDef = {
  id: 'triangle',
  label: 'Triangle',
  isFullCell: false,

  draw2D(ctx, x, y, size, rotation) {
    const cx = x + size / 2;
    const cy = y + size / 2;
    withRotation(ctx, cx, cy, rotation, () => {
      ctx.beginPath();
      ctx.moveTo(x, y);           // top-left
      ctx.lineTo(x + size, y + size); // bottom-right
      ctx.lineTo(x, y + size);    // bottom-left
      ctx.closePath();
      ctx.fill();
    });
  },

  getProfile(rotation) {
    const base: [number, number][] = [[0, 0], [1, 1], [0, 1]];
    const verts = rotateVertices(base, rotation);
    return { vertices: verts, indices: [[0, 1, 2]] };
  },
};

// Quarter circle — arc fills the bottom-left quadrant (rotation 0).
const quarterCircle: ShapeDef = {
  id: 'quarter-circle',
  label: 'Quarter Circle',
  isFullCell: false,

  draw2D(ctx, x, y, size, rotation) {
    const cx = x + size / 2;
    const cy = y + size / 2;
    withRotation(ctx, cx, cy, rotation, () => {
      // Arc center at bottom-left corner, radius = size, sweeps to fill the quadrant.
      drawArc(
        ctx,
        x,          // arc center X = left edge
        y + size,   // arc center Y = bottom edge
        size,
        -Math.PI / 2, // start: pointing up
        0,            // end: pointing right
        x,
        y + size
      );
    });
  },

  getProfile(rotation) {
    // Match the 2D canvas version: a full quarter-disc whose arc is centered
    // on the bottom-left cell corner and spans from top-left to bottom-right.
    const steps = 8;
    const base: [number, number][] = [[0, 1]];
    for (let i = 0; i <= steps; i++) {
      const a = -Math.PI / 2 + (Math.PI / 2) * (i / steps);
      base.push([Math.cos(a), 1 + Math.sin(a)]);
    }
    const verts = rotateVertices(base, rotation);
    return { vertices: verts, indices: fanTriangles(verts.length) };
  },
};

// Half cell — fills left half (rotation 0), right half (1), bottom half (2), top half (3).
const half: ShapeDef = {
  id: 'half',
  label: 'Half',
  isFullCell: false,

  draw2D(ctx, x, y, size, rotation) {
    const cx = x + size / 2;
    const cy = y + size / 2;
    withRotation(ctx, cx, cy, rotation, () => {
      ctx.fillRect(x, y, size / 2, size);
    });
  },

  getProfile(rotation) {
    const base: [number, number][] = [[0, 0], [0.5, 0], [0.5, 1], [0, 1]];
    const verts = rotateVertices(base, rotation);
    return { vertices: verts, indices: [[0, 1, 2], [0, 2, 3]] };
  },
};

// Diagonal strip — thin parallelogram from top-left to bottom-right.
const diagonal: ShapeDef = {
  id: 'diagonal',
  label: 'Diagonal',
  isFullCell: false,

  draw2D(ctx, x, y, size, rotation) {
    const cx = x + size / 2;
    const cy = y + size / 2;
    const t = 0.25; // strip thickness as fraction of cell
    withRotation(ctx, cx, cy, rotation, () => {
      drawPolygon(ctx, x, y, size, [
        [0, t],
        [1 - t, 0],
        [1, 1 - t],
        [t, 1],
      ]);
    });
  },

  getProfile(rotation) {
    const t = 0.25;
    const base: [number, number][] = [[0, t], [1 - t, 0], [1, 1 - t], [t, 1]];
    const verts = rotateVertices(base, rotation);
    return { vertices: verts, indices: [[0, 1, 2], [0, 2, 3]] };
  },
};

// Small square — centered, 50% of cell size.
const smallSquare: ShapeDef = {
  id: 'small-square',
  label: 'Small Square',
  isFullCell: false,

  draw2D(ctx, x, y, size) {
    const pad = size * 0.25;
    ctx.fillRect(x + pad, y + pad, size * 0.5, size * 0.5);
  },

  getProfile() {
    const verts: [number, number][] = [
      [0.25, 0.25], [0.75, 0.25], [0.75, 0.75], [0.25, 0.75],
    ];
    return { vertices: verts, indices: [[0, 1, 2], [0, 2, 3]] };
  },
};

// Semicircle — flat edge at bottom, dome faces up (rotation 0).
const semicircle: ShapeDef = {
  id: 'semicircle',
  label: 'Semicircle',
  isFullCell: false,

  draw2D(ctx, x, y, size, rotation) {
    const cx = x + size / 2;
    const cy = y + size / 2;
    withRotation(ctx, cx, cy, rotation, () => {
      ctx.beginPath();
      ctx.moveTo(x, y + size / 2);
      ctx.arc(cx, y + size / 2, size / 2, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
    });
  },

  getProfile(rotation) {
    // Flat bottom at y=0.5, arc above it. Arc centered at (0.5, 0.5).
    const pts: [number, number][] = [[0, 0.5], [1, 0.5]];
    const steps = 8;
    for (let i = 0; i <= steps; i++) {
      const a = Math.PI - (Math.PI * i) / steps;
      pts.push([0.5 + 0.5 * Math.cos(a), 0.5 + 0.5 * Math.sin(a)]);
    }
    const verts = rotateVertices(pts, rotation);
    return { vertices: verts, indices: fanTriangles(verts.length) };
  },
};

// Notch — square with one corner (top-right) cut off diagonally.
const notch: ShapeDef = {
  id: 'notch',
  label: 'Notch',
  isFullCell: false,

  draw2D(ctx, x, y, size, rotation) {
    const cx = x + size / 2;
    const cy = y + size / 2;
    const t = 0.4; // cut size as fraction
    withRotation(ctx, cx, cy, rotation, () => {
      drawPolygon(ctx, x, y, size, [
        [0, 0],
        [1 - t, 0],
        [1, t],
        [1, 1],
        [0, 1],
      ]);
    });
  },

  getProfile(rotation) {
    const t = 0.4;
    const base: [number, number][] = [
      [0, 0], [1 - t, 0], [1, t], [1, 1], [0, 1],
    ];
    const verts = rotateVertices(base, rotation);
    return { vertices: verts, indices: fanTriangles(verts.length) };
  },
};

// Circle — inscribed circle filling the cell (16-segment polygon approximation).
const circle: ShapeDef = {
  id: 'circle',
  label: 'Circle',
  isFullCell: false,

  draw2D(ctx, x, y, size) {
    const cx = x + size / 2;
    const cy = y + size / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
  },

  getProfile() {
    // 16-vertex circle approximation centered at (0.5, 0.5), radius 0.5.
    // Rotation is irrelevant — a circle is rotationally symmetric.
    const steps = 16;
    const verts: [number, number][] = [];
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      verts.push([0.5 + 0.5 * Math.cos(a), 0.5 + 0.5 * Math.sin(a)]);
    }
    return { vertices: verts, indices: fanTriangles(verts.length) };
  },
};

// Diamond — 45° rotated square inscribed in the cell (vertices at cell midpoints).
const diamond: ShapeDef = {
  id: 'diamond',
  label: 'Diamond',
  isFullCell: false,

  draw2D(ctx, x, y, size) {
    drawPolygon(ctx, x, y, size, [
      [0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5],
    ]);
  },

  getProfile() {
    // 4-fold rotationally symmetric — ignore rotation parameter.
    const verts: [number, number][] = [
      [0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5],
    ];
    return { vertices: verts, indices: [[0, 1, 2], [0, 2, 3]] };
  },
};

// Cross — plus sign. Arms occupy 40% of the cell, centered.
const cross: ShapeDef = {
  id: 'cross',
  label: 'Cross',
  isFullCell: false,

  draw2D(ctx, x, y, size, rotation) {
    const cx = x + size / 2;
    const cy = y + size / 2;
    withRotation(ctx, cx, cy, rotation, () => {
      drawPolygon(ctx, x, y, size, crossVertices);
    });
  },

  getProfile(rotation) {
    // Non-convex polygon — can't fan-triangulate. Hand-crafted triangle list
    // decomposing the plus into a center square + 4 arm quads (10 tris).
    const verts = rotateVertices(crossVertices, rotation);
    return { vertices: verts, indices: crossTriangles };
  },
};

// Cross geometry constants (t = arm thickness as distance from the nearest edge).
// Arms are 1 - 2t = 0.4 wide when t = 0.3. Vertices traced clockwise from top-left.
const crossVertices: [number, number][] = (() => {
  const t = 0.3;
  return [
    [t, 0],         // 0  top-left of top arm
    [1 - t, 0],     // 1  top-right of top arm
    [1 - t, t],     // 2  inner corner
    [1, t],         // 3  top-right of right arm
    [1, 1 - t],     // 4  bottom-right of right arm
    [1 - t, 1 - t], // 5  inner corner
    [1 - t, 1],     // 6  bottom-right of bottom arm
    [t, 1],         // 7  bottom-left of bottom arm
    [t, 1 - t],     // 8  inner corner
    [0, 1 - t],     // 9  bottom-left of left arm
    [0, t],         // 10 top-left of left arm
    [t, t],         // 11 inner corner
  ];
})();

const crossTriangles: [number, number, number][] = [
  // Top arm (vertices 0, 1, 2, 11)
  [0, 1, 2], [0, 2, 11],
  // Right arm (2, 3, 4, 5)
  [2, 3, 4], [2, 4, 5],
  // Bottom arm (8, 5, 6, 7)
  [8, 5, 6], [8, 6, 7],
  // Left arm (11, 8, 9, 10)
  [11, 8, 9], [11, 9, 10],
  // Center square (11, 2, 5, 8)
  [11, 2, 5], [11, 5, 8],
];

// ─── registry ─────────────────────────────────────────────────────────────────

export const SHAPES: ShapeDef[] = [
  square,
  triangle,
  quarterCircle,
  half,
  diagonal,
  smallSquare,
  semicircle,
  notch,
  circle,
  diamond,
  cross,
];

export const SHAPE_MAP: Record<string, ShapeDef> = Object.fromEntries(
  SHAPES.map((s) => [s.id, s])
);

export function getShape(id: string): ShapeDef {
  return SHAPE_MAP[id] ?? SHAPE_MAP['square'];
}
