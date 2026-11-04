import type { FilmProfile } from "./profile-catalog";

type PixelEffect = (input: ImageData, profile: FilmProfile) => ImageData;

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function numberAt(source: unknown, path: string, fallback: number): number {
  let value: unknown = source;
  for (const part of path.split(".")) value = record(value)[part];
  const candidate = typeof value === "number" ? value : record(value).value;
  return typeof candidate === "number" && Number.isFinite(candidate) ? candidate : fallback;
}

function boolAt(source: unknown, path: string, fallback: boolean): boolean {
  let value: unknown = source;
  for (const part of path.split(".")) value = record(value)[part];
  return typeof value === "boolean" ? value : fallback;
}

function seededHash(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  return hash >>> 0;
}

function random01(seed: number): number {
  let value = seed | 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}

function clamp(value: number, min = 0, max = 255): number {
  return Math.max(min, Math.min(max, value));
}

function mix(original: ImageData, effected: ImageData, intensity: number): ImageData {
  const amount = clamp(intensity, 0, 100) / 100;
  if (amount >= 1) return effected;
  if (amount <= 0) return original;
  const output = new ImageData(original.width, original.height);
  for (let i = 0; i < original.data.length; i += 4) {
    output.data[i] = original.data[i] + (effected.data[i] - original.data[i]) * amount;
    output.data[i + 1] = original.data[i + 1] + (effected.data[i + 1] - original.data[i + 1]) * amount;
    output.data[i + 2] = original.data[i + 2] + (effected.data[i + 2] - original.data[i + 2]) * amount;
    output.data[i + 3] = original.data[i + 3];
  }
  return output;
}

function boxBlur(data: Uint8ClampedArray, width: number, height: number, radius: number): Uint8ClampedArray {
  const r = Math.max(1, Math.min(32, Math.round(radius)));
  const horizontal = new Float32Array(data.length);
  const output = new Uint8ClampedArray(data.length);
  for (let y = 0; y < height; y++) {
    const row = y * width * 4;
    const sums = [0, 0, 0];
    for (let x = -r; x <= r; x++) {
      const sx = Math.max(0, Math.min(width - 1, x));
      const i = row + sx * 4;
      sums[0] += data[i]; sums[1] += data[i + 1]; sums[2] += data[i + 2];
    }
    for (let x = 0; x < width; x++) {
      const i = row + x * 4;
      const span = r * 2 + 1;
      horizontal[i] = sums[0] / span; horizontal[i + 1] = sums[1] / span; horizontal[i + 2] = sums[2] / span;
      const remove = row + Math.max(0, x - r) * 4;
      const add = row + Math.min(width - 1, x + r + 1) * 4;
      sums[0] += data[add] - data[remove]; sums[1] += data[add + 1] - data[remove + 1]; sums[2] += data[add + 2] - data[remove + 2];
    }
  }
  for (let x = 0; x < width; x++) {
    const sums = [0, 0, 0];
    for (let y = -r; y <= r; y++) {
      const sy = Math.max(0, Math.min(height - 1, y));
      const i = (sy * width + x) * 4;
      sums[0] += horizontal[i]; sums[1] += horizontal[i + 1]; sums[2] += horizontal[i + 2];
    }
    for (let y = 0; y < height; y++) {
      const i = (y * width + x) * 4;
      const span = r * 2 + 1;
      output[i] = sums[0] / span; output[i + 1] = sums[1] / span; output[i + 2] = sums[2] / span; output[i + 3] = data[i + 3];
      const remove = (Math.max(0, y - r) * width + x) * 4;
      const add = (Math.min(height - 1, y + r + 1) * width + x) * 4;
      sums[0] += horizontal[add] - horizontal[remove]; sums[1] += horizontal[add + 1] - horizontal[remove + 1]; sums[2] += horizontal[add + 2] - horizontal[remove + 2];
    }
  }
  return output;
}

const applyGrainProfile: PixelEffect = (input, profile) => {
  const s = profile.settings;
  const output = new ImageData(new Uint8ClampedArray(input.data), input.width, input.height);
  const seed = seededHash(profile.id);
  const amount = numberAt(s, "amount", 25) / 100;
  const color = numberAt(s, "color", 50) / 100;
  const shadows = numberAt(s, "shadows", 30) / 100;
  const midtones = numberAt(s, "midtones", 50) / 100;
  const highlights = numberAt(s, "highlights", 50) / 100;
  const cluster = boolAt(s, "is_clustered", false) ? Math.max(1, Math.round(numberAt(s, "cluster_size", 1))) : 1;
  const scale = Math.max(0.15, numberAt(s, "scale", 40) / 40);
  for (let y = 0; y < input.height; y++) for (let x = 0; x < input.width; x++) {
    const blockX = Math.floor(x / cluster); const blockY = Math.floor(y / cluster);
    const noise = (random01(seed ^ Math.imul(blockY * input.width + blockX, 374761393)) - 0.5) * 255 * amount * scale;
    const i = (y * input.width + x) * 4;
    const lum = (input.data[i] * 0.299 + input.data[i + 1] * 0.587 + input.data[i + 2] * 0.114) / 255;
    const tonalWeight = lum < 0.35 ? shadows : lum > 0.7 ? highlights : midtones;
    const n = noise * tonalWeight;
    for (let c = 0; c < 3; c++) {
      const channelNoise = boolAt(s, "is_colored", true) ? n * (0.55 + random01(seed + i + c) * color) : n;
      output.data[i + c] = clamp(input.data[i + c] + channelNoise);
    }
  }
  return output;
};

function applyHalationLike(input: ImageData, settings: Record<string, unknown>, isBloom: boolean): ImageData {
  const threshold = numberAt(settings, isBloom ? "bloom.thresholds.upper_value" : "exposure.threshold", isBloom ? 80 : 78) * 2.55;
  const mask = new Uint8ClampedArray(input.data.length);
  for (let i = 0; i < input.data.length; i += 4) {
    const lum = input.data[i] * 0.299 + input.data[i + 1] * 0.587 + input.data[i + 2] * 0.114;
    const strength = Math.max(0, (lum - threshold) / Math.max(1, 255 - threshold));
    mask[i] = input.data[i] * strength; mask[i + 1] = input.data[i + 1] * strength * 0.28; mask[i + 2] = input.data[i + 2] * strength * 0.12; mask[i + 3] = 255;
  }
  const scaleFactor = Math.max(input.width, input.height) / Math.max(1, numberAt(settings, "basic_size", 1080));
  const localRadius = isBloom
    ? numberAt(settings, "edges_mask.edge_radius", 5) * scaleFactor
    : numberAt(settings, "local_diffusion", 25) / 5;
  const globalRadius = isBloom
    ? numberAt(settings, "bloom.inverse_mask.edge_radius", 32) * scaleFactor / 8
    : numberAt(settings, "global_diffusion", 45) / 8;
  const local = boxBlur(mask, input.width, input.height, localRadius);
  const global = boxBlur(mask, input.width, input.height, globalRadius);
  const output = new ImageData(new Uint8ClampedArray(input.data), input.width, input.height);
  const power = isBloom
    ? numberAt(settings, "bloom.brightness_amplify", 70) / 100 * numberAt(settings, "impact", 50) / 100
    : numberAt(settings, "power", 70) / 100;
  const opacity = numberAt(settings, "opacity", isBloom ? 100 : 80) / 100;
  const diffusion = isBloom ? numberAt(settings, "bloom.diffusion_amount", 70) / 100 : 1;
  const falloff = numberAt(settings, "falloff", 50) / 100;
  const saturation = numberAt(settings, "saturation", 100) / 100;
  const blueCompensation = numberAt(settings, "blue_compensation", 0) / 100;
  for (let i = 0; i < input.data.length; i += 4) {
    const glow = (local[i] * 0.65 + global[i] * 0.35) * power * opacity * diffusion * (0.65 + falloff * 0.35);
    const red = isBloom ? glow : glow * (1 + saturation * 0.15);
    const green = isBloom ? glow : glow * (0.12 + saturation * 0.08);
    const blue = isBloom ? glow : glow * (0.04 + blueCompensation * 0.12);
    output.data[i] = clamp(input.data[i] + red);
    output.data[i + 1] = clamp(input.data[i + 1] + green);
    output.data[i + 2] = clamp(input.data[i + 2] + blue);
  }
  return output;
}

const applyHalationProfile: PixelEffect = (input, { settings }) => applyHalationLike(input, settings, false);

const applyFilmBreathProfile: PixelEffect = (input, profile) => {
  const s = profile.settings;
  const phase = random01(seededHash(profile.id)) * Math.PI * 2;
  const period = Math.max(1, numberAt(s, "period", 2));
  const strength = numberAt(s, "impact", 100) / 100 * Math.sin(phase / period);
  const exposure = numberAt(s, "exposure.impact", 20) / 100 * strength;
  const contrast = numberAt(s, "contrast.impact", 25) / 100 * strength;
  const color = numberAt(s, "color.impact", 50) / 100 * strength;
  const output = new ImageData(new Uint8ClampedArray(input.data), input.width, input.height);
  for (let i = 0; i < input.data.length; i += 4) {
    const lum = input.data[i] * 0.299 + input.data[i + 1] * 0.587 + input.data[i + 2] * 0.114;
    for (let c = 0; c < 3; c++) {
      const centered = (input.data[i + c] - 128) * (1 + contrast * 0.35);
      const channelBias = c === 0 ? color * 8 : c === 2 ? -color * 8 : 0;
      output.data[i + c] = clamp(128 + centered + exposure * 35 + channelBias + (lum - input.data[i + c]) * color * 0.08);
    }
  }
  return output;
};

const applyGateWeaveProfile: PixelEffect = (input, profile) => {
  const s = profile.settings;
  const seed = seededHash(profile.id);
  const impact = numberAt(s, "impact", 100) / 100;
  const period = Math.max(1, numberAt(s, "period", 2));
  const length = Math.max(1, numberAt(s, "length", 24));
  const phase = Math.sin((random01(seed) * length / period) * Math.PI * 2);
  const shiftX = numberAt(s, "translate_x", 0) + random01(seed + 3) * numberAt(s, "translate_curve_x.impact", 20) * impact * phase * input.width / 4000;
  const shiftY = numberAt(s, "translate_y", 0) + random01(seed + 9) * numberAt(s, "translate_curve_y.impact", 30) * impact * phase * input.height / 4000;
  const angle = (numberAt(s, "angle", 0) + numberAt(s, "rotate.impact", 5) * impact * phase) * Math.PI / 180;
  const scale = Math.max(0.5, Math.min(2, numberAt(s, "scale", 1)));
  const cx = (input.width - 1) / 2; const cy = (input.height - 1) / 2;
  const output = new ImageData(input.width, input.height);
  const cos = Math.cos(angle) / scale; const sin = Math.sin(angle) / scale;
  for (let y = 0; y < input.height; y++) for (let x = 0; x < input.width; x++) {
    const dx = x - cx - shiftX; const dy = y - cy - shiftY;
    const sx = Math.max(0, Math.min(input.width - 1, Math.round(cx + dx * cos + dy * sin)));
    const sy = Math.max(0, Math.min(input.height - 1, Math.round(cy - dx * sin + dy * cos)));
    const dest = (y * input.width + x) * 4; const src = (sy * input.width + sx) * 4;
    output.data[dest] = input.data[src]; output.data[dest + 1] = input.data[src + 1]; output.data[dest + 2] = input.data[src + 2]; output.data[dest + 3] = input.data[src + 3];
  }
  return output;
};

const applyDirtProfile: PixelEffect = (input, profile) => {
  const settings = profile.settings;
  const output = new ImageData(new Uint8ClampedArray(input.data), input.width, input.height);
  const types = Array.isArray(settings.damage_types) ? settings.damage_types : [];
  const seed = seededHash(profile.id);
  const profileOpacity = numberAt(settings, "opacity", 85) / 100;
  const chromaticity = numberAt(settings, "chromaticity", 65) / 100;
  const globalAmount = numberAt(settings, "total_amount", 0);
  let index = 0;
  for (const rawType of types) {
    const type = record(rawType);
    if (type.enabled === false) continue;
    const amount = Math.max(0, numberAt(type, "amount", 0) + globalAmount);
    const count = Math.min(6000, Math.round(amount * Math.max(1, input.width * input.height / 90000) / 5));
    const alpha = Math.min(0.95, numberAt(type, "opacity", 100) / 100 * profileOpacity);
    const scale = numberAt(type, "scale", 100) / 100;
    const sizeBalance = numberAt(type, "size_balance", 60) / 100;
    const negativeBalance = numberAt(type, "negative_balance", 35) / 100;
    const typeChromaticity = numberAt(type, "chromaticity", chromaticity * 100) / 100;
    for (let n = 0; n < count; n++) {
      const random = random01(seed ^ Math.imul(index * 997 + n, 1597334677));
      const x = Math.floor(random * input.width); const y = Math.floor(random01(seed + index * 101 + n * 31) * input.height);
      const radius = Math.max(1, Math.round((1 + scale * (0.5 + sizeBalance) * random01(seed + n * 7)) * Math.max(input.width, input.height) / 1500));
      const dust = type.id === "dust" || type.id === "dirt";
      const brightMark = dust || random01(seed + index * 37 + n) < negativeBalance;
      const luminance = brightMark ? 250 : 12;
      const angle = random01(seed + n * 13 + index) * Math.PI * 2;
      const isLine = type.id === "hairs" || type.id === "scratches";
      const lineLength = Math.max(1, Math.round(numberAt(settings, "length", 120) * Math.max(input.width, input.height) / 1920 * (0.4 + sizeBalance)));
      const steps = isLine ? lineLength : 1;
      for (let step = 0; step < steps; step++) {
        const px = x + Math.round(Math.cos(angle) * step);
        const py = y + Math.round(Math.sin(angle) * step);
        if (px < 0 || px >= input.width || py < 0 || py >= input.height) continue;
        for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
          if (dx * dx + dy * dy > radius * radius) continue;
          const tx = px + dx; const ty = py + dy;
          if (tx < 0 || tx >= input.width || ty < 0 || ty >= input.height) continue;
          const pixel = (ty * input.width + tx) * 4;
          const blend = alpha * (0.6 + random01(seed + pixel + index) * 0.4);
          output.data[pixel] = clamp(output.data[pixel] * (1 - blend) + luminance * blend);
          output.data[pixel + 1] = clamp(output.data[pixel + 1] * (1 - blend) + (dust ? luminance : luminance * (1 + typeChromaticity)) * blend);
          output.data[pixel + 2] = clamp(output.data[pixel + 2] * (1 - blend) + (dust ? luminance : luminance * (1 + typeChromaticity * 2)) * blend);
        }
      }
    }
    index++;
  }
  return output;
};

const EFFECTS: Record<FilmProfile["family"], PixelEffect> = {
  bloom: (input, profile) => applyHalationLike(input, profile.settings, true),
  dirt: applyDirtProfile,
  "photo-dirt": applyDirtProfile,
  film_breath: applyFilmBreathProfile,
  gate_weave: applyGateWeaveProfile,
  grain: applyGrainProfile,
  halation: applyHalationProfile,
};

export function applyFilmProfile(input: ImageData, profile: FilmProfile, intensity: number): ImageData {
  if (!boolAt(profile.settings, "enabled", true) || intensity <= 0) return input;
  return mix(input, EFFECTS[profile.family](input, profile), intensity);
}

