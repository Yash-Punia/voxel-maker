import type { Voxel } from '../types';

// Exports voxels as Minecraft Java Edition block model JSON + accompanying texture atlas PNG.
// Model coordinates are mapped into Minecraft's 16×16×16 cube. If the model span exceeds 16
// in any axis, voxels are scaled down to fit; otherwise voxels are 1×1×1 units.
// Y axis is flipped so the top of the 2D canvas becomes the top of the block.
// Texture atlas: up to 256 unique colors packed as 1px cells in a 16×16 PNG.

export function exportMinecraft(voxels: Voxel[], filename = 'voxel-studio'): void {
  if (voxels.length === 0) {
    alert('Nothing to export — the canvas is empty.');
    return;
  }

  // ── bounds + scale ─────────────────────────────────────────────────────────
  const minX = Math.min(...voxels.map((v) => v.x));
  const maxX = Math.max(...voxels.map((v) => v.x));
  const minY = Math.min(...voxels.map((v) => v.y));
  const maxY = Math.max(...voxels.map((v) => v.y));
  const minZ = Math.min(...voxels.map((v) => Math.round(v.z)));
  const maxZ = Math.max(...voxels.map((v) => Math.round(v.z)));

  const spanX = maxX - minX + 1;
  const spanY = maxY - minY + 1;
  const spanZ = maxZ - minZ + 1;
  const maxSpan = Math.max(spanX, spanY, spanZ);

  const scale = Math.min(1, 16 / maxSpan);
  const scaledDown = maxSpan > 16;

  // ── palette atlas ──────────────────────────────────────────────────────────
  const colors = Array.from(new Set(voxels.map((v) => v.color)));
  if (colors.length > 256) {
    alert(`Too many unique colors (${colors.length}) — Minecraft atlas supports max 256.`);
    return;
  }

  const colorIndex = new Map(colors.map((c, i) => [c, i]));

  const texCanvas = document.createElement('canvas');
  texCanvas.width = 16;
  texCanvas.height = 16;
  const tctx = texCanvas.getContext('2d')!;
  tctx.clearRect(0, 0, 16, 16);
  colors.forEach((hex, i) => {
    tctx.fillStyle = hex;
    tctx.fillRect(i % 16, Math.floor(i / 16), 1, 1);
  });

  // ── build elements ─────────────────────────────────────────────────────────
  // Minecraft Y is up. Our grid Y grows downward, so we flip: newY = spanY - 1 - (y - minY).
  // Voxel Z (our painting depth) maps directly to MC Z.
  const elements = voxels.map((v) => {
    const zi = Math.round(v.z);
    const x = (v.x - minX) * scale;
    const y = (spanY - 1 - (v.y - minY)) * scale;
    const z = (zi - minZ) * scale;
    const ci = colorIndex.get(v.color)!;
    const u = ci % 16;
    const vc = Math.floor(ci / 16);
    const uv = [u, vc, u + 1, vc + 1];

    return {
      from: [fx(x), fx(y), fx(z)],
      to: [fx(x + scale), fx(y + scale), fx(z + scale)],
      faces: {
        north: { uv, texture: '#0' },
        south: { uv, texture: '#0' },
        east:  { uv, texture: '#0' },
        west:  { uv, texture: '#0' },
        up:    { uv, texture: '#0' },
        down:  { uv, texture: '#0' },
      },
    };
  });

  const model = {
    credit: 'Voxel Studio Export',
    textures: { 0: `${filename}_atlas` },
    elements,
  };

  // ── downloads ──────────────────────────────────────────────────────────────
  downloadBlob(
    new Blob([JSON.stringify(model, null, 2)], { type: 'application/json' }),
    `${filename}.json`,
  );

  texCanvas.toBlob((blob) => {
    if (blob) downloadBlob(blob, `${filename}_atlas.png`);
  }, 'image/png');

  if (scaledDown) {
    alert(`Model span (${spanX}×${spanY}×${spanZ}) exceeds Minecraft's 16³ block — scaled to fit. Place both JSON and PNG in your resource pack's models/ and textures/ directories.`);
  }
}

// Round to 4 decimals to keep the JSON compact.
function fx(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
