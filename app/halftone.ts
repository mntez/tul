type Vec = { x: number; y: number };

function generateBayer8(): number[] {
  const m2 = [[0, 2], [3, 1]];
  function expand(mat: number[][]): number[][] {
    const n = mat.length;
    const res = Array.from({ length: n * 2 }, () => Array(n * 2).fill(0));
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const val = mat[i][j];
        res[i * 2][j * 2] = 4 * val;
        res[i * 2][j * 2 + 1] = 4 * val + 2;
        res[i * 2 + 1][j * 2] = 4 * val + 3;
        res[i * 2 + 1][j * 2 + 1] = 4 * val + 1;
      }
    return res;
  }
  const m8 = expand(expand(m2));
  const flat: number[] = [];
  for (let i = 0; i < 8; i++)
    for (let j = 0; j < 8; j++)
      flat.push(m8[i][j] / 64);
  return flat;
}

function generateOrganicMap(size = 8): number[] {
  const total = size * size;
  const center = (size - 1) / 2;
  const raw = new Array(total);
  for (let i = 0; i < size; i++)
    for (let j = 0; j < size; j++) {
      const dx = (i - center) / (size / 2);
      const dy = (j - center) / (size / 2);
      const radius = Math.sqrt(dx * dx + dy * dy);
      const angleNoise = (Math.sin(i * 2.3) * Math.cos(j * 1.9) + 1) / 2;
      const radial = Math.max(0, 1 - radius);
      raw[i * size + j] = radial * 0.55 + angleNoise * 0.45;
    }
  const indexed = raw.map((v, idx) => ({ v, idx }));
  indexed.sort((a, b) => a.v - b.v);
  const result = new Array(total);
  for (let rank = 0; rank < total; rank++) result[indexed[rank].idx] = rank / (total - 1);
  return result;
}

function generateClusteredDot(size = 6): number[] {
  const total = size * size;
  const center = (size - 1) / 2;
  const vals = new Array(total);
  for (let i = 0; i < size; i++)
    for (let j = 0; j < size; j++) {
      const dx = i - center, dy = j - center;
      const maxDist = Math.sqrt(center * center + center * center);
      vals[i * size + j] = Math.sqrt(dx * dx + dy * dy) / maxDist;
    }
  const min = Math.min(...vals), max = Math.max(...vals);
  return vals.map(v => (v - min) / (max - min));
}

function generateArtDecoMap(size = 8): number[] {
  const map: number[] = [];
  for (let i = 0; i < size; i++)
    for (let j = 0; j < size; j++) {
      const diag = (i + j) % (size * 2);
      const curve = Math.sin(i * 0.8) * Math.cos(j * 0.8);
      map.push(((diag / (size * 2) + curve * 0.2) % 1.0));
    }
  const min = Math.min(...map), max = Math.max(...map);
  return map.map(v => (v - min) / (max - min));
}

function generateDiagonalWave(size = 8): number[] {
  const map: number[] = [];
  for (let i = 0; i < size; i++)
    for (let j = 0; j < size; j++) {
      const d = (i + j) / (size * 2);
      const wave = (Math.sin(i * 1.2) + Math.cos(j * 1.2)) * 0.25;
      map.push(d + wave);
    }
  const min = Math.min(...map), max = Math.max(...map);
  return map.map(v => (v - min) / (max - min));
}

function generateSpiralMap(size = 8): number[] {
  const map: number[] = [];
  const center = (size - 1) / 2;
  for (let i = 0; i < size; i++)
    for (let j = 0; j < size; j++) {
      const dx = i - center, dy = j - center;
      const angle = Math.atan2(dy, dx);
      const radius = Math.sqrt(dx * dx + dy * dy) / (center + 0.5);
      map.push(((angle / (Math.PI * 2) + radius * 1.5) % 1.0));
    }
  const min = Math.min(...map), max = Math.max(...map);
  return map.map(v => (v - min) / (max - min));
}

function generateHalftoneCircles(size = 8): number[] {
  const map: number[] = [];
  const center = (size - 1) / 2;
  for (let i = 0; i < size; i++)
    for (let j = 0; j < size; j++) {
      const dx = i - center, dy = j - center;
      const maxDist = Math.sqrt(center * center + center * center);
      const normDist = Math.sqrt(dx * dx + dy * dy) / maxDist;
      map.push(Math.sin(normDist * Math.PI * 1.2) * 0.7 + 0.3);
    }
  const min = Math.min(...map), max = Math.max(...map);
  return map.map(v => (v - min) / (max - min));
}

function generateHalftoneLines(size = 8): number[] {
  const map: number[] = [];
  for (let i = 0; i < size; i++)
    for (let j = 0; j < size; j++) {
      const lineVal = (Math.sin(i * 1.8) + 1) / 2;
      const cross = (Math.cos(j * 1.5) + 1) / 2;
      map.push(lineVal * 0.6 + cross * 0.4);
    }
  const min = Math.min(...map), max = Math.max(...map);
  return map.map(v => (v - min) / (max - min));
}

function generateMoirePattern(size = 8): number[] {
  const map: number[] = [];
  for (let i = 0; i < size; i++)
    for (let j = 0; j < size; j++) {
      const chess = ((i % 2 === 0) === (j % 2 === 0)) ? 0.2 : 0.8;
      const waveX = Math.sin(i * 1.2) * 0.2;
      const waveY = Math.cos(j * 1.2) * 0.2;
      map.push(chess + waveX + waveY);
    }
  const min = Math.min(...map), max = Math.max(...map);
  return map.map(v => (v - min) / (max - min));
}

function generateHexagonalGrid(size = 8): number[] {
  const map: number[] = [];
  for (let i = 0; i < size; i++)
    for (let j = 0; j < size; j++) {
      const hexX = (i + (j % 2) * 0.5) / size;
      const hexY = j / size;
      const distToCenter = Math.hypot(hexX - 0.5, hexY - 0.5);
      map.push(Math.sin(distToCenter * Math.PI * 3) * 0.5 + 0.5);
    }
  const min = Math.min(...map), max = Math.max(...map);
  return map.map(v => (v - min) / (max - min));
}

function generateZebraStripes(size = 8): number[] {
  const map: number[] = [];
  for (let i = 0; i < size; i++)
    for (let j = 0; j < size; j++) {
      const angle = i * 0.9 + j * 1.2;
      map.push((Math.sin(angle) + 1) / 2);
    }
  const min = Math.min(...map), max = Math.max(...map);
  return map.map(v => (v - min) / (max - min));
}

function generateStochasticDots(size = 8): number[] {
  const map: number[] = [];
  for (let i = 0; i < size; i++)
    for (let j = 0; j < size; j++) {
      const seed = (Math.sin(i * 12.9898) * Math.cos(j * 78.233 + 43758.5453)) % 1;
      map.push(Math.abs(seed));
    }
  const min = Math.min(...map), max = Math.max(...map);
  return map.map(v => (v - min) / (max - min));
}

function generateConcentricWaves(size = 8): number[] {
  const map: number[] = [];
  const center = (size - 1) / 2;
  for (let i = 0; i < size; i++)
    for (let j = 0; j < size; j++) {
      const dx = i - center, dy = j - center;
      map.push((Math.sin(Math.hypot(dx, dy) * 1.8) + 1) / 2);
    }
  const min = Math.min(...map), max = Math.max(...map);
  return map.map(v => (v - min) / (max - min));
}

function generateWebPattern(size = 8): number[] {
  const map: number[] = [];
  const center = (size - 1) / 2;
  for (let i = 0; i < size; i++)
    for (let j = 0; j < size; j++) {
      const dx = i - center, dy = j - center;
      const angle = Math.atan2(dy, dx);
      const radius = Math.hypot(dx, dy) / (center + 0.5);
      const webRadial = Math.sin(radius * Math.PI * 4) * 0.4;
      const webAngular = Math.sin(angle * 6) * 0.3;
      map.push((radius + webRadial + webAngular) % 1.0);
    }
  const min = Math.min(...map), max = Math.max(...map);
  return map.map(v => (v - min) / (max - min));
}

function generateRadialBurst(size = 8): number[] {
  const map: number[] = [];
  const center = (size - 1) / 2;
  for (let i = 0; i < size; i++)
    for (let j = 0; j < size; j++) {
      const dx = i - center, dy = j - center;
      const angle = Math.atan2(dy, dx);
      const radius = Math.hypot(dx, dy) / (center + 0.5);
      map.push((Math.pow(radius, 0.5) * (Math.sin(angle * 8) * 0.3 + 0.7)) % 1.0);
    }
  const min = Math.min(...map), max = Math.max(...map);
  return map.map(v => (v - min) / (max - min));
}

function generateCheckerFractal(size = 8): number[] {
  const map: number[] = [];
  for (let i = 0; i < size; i++)
    for (let j = 0; j < size; j++) {
      const level1 = ((Math.floor(i / 2) + Math.floor(j / 2)) % 2) * 0.5;
      const level2 = ((i + j) % 2) * 0.3;
      const noise = Math.sin(i * 1.7) * Math.cos(j * 1.7) * 0.2;
      map.push(level1 + level2 + noise);
    }
  const min = Math.min(...map), max = Math.max(...map);
  return map.map(v => (v - min) / (max - min));
}

function generateSwirlPattern(size = 8): number[] {
  const map: number[] = [];
  const center = (size - 1) / 2;
  for (let i = 0; i < size; i++)
    for (let j = 0; j < size; j++) {
      const dx = i - center, dy = j - center;
      const angle = Math.atan2(dy, dx);
      const radius = Math.hypot(dx, dy) / (center + 0.5);
      const swirl = (angle / (Math.PI * 2) + radius * 2.5) % 1.0;
      const twist = Math.sin(radius * Math.PI * 3) * 0.15;
      map.push((swirl + twist) % 1.0);
    }
  const min = Math.min(...map), max = Math.max(...map);
  return map.map(v => (v - min) / (max - min));
}

function generateStarburst(size = 8): number[] {
  const map: number[] = [];
  const center = (size - 1) / 2;
  for (let i = 0; i < size; i++)
    for (let j = 0; j < size; j++) {
      const dx = i - center, dy = j - center;
      const angle = Math.atan2(dy, dx);
      const radius = Math.hypot(dx, dy) / (center + 0.5);
      map.push((radius * 0.5 + Math.abs(Math.cos(angle * 5)) * 0.6) % 1.0);
    }
  const min = Math.min(...map), max = Math.max(...map);
  return map.map(v => (v - min) / (max - min));
}

function generateMazePattern(size = 8): number[] {
  const map: number[] = [];
  for (let i = 0; i < size; i++)
    for (let j = 0; j < size; j++) {
      const hWall = (Math.floor(i / 1.5) % 3 === 0) ? 0.7 : 0.2;
      const vWall = (Math.floor(j / 1.5) % 3 === 1) ? 0.7 : 0.2;
      const corner = (Math.sin(i * 1.2) * Math.cos(j * 1.2) + 1) / 2 * 0.3;
      map.push((hWall * vWall) * 0.8 + corner);
    }
  const min = Math.min(...map), max = Math.max(...map);
  return map.map(v => (v - min) / (max - min));
}

function generatePureHoneycomb(size = 8): number[] {
  const map: number[] = [];
  for (let i = 0; i < size; i++)
    for (let j = 0; j < size; j++) {
      const hexX = i * 0.866;
      const hexY = j + (Math.floor(i / 1.5) % 2) * 0.5;
      const cellX = Math.floor(hexX / 1.2);
      const cellY = Math.floor(hexY / 1.2);
      const cx = cellX * 1.2;
      const cy = cellY * 1.2;
      const distToCenter = Math.hypot(hexX - cx - 0.6, hexY - cy - 0.6);
      map.push(Math.sin(distToCenter * Math.PI * 2.5) * 0.5 + 0.5);
    }
  const min = Math.min(...map), max = Math.max(...map);
  return map.map(v => (v - min) / (max - min));
}

function generateCombPattern(size = 8): number[] {
  const map: number[] = [];
  for (let i = 0; i < size; i++)
    for (let j = 0; j < size; j++) {
      const tooth = Math.abs(Math.sin(i * 3.0)) * 0.8;
      const spine = Math.sin(j * 2.5) * 0.3;
      map.push((tooth + spine) % 1.0);
    }
  const min = Math.min(...map), max = Math.max(...map);
  return map.map(v => (v - min) / (max - min));
}

function generatePhaseWaves(size = 8): number[] {
  const map: number[] = [];
  for (let i = 0; i < size; i++)
    for (let j = 0; j < size; j++) {
      const wave1 = Math.sin(i * 1.2 + j * 0.8) * 0.4;
      const wave2 = Math.cos(i * 0.7 + j * 1.3 + 1.2) * 0.3;
      const wave3 = Math.sin(i * 2.5) * Math.cos(j * 2.5) * 0.3;
      map.push((wave1 + wave2 + wave3 + 1) / 2);
    }
  const min = Math.min(...map), max = Math.max(...map);
  return map.map(v => (v - min) / (max - min));
}

function generatePlasmaFractal(size = 8): number[] {
  const map: number[] = [];
  for (let i = 0; i < size; i++)
    for (let j = 0; j < size; j++) {
      let val = 0;
      let amplitude = 0.5;
      let frequency = 1.0;
      for (let octave = 0; octave < 4; octave++) {
        val += amplitude * Math.sin(i * frequency * 0.8) * Math.cos(j * frequency * 0.7);
        val += amplitude * Math.sin((i + j) * frequency * 0.6) * 0.5;
        amplitude *= 0.5;
        frequency *= 2;
      }
      map.push((val + 1) / 2);
    }
  const min = Math.min(...map), max = Math.max(...map);
  return map.map(v => (v - min) / (max - min));
}

const bayer4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => v / 16);

const THRESHOLD_MAPS: Record<string, { data: number[]; size: number }> = {
  bayer_4x4: { data: bayer4, size: 4 },
  bayer_8x8: { data: generateBayer8(), size: 8 },
  organic_8x8: { data: generateOrganicMap(8), size: 8 },
  clustered_6x6: { data: generateClusteredDot(6), size: 6 },
  art_deco_8x8: { data: generateArtDecoMap(8), size: 8 },
  diagonal_wave: { data: generateDiagonalWave(8), size: 8 },
  spiral_map: { data: generateSpiralMap(8), size: 8 },
  halftone_circles: { data: generateHalftoneCircles(8), size: 8 },
  halftone_lines: { data: generateHalftoneLines(8), size: 8 },
  moire_pattern: { data: generateMoirePattern(8), size: 8 },
  hexagonal_grid: { data: generateHexagonalGrid(8), size: 8 },
  zebra_stripes: { data: generateZebraStripes(8), size: 8 },
  stochastic_dots: { data: generateStochasticDots(8), size: 8 },
  concentric_waves: { data: generateConcentricWaves(8), size: 8 },
  web_pattern: { data: generateWebPattern(8), size: 8 },
  radial_burst: { data: generateRadialBurst(8), size: 8 },
  checker_fractal: { data: generateCheckerFractal(8), size: 8 },
  swirl_pattern: { data: generateSwirlPattern(8), size: 8 },
  starburst: { data: generateStarburst(8), size: 8 },
  maze_pattern: { data: generateMazePattern(8), size: 8 },
  pure_honeycomb: { data: generatePureHoneycomb(8), size: 8 },
  comb_pattern: { data: generateCombPattern(8), size: 8 },
  phase_waves: { data: generatePhaseWaves(8), size: 8 },
  plasma_fractal: { data: generatePlasmaFractal(8), size: 8 },
};

export interface HalftoneSettings {
  thresholdMap: string;
  patternScale: number;
  brightness: number;
  contrast: number;
  invert: boolean;
  thresholdOffset: number;
}

export const HALFTONE_MAP_OPTIONS: { label: string; value: string }[] = [
  { label: "Bayer 4", value: "bayer_4x4" },
  { label: "Bayer 8", value: "bayer_8x8" },
  { label: "Organic", value: "organic_8x8" },
  { label: "Clustered", value: "clustered_6x6" },
  { label: "Art Deco", value: "art_deco_8x8" },
  { label: "Diagonal", value: "diagonal_wave" },
  { label: "Spiral", value: "spiral_map" },
  { label: "Circles", value: "halftone_circles" },
  { label: "Lines", value: "halftone_lines" },
  { label: "Moiré", value: "moire_pattern" },
  { label: "Hexagon", value: "hexagonal_grid" },
  { label: "Zebra", value: "zebra_stripes" },
  { label: "Stochastic", value: "stochastic_dots" },
  { label: "Waves", value: "concentric_waves" },
  { label: "Web", value: "web_pattern" },
  { label: "Radial", value: "radial_burst" },
  { label: "Checker", value: "checker_fractal" },
  { label: "Swirl", value: "swirl_pattern" },
  { label: "Starburst", value: "starburst" },
  { label: "Maze", value: "maze_pattern" },
  { label: "Honeycomb", value: "pure_honeycomb" },
  { label: "Comb", value: "comb_pattern" },
  { label: "Phase", value: "phase_waves" },
  { label: "Plasma", value: "plasma_fractal" },
];

export const DEFAULT_HALFTONE_SETTINGS: HalftoneSettings = {
  thresholdMap: "halftone_circles",
  patternScale: 1.0,
  brightness: 128,
  contrast: 1.0,
  invert: false,
  thresholdOffset: 0.0,
};

export function applyHalftone(
  imageData: ImageData,
  settings: HalftoneSettings
): ImageData {
  const mapEntry = THRESHOLD_MAPS[settings.thresholdMap];
  if (!mapEntry) return imageData;

  const { data, size: matrixSize } = mapEntry;
  const { width, height } = imageData;
  const output = new ImageData(width, height);
  const src = imageData.data;
  const dst = output.data;
  const scale = Math.max(0.25, settings.patternScale);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const lum = 0.299 * src[idx] + 0.587 * src[idx + 1] + 0.114 * src[idx + 2];
      let adjusted = (lum - 128) * settings.contrast + settings.brightness;
      adjusted = Math.max(0, Math.min(255, adjusted));
      let normalizedLum = adjusted / 255;
      if (settings.invert) normalizedLum = 1 - normalizedLum;
      let finalLum = normalizedLum + settings.thresholdOffset;
      finalLum = Math.max(0.01, Math.min(0.99, finalLum));

      const mx = Math.floor(x / scale) % matrixSize;
      const my = Math.floor(y / scale) % matrixSize;
      const threshold = data[(my < 0 ? 0 : my) * matrixSize + (mx < 0 ? 0 : mx)];
      const outputValue = finalLum > threshold ? 255 : 0;

      dst[idx] = outputValue;
      dst[idx + 1] = outputValue;
      dst[idx + 2] = outputValue;
      dst[idx + 3] = 255;
    }
  }
  return output;
}
