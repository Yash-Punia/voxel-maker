// Palette extraction + save/load utilities.
// Palette size is fixed at 32 slots. Any import pads with black or truncates.

const PALETTE_SIZE = 32;

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

// ─── Extract unique colors from an image ────────────────────────────────────
// Walks every non-transparent pixel, collects unique hex colors up to PALETTE_SIZE.
// Compatible with Lospec palette PNGs (1×N color strips).

export function extractPaletteFromImage(img: ImageData): string[] {
  const seen = new Set<string>();
  const colors: string[] = [];
  const data = img.data;

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 32) continue;
    const hex = rgbToHex(data[i], data[i + 1], data[i + 2]);
    if (!seen.has(hex)) {
      seen.add(hex);
      colors.push(hex);
      if (colors.length >= PALETTE_SIZE) break;
    }
  }

  // Pad with black to always produce a full palette
  while (colors.length < PALETTE_SIZE) colors.push('#000000');
  return colors;
}

// ─── Save / load palette JSON ───────────────────────────────────────────────

export interface PaletteFile {
  name: string;
  colors: string[];
}

export function savePaletteJson(palette: string[], name = 'palette'): void {
  const file: PaletteFile = { name, colors: palette };
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name.endsWith('.json') ? name : `${name}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function loadPaletteJson(file: File): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data: PaletteFile = JSON.parse(e.target!.result as string);
        if (!Array.isArray(data.colors)) {
          reject(new Error('Invalid palette file'));
          return;
        }
        const colors = data.colors.slice(0, PALETTE_SIZE);
        while (colors.length < PALETTE_SIZE) colors.push('#000000');
        resolve(colors);
      } catch {
        reject(new Error('Failed to parse palette JSON'));
      }
    };
    reader.readAsText(file);
  });
}
