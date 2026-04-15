// Built-in sample palettes. All palettes are padded/truncated to 32 slots on apply.

export interface SamplePalette {
  id: string;
  name: string;
  colors: string[];
}

const PICO8: SamplePalette = {
  id: 'pico-8',
  name: 'PICO-8',
  colors: [
    '#000000', '#1d2b53', '#7e2553', '#008751',
    '#ab5236', '#5f574f', '#c2c3c7', '#fff1e8',
    '#ff004d', '#ffa300', '#ffec27', '#00e436',
    '#29adff', '#83769c', '#ff77a8', '#ffccaa',
  ],
};

const SWEETIE16: SamplePalette = {
  id: 'sweetie-16',
  name: 'Sweetie-16',
  colors: [
    '#1a1c2c', '#5d275d', '#b13e53', '#ef7d57',
    '#ffcd75', '#a7f070', '#38b764', '#257179',
    '#29366f', '#3b5dc9', '#41a6f6', '#73eff7',
    '#f4f4f4', '#94b0c2', '#566c86', '#333c57',
  ],
};

const ENDESGA16: SamplePalette = {
  id: 'endesga-16',
  name: 'Endesga-16',
  colors: [
    '#e4a672', '#b86f50', '#743f39', '#3f2832',
    '#9e2835', '#e53b44', '#fb922b', '#ffe762',
    '#63c64d', '#327345', '#193d3f', '#4f6781',
    '#afbfd2', '#ffffff', '#2ce8f4', '#0484d1',
  ],
};

const GAMEBOY: SamplePalette = {
  id: 'gameboy',
  name: 'Game Boy',
  colors: ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'],
};

const NES: SamplePalette = {
  id: 'nes',
  name: 'NES (subset)',
  colors: [
    '#7c7c7c', '#0000fc', '#0000bc', '#4428bc',
    '#940084', '#a80020', '#a81000', '#881400',
    '#503000', '#007800', '#006800', '#005800',
    '#004058', '#000000', '#bcbcbc', '#0078f8',
  ],
};

export const SAMPLE_PALETTES: SamplePalette[] = [PICO8, SWEETIE16, ENDESGA16, GAMEBOY, NES];
