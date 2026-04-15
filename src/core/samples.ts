import type { ColorMap, DepthMap, ShapeMap, RotationMap } from '../types';

// Sample projects defined as visual string grids. Each row is one canvas row.
// Characters map to hex colors via `palette`. '.' = empty cell.
// Depths are uniform per sample for simplicity.

export interface SampleDef {
  id: string;
  name: string;
  description: string;
  gridWidth: number;
  gridHeight: number;
  depth: number;
  palette: Record<string, string>;
  rows: string[];
}

const HEART: SampleDef = {
  id: 'heart',
  name: 'Heart',
  description: 'Classic 16×16 pixel heart',
  gridWidth: 16,
  gridHeight: 16,
  depth: 4,
  palette: { r: '#e53b44', d: '#9e2835', w: '#ffffff' },
  rows: [
    '................',
    '................',
    '..rrrr....rrrr..',
    '.rrwwrr..rrwwrr.',
    'rrwwwwrrrrwwwwrr',
    'rrwwwwwrrwwwwwrr',
    'rrwwwwwwwwwwwwrr',
    'rrwwwwwwwwwwwwrr',
    'drrwwwwwwwwwwrrd',
    '.drrwwwwwwwwrrd.',
    '..drrwwwwwwrrd..',
    '...drrwwwwrrd...',
    '....drrwwrrd....',
    '.....drrrrd.....',
    '......drrd......',
    '.......dd.......',
  ],
};

const TREE: SampleDef = {
  id: 'tree',
  name: 'Tree',
  description: 'Stylized leafy tree',
  gridWidth: 16,
  gridHeight: 16,
  depth: 4,
  palette: { g: '#38b764', d: '#257179', b: '#743f39', l: '#a7f070' },
  rows: [
    '................',
    '......ggg.......',
    '.....gglgg......',
    '....ggllggg.....',
    '...gglllggdg....',
    '..ggglllgggdg...',
    '..gdgllllgggg...',
    '...gggllgdgg....',
    '....gggggg......',
    '.....gggg.......',
    '......bb........',
    '......bb........',
    '......bb........',
    '.....bbbb.......',
    '....bbbbbb......',
    '................',
  ],
};

const MUSHROOM: SampleDef = {
  id: 'mushroom',
  name: 'Mushroom',
  description: 'Red-capped mushroom with white spots',
  gridWidth: 16,
  gridHeight: 16,
  depth: 5,
  palette: { r: '#e53b44', d: '#9e2835', w: '#ffffff', s: '#ffe762', b: '#5d275d' },
  rows: [
    '................',
    '....rrrrrrrr....',
    '...rrrwrrrrrr...',
    '..rrrrrrrwrrrr..',
    '..rwrrrrrrrrwr..',
    '.rrrrwrrrwrrrrr.',
    '.rrrrrrrrrrrrrw.',
    '.drrrrrrrrrrrrr.',
    '..ddddddddddddd.',
    '......sswss.....',
    '......sssss.....',
    '......sssss.....',
    '......sssss.....',
    '......sssss.....',
    '.....bbbbbbb....',
    '................',
  ],
};

const SWORD: SampleDef = {
  id: 'sword',
  name: 'Sword',
  description: 'Pixel-art longsword',
  gridWidth: 16,
  gridHeight: 16,
  depth: 3,
  palette: { s: '#afbfd2', w: '#ffffff', d: '#566c86', h: '#743f39', g: '#e4a672' },
  rows: [
    '...............s',
    '..............sw',
    '.............swd',
    '............swd.',
    '...........swd..',
    '..........swd...',
    '.........swd....',
    '........swd.....',
    '.......swd......',
    '.....gsswd......',
    '....ghsd........',
    '...ggsgdg.......',
    '....gddg........',
    '....d.g.........',
    '................',
    '................',
  ],
};

const SMILEY: SampleDef = {
  id: 'smiley',
  name: 'Smiley',
  description: 'Classic smiley face',
  gridWidth: 16,
  gridHeight: 16,
  depth: 4,
  palette: { y: '#ffe762', d: '#b86f50', b: '#1a1c2c' },
  rows: [
    '................',
    '....dddddddd....',
    '...dyyyyyyyyd...',
    '..dyyyyyyyyyyd..',
    '.dyybyyyyyybyyd.',
    '.dyyyyyyyyyyyyd.',
    'dyybyyyyyyyybyyd',
    'dyyyyyyyyyyyyyyd',
    'dyyyyyyyyyyyyyyd',
    'dyybyyyyyyyybyyd',
    '.dyyybbbbbbyyyd.',
    '.dyyyyyyyyyyyyd.',
    '..dyyyyyyyyyyd..',
    '...dyyyyyyyyd...',
    '....dddddddd....',
    '................',
  ],
};

export const SAMPLES: SampleDef[] = [HEART, TREE, MUSHROOM, SWORD, SMILEY];

// Converts a sample definition to the flat maps used by the store.
export function materializeSample(sample: SampleDef): {
  gridWidth: number;
  gridHeight: number;
  colorMap: ColorMap;
  depthMap: DepthMap;
  shapeMap: ShapeMap;
  rotationMap: RotationMap;
} {
  const { gridWidth: w, gridHeight: h, depth, palette, rows } = sample;
  const size = w * h;
  const colorMap: ColorMap = new Array(size).fill('');
  const depthMap: DepthMap = new Array(size).fill(1);
  const shapeMap: ShapeMap = new Array(size).fill('square');
  const rotationMap: RotationMap = new Array(size).fill(0);

  for (let y = 0; y < h; y++) {
    const row = rows[y] ?? '';
    for (let x = 0; x < w; x++) {
      const ch = row[x];
      if (!ch || ch === '.') continue;
      const color = palette[ch];
      if (!color) continue;
      const idx = y * w + x;
      colorMap[idx] = color;
      depthMap[idx] = depth;
    }
  }

  return { gridWidth: w, gridHeight: h, colorMap, depthMap, shapeMap, rotationMap };
}
