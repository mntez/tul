import type { FilmLookSettings, FilmModuleId } from "./film-settings";

type RGB = [number, number, number];
const clamp = (value: number, min = 0, max = 255) => Math.max(min, Math.min(max, value));
const value = (settings: FilmLookSettings, module: keyof FilmLookSettings, key: string, fallback = 0) => {
  const candidate = settings[module][key];
  return typeof candidate === "number" && Number.isFinite(candidate) ? candidate : fallback;
};
const enabled = (settings: FilmLookSettings, module: keyof FilmLookSettings) => settings[module].enabled === true;
const copy = (input: ImageData) => new ImageData(new Uint8ClampedArray(input.data), input.width, input.height);
const pixel = (data: Uint8ClampedArray, index: number): RGB => [data[index], data[index + 1], data[index + 2]];
const luma = (rgb: RGB) => rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114;
const hash = (n: number) => {
  let x = n | 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
};

function mapPixels(input: ImageData, fn: (rgb: RGB, x: number, y: number) => RGB): ImageData {
  const output = copy(input);
  for (let y = 0; y < input.height; y++) for (let x = 0; x < input.width; x++) {
    const i = (y * input.width + x) * 4;
    const result = fn(pixel(input.data, i), x, y);
    output.data[i] = clamp(result[0]); output.data[i + 1] = clamp(result[1]); output.data[i + 2] = clamp(result[2]);
  }
  return output;
}

function applySource(input: ImageData, settings: FilmLookSettings): ImageData {
  const exposure = 2 ** (value(settings, "source", "exposure") / 100);
  const temperature = value(settings, "source", "temperature") * 0.72;
  const tint = value(settings, "source", "tint") * 0.42;
  const defringe = value(settings, "source", "defringe") / 100 * (0.15 + value(settings, "source", "defringeRadius", 50) / 100);
  return mapPixels(input, (rgb) => {
    const l = luma(rgb);
    const saturation = Math.max(rgb[0], rgb[1], rgb[2]) - Math.min(rgb[0], rgb[1], rgb[2]);
    const fringe = defringe * Math.min(1, saturation / 96) * 0.35;
    return [((rgb[0] - l) * (1 - fringe) + l + temperature + tint * 0.25) * exposure,
      ((rgb[1] - l) * (1 - fringe) + l - tint * 0.5) * exposure,
      ((rgb[2] - l) * (1 - fringe) + l - temperature + tint * 0.25) * exposure];
  });
}

function applyDeveloper(input: ImageData, settings: FilmLookSettings): ImageData {
  const contrast = 1 + value(settings, "developer", "contrast") / 100;
  const gamma = 2 ** (-value(settings, "developer", "gamma") / 100);
  const colorBoost = value(settings, "developer", "colorBoost") / 100;
  const separation = value(settings, "developer", "colorSeparation", 100) / 100;
  return mapPixels(input, (rgb) => {
    const avg = luma(rgb);
    const sat = 1 + colorBoost + (separation - 1) * 0.45;
    return rgb.map((channel) => {
      const contrasted = (channel - 127.5) * contrast + 127.5;
      const colored = avg + (contrasted - avg) * sat;
      return 255 * Math.pow(Math.max(0, colored / 255), gamma);
    }) as RGB;
  });
}

function applyCompression(input: ImageData, settings: FilmLookSettings): ImageData {
  const impact = value(settings, "compression", "impact") / 100;
  const white = Math.max(1, value(settings, "compression", "whitePoint", 100) * 2.55);
  const range = value(settings, "compression", "tonalRange") / 100;
  const density = value(settings, "compression", "colorDensity") / 100;
  return mapPixels(input, (rgb) => {
    const mean = luma(rgb);
    const compressed = 255 * Math.pow(Math.min(1, mean / white), 1 + range * impact * 0.5);
    return rgb.map((channel) => {
      const tone = channel + (compressed - mean) * impact;
      return mean + (tone - mean) * (1 + density * impact);
    }) as RGB;
  });
}

function applyExpand(input: ImageData, settings: FilmLookSettings): ImageData {
  const black = value(settings, "expand", "blackPoint") * 2.55;
  const white = Math.max(black + 1, value(settings, "expand", "whitePoint", 100) * 2.55);
  const mode = settings.expand.colorMode;
  return mapPixels(input, (rgb) => {
    const expanded = rgb.map((channel) => ((channel - black) / (white - black)) * 255) as RGB;
    if (mode === "monochrome") { const v = luma(expanded); return [v, v, v]; }
    if (mode === "warm") return [expanded[0] * 1.04, expanded[1], expanded[2] * 0.94];
    if (mode === "cool") return [expanded[0] * 0.94, expanded[1], expanded[2] * 1.05];
    return expanded;
  });
}

function applyPrint(input: ImageData, settings: FilmLookSettings): ImageData {
  const exposure = 2 ** (value(settings, "print", "exposure") / 100);
  const contrast = 1 + value(settings, "print", "tonalContrast") / 100;
  const density = value(settings, "print", "colorDensity") / 100;
  const saturation = value(settings, "print", "saturation", 100) / 100;
  const target = value(settings, "print", "targetWhite") * 0.12;
  const profile = settings.print.profile;
  const analogueRangeLimiter = settings.print.analogueRangeLimiter === true;
  return mapPixels(input, (rgb) => {
    const mean = luma(rgb);
    return rgb.map((channel) => {
      let tone = ((channel - 127.5) * contrast + 127.5 + target) * exposure;
      if (profile === "print") {
        const normalized = clamp(tone) / 255;
        tone = (normalized * (1.08 - normalized * 0.08)) * 255;
      } else if (profile === "cineon") {
        const normalized = Math.max(0, tone / 255);
        tone = (Math.log1p(normalized * 8) / Math.log(9)) * 255;
      }
      const colored = (mean + (tone - mean) * saturation) * (1 - density * 0.15);
      if (!analogueRangeLimiter) return colored;
      // Keep print values inside a film-like range by gently compressing both ends.
      const normalized = clamp(colored) / 255;
      const toe = 16 / 255;
      const shoulder = 1 - 16 / 255;
      return normalized < 0.5
        ? (toe + normalized * (0.5 - toe) * 2) * 255
        : (0.5 + (normalized - 0.5) * (shoulder - 0.5) * 2) * 255;
    }) as RGB;
  });
}

function applyColorHead(input: ImageData, settings: FilmLookSettings): ImageData {
  const impact = value(settings, "colorHead", "impact") / 100;
  const yellowBlue = value(settings, "colorHead", "yellowBlue") * impact / 50;
  const magentaGreen = value(settings, "colorHead", "magentaGreen") * impact / 50;
  const cyanRed = value(settings, "colorHead", "cyanRed") * impact / 50;
  const shadow = value(settings, "colorHead", "shadowsTone") * impact / 50;
  const mid = value(settings, "colorHead", "midtonesTone") * impact / 50;
  const highlight = value(settings, "colorHead", "highlightsTone") * impact / 50;
  return mapPixels(input, (rgb) => {
    const lum = luma(rgb) / 255;
    const sw = (1 - lum) ** 2; const hw = lum ** 2; const mw = Math.max(0, 1 - sw - hw);
    const r = rgb[0] + cyanRed + shadow * sw + mid * mw + highlight * hw;
    const g = rgb[1] + magentaGreen + shadow * sw + mid * mw + highlight * hw;
    const b = rgb[2] + yellowBlue + shadow * sw + mid * mw + highlight * hw;
    if (!settings.colorHead.gang) return [r, g, b];
    const before = luma(rgb); const after = luma([r, g, b]);
    const preserve = value(settings, "colorHead", "preserveExposure") / 100;
    const correction = (before - after) * preserve;
    return [r + correction, g + correction, b + correction];
  });
}

function applyVignette(input: ImageData, settings: FilmLookSettings): ImageData {
  const size = Math.max(0.1, value(settings, "vignette", "size", 50) / 50);
  const feather = Math.max(0.02, value(settings, "vignette", "feather", 100) / 100);
  const aspect = value(settings, "vignette", "aspectRatio") / 100;
  const exposure = 2 ** (value(settings, "vignette", "exposure") / 100);
  const cx = input.width / 2; const cy = input.height / 2;
  return mapPixels(input, (rgb, x, y) => {
    const dx = (x - cx) / Math.max(1, cx * size * (aspect < 0 ? 1 - aspect * 0.8 : 1));
    const dy = (y - cy) / Math.max(1, cy * size * (aspect > 0 ? 1 + aspect * 0.8 : 1));
    const radial = Math.min(1, Math.sqrt(dx * dx + dy * dy));
    const factor = 1 + (exposure - 1) * Math.pow(radial, 1 / feather);
    return rgb.map((channel) => channel * factor) as RGB;
  });
}

function applyGrain(input: ImageData, settings: FilmLookSettings): ImageData {
  const seed = Math.round(value(settings, "damage", "seed", 1) + value(settings, "grain", "size", 23) * 7919);
  const amount = value(settings, "grain", "amount") / 100 * 38;
  const resolution = Math.max(1, Math.round(1 + (100 - value(settings, "grain", "resolution", 50)) / 18));
  const tonal = ["shadows", "midtones", "highlights"].map((key) => value(settings, "grain", key, 25) / 50);
  const color = value(settings, "grain", "color", 100) / 100;
  const filmTypeGain = settings.grain.filmType === "negative" ? 1.16 : settings.grain.filmType === "print" ? 0.84 : 1;
  const digital = settings.grain.mode === "digital";
  return mapPixels(input, (rgb, x, y) => {
    const block = Math.floor(y / resolution) * Math.ceil(input.width / resolution) + Math.floor(x / resolution);
    const lum = luma(rgb) / 255; const band = lum < 0.35 ? tonal[0] : lum > 0.7 ? tonal[2] : tonal[1];
    const noise = (hash(seed ^ block) - 0.5) * amount * band * filmTypeGain;
    return rgb.map((channel, c) => channel + noise * (digital ? 1 : color === 1 ? 0.58 + hash(seed + block + c) * 0.42 : 1)) as RGB;
  });
}

function applyGlow(input: ImageData, settings: FilmLookSettings, module: "halation" | "bloom"): ImageData {
  const isBloom = module === "bloom";
  const threshold = value(settings, module, "sourceLimiter", 80) * 2.55;
  const strength = value(settings, module, "impact") / 100;
  if (strength <= 0 && settings[module].maskMode !== true) return input;
  const diffusion = isBloom ? value(settings, module, "diffusion", 48) : (value(settings, module, "globalDiffusion", 30) + value(settings, module, "localDiffusion", 20)) / 2;
  const detailScale = isBloom ? 0.5 + value(settings, module, "details", 90) / 200 : 0.5 + value(settings, module, "smoothness", 7) / 200;
  const radius = Math.max(1, Math.min(8, Math.round(diffusion * detailScale / 18)));
  const highlights = new Float32Array(input.data.length);
  for (let i = 0; i < input.data.length; i += 4) {
    const lum = luma(pixel(input.data, i));
    const maskThreshold = isBloom
      ? Math.max(value(settings, module, "highlights", 30), value(settings, module, "sourceLimiter", 80)) * 2.55
      : threshold;
    const mask = Math.max(0, (lum - maskThreshold) / Math.max(1, 255 - maskThreshold));
    highlights[i] = input.data[i] * mask; highlights[i + 1] = input.data[i + 1] * mask; highlights[i + 2] = input.data[i + 2] * mask;
  }
  const output = copy(input); const mixAmount = (value(settings, module, "amplify", 40) / 100) * strength;
  const hue = value(settings, module, "hue", 61) / 100;
  const saturation = value(settings, module, "saturation", 100) / 100;
  const tint = isBloom
    ? [1 + (saturation - 1) * 0.12, 1, 1 - (saturation - 1) * 0.12]
    : [1.1 + hue * 0.35, 0.72 - hue * 0.3, 0.14 + value(settings, module, "blueCompensation") / 100];
  const backgroundGain = isBloom ? value(settings, module, "saveLights", 100) / 100 : value(settings, module, "backgroundGain", 50) / 100;
  for (let y = 0; y < input.height; y++) for (let x = 0; x < input.width; x++) {
    const i = (y * input.width + x) * 4; const sums = [0, 0, 0]; let count = 0;
    for (let dy = -radius; dy <= radius; dy += Math.max(1, radius)) for (let dx = -radius; dx <= radius; dx += Math.max(1, radius)) {
      const sx = Math.max(0, Math.min(input.width - 1, x + dx)); const sy = Math.max(0, Math.min(input.height - 1, y + dy)); const j = (sy * input.width + sx) * 4;
      sums[0] += highlights[j]; sums[1] += highlights[j + 1]; sums[2] += highlights[j + 2]; count++;
    }
    const scale = mixAmount * (isBloom ? 0.45 : 0.55) * (0.6 + backgroundGain * 0.4);
    if (settings[module].maskMode === true) {
      const maskValue = clamp((sums[0] + sums[1] + sums[2]) / (count * 3));
      output.data[i] = maskValue; output.data[i + 1] = maskValue; output.data[i + 2] = maskValue;
      continue;
    }
    output.data[i] = clamp(input.data[i] + sums[0] / count * scale * tint[0]);
    output.data[i + 1] = clamp(input.data[i + 1] + sums[1] / count * scale * tint[1]);
    output.data[i + 2] = clamp(input.data[i + 2] + sums[2] / count * scale * tint[2]);
  }
  return output;
}

function applyDamage(input: ImageData, settings: FilmLookSettings): ImageData {
  const output = copy(input); const seed = Math.round(value(settings, "damage", "seed", 1));
  const scale = Math.max(0.25, Math.max(input.width, input.height) / 1200);
  const specs = [
    { enabled: settings.damage.dustEnabled, amount: value(settings, "damage", "dustAmount"), size: value(settings, "damage", "dustScale", 30), balance: value(settings, "damage", "dustBalance", 50), id: 1 },
    { enabled: settings.damage.scratchesEnabled, amount: value(settings, "damage", "scratchesAmount"), size: value(settings, "damage", "scratchesScale", 30), balance: value(settings, "damage", "scratchesBalance", 50), id: 2 },
    { enabled: settings.damage.hairsEnabled, amount: value(settings, "damage", "hairsAmount"), size: value(settings, "damage", "hairsScale", 30), balance: value(settings, "damage", "hairsBalance", 50), id: 3 },
  ];
  const opacity = value(settings, "damage", "globalOpacity", 100) / 100;
  const chroma = value(settings, "damage", "globalChromaticity", 100) / 100;
  for (const spec of specs) {
    if (!spec.enabled) continue;
    const count = Math.min(5000, Math.round(spec.amount * scale));
    for (let n = 0; n < count; n++) {
      const x = Math.floor(hash(seed + n * 17 + spec.id * 101) * input.width);
      const y = Math.floor(hash(seed + n * 31 + spec.id * 173) * input.height);
      const extent = Math.max(1, Math.round((1 + spec.size / 35) * scale));
      const length = spec.id === 1 ? 1 : Math.max(2, Math.round(extent * (2 + spec.balance / 15)));
      const alpha = opacity * Math.min(0.9, (value(settings, "damage", "totalAmount") + 30) / 100);
      const mark = hash(seed + n * 13) < spec.balance / 100 ? 245 : 12;
      for (let step = 0; step < length; step++) {
        const px = Math.min(input.width - 1, x + step);
        const py = Math.min(input.height - 1, y + (spec.id === 3 ? step : 0));
        const i = (py * input.width + px) * 4;
        for (let c = 0; c < 3; c++) output.data[i + c] = clamp(output.data[i + c] * (1 - alpha) + mark * (c === 2 ? 1 + chroma * 0.08 : 1) * alpha);
      }
    }
  }
  return output;
}

function applyOverscan(input: ImageData, settings: FilmLookSettings): ImageData {
  const gateScale = settings.overscan.gateType === "super16" ? 0.94 : settings.overscan.gateType === "full-frame" ? 1.02 : settings.overscan.gateType === "academy" ? 0.98 : 1;
  const output = new ImageData(input.width, input.height); const scale = Math.max(0.5, (1 + value(settings, "overscan", "scale") / 100) * gateScale);
  const zoom = Math.max(0.5, value(settings, "overscan", "lensZoom", 100) / 100);
  const fit = scale * zoom; const dx = value(settings, "overscan", "offsetX") / 100 * input.width; const dy = value(settings, "overscan", "offsetY") / 100 * input.height;
  const cx = (input.width - 1) / 2; const cy = (input.height - 1) / 2;
  const blur = value(settings, "overscan", "gateDefocus") / 100;
  for (let y = 0; y < input.height; y++) for (let x = 0; x < input.width; x++) {
    const anamorphic = settings.overscan.gateShape === "anamorphic" ? 0.92 : 1;
    const sx = Math.round(cx + (x - cx - dx) / (fit * anamorphic)); const sy = Math.round(cy + (y - cy - dy) / fit); const di = (y * input.width + x) * 4;
    if (sx < 0 || sx >= input.width || sy < 0 || sy >= input.height) { output.data[di + 3] = 255; continue; }
    const si = (sy * input.width + sx) * 4; output.data[di] = input.data[si]; output.data[di + 1] = input.data[si + 1]; output.data[di + 2] = input.data[si + 2]; output.data[di + 3] = input.data[si + 3];
    const edge = Math.min(x, y, input.width - x - 1, input.height - y - 1) / Math.max(1, Math.min(input.width, input.height) * 0.08);
    const gateShade = settings.overscan.gateShape === "rounded" ? Math.min(1, edge * 4) : 1;
    const exposure = 2 ** (value(settings, "overscan", "exposure") / 100);
    const soften = 1 - blur * (1 - Math.min(1, edge));
    const verticalPerforation = x < input.width * 0.025 && y % Math.max(8, Math.round(input.height / 30)) < 3;
    const horizontalPerforation = y < input.height * 0.025 && x % Math.max(8, Math.round(input.width / 30)) < 3;
    const perforation = settings.overscan.perforationMode === "none" ? 1
      : (settings.overscan.filmOrientation === "vertical" ? verticalPerforation : horizontalPerforation)
        ? settings.overscan.perforationMode === "negative" ? 0.65 : 0.82 : 1;
    output.data[di] = clamp(output.data[di] * exposure * gateShade * soften * perforation);
    output.data[di + 1] = clamp(output.data[di + 1] * exposure * gateShade * soften * perforation);
    output.data[di + 2] = clamp(output.data[di + 2] * exposure * gateShade * soften * perforation);
  }
  return output;
}

function applyFilmBreath(input: ImageData, settings: FilmLookSettings): ImageData {
  const phase = Math.sin((value(settings, "filmBreath", "length", 24) / Math.max(1, value(settings, "filmBreath", "period", 3))) * 1.618);
  const impact = value(settings, "filmBreath", "impact", 100) / 100 * phase;
  const exposure = value(settings, "filmBreath", "exposure", 10) / 100 * impact;
  const contrast = 1 + value(settings, "filmBreath", "contrast", 10) / 1000 * impact;
  const color = value(settings, "filmBreath", "color", 10) / 100 * impact;
  return mapPixels(input, (rgb) => rgb.map((channel, c) => 128 + (channel - 128) * contrast + exposure * 24 + (c === 0 ? color * 8 : c === 2 ? -color * 8 : 0)) as RGB);
}

function applyGateWeave(input: ImageData, settings: FilmLookSettings): ImageData {
  const impact = value(settings, "gateWeave", "impact", 100) / 100;
  const phase = Math.sin(value(settings, "gateWeave", "length", 24) / Math.max(1, value(settings, "gateWeave", "period", 3)) * 1.618);
  const shiftX = value(settings, "gateWeave", "translateX") + value(settings, "gateWeave", "translateXImpact", 10) * phase * impact * input.width / 4000;
  const shiftY = value(settings, "gateWeave", "translateY") + value(settings, "gateWeave", "translateYImpact", 10) * phase * impact * input.height / 4000;
  const angle = (value(settings, "gateWeave", "angle") + value(settings, "gateWeave", "rotateImpact", 5) * impact * phase / 20) * Math.PI / 180;
  const requestedScale = 1 + (value(settings, "gateWeave", "scale", 1) - 1) * 0.2;
  const autoZoom = settings.gateWeave.autoZoom === true;
  const scale = Math.max(0.5, Math.min(2, autoZoom ? Math.max(requestedScale, 1 + Math.abs(shiftX / input.width) + Math.abs(shiftY / input.height)) : requestedScale));
  const cx = (input.width - 1) / 2; const cy = (input.height - 1) / 2; const output = new ImageData(input.width, input.height);
  const cos = Math.cos(angle) / scale; const sin = Math.sin(angle) / scale;
  for (let y = 0; y < input.height; y++) for (let x = 0; x < input.width; x++) {
    const dx = x - cx - shiftX; const dy = y - cy - shiftY;
    const sx = Math.max(0, Math.min(input.width - 1, Math.round(cx + dx * cos + dy * sin)));
    const sy = Math.max(0, Math.min(input.height - 1, Math.round(cy - dx * sin + dy * cos)));
    const dest = (y * input.width + x) * 4; const src = (sy * input.width + sx) * 4;
    output.data[dest] = input.data[src]; output.data[dest + 1] = input.data[src + 1]; output.data[dest + 2] = input.data[src + 2]; output.data[dest + 3] = input.data[src + 3];
  }
  return output;
}

function blendIntensity(base: ImageData, effected: ImageData, intensity: number): ImageData {
  const amount = Math.max(0, Math.min(1, intensity));
  if (amount >= 1) return effected;
  const output = copy(base);
  for (let i = 0; i < base.data.length; i += 4) {
    output.data[i] = base.data[i] + (effected.data[i] - base.data[i]) * amount;
    output.data[i + 1] = base.data[i + 1] + (effected.data[i + 1] - base.data[i + 1]) * amount;
    output.data[i + 2] = base.data[i + 2] + (effected.data[i + 2] - base.data[i + 2]) * amount;
  }
  return output;
}

export function applyFilmLook(input: ImageData, settings: FilmLookSettings, intensities: Partial<Record<FilmModuleId, number>> = {}): ImageData {
  let image = input;
  const run = (module: FilmModuleId, processor: (base: ImageData, current: FilmLookSettings) => ImageData) => {
    if (!enabled(settings, module)) return;
    const base = image;
    image = blendIntensity(base, processor(base, settings), intensities[module] ?? 1);
  };
  run("source", applySource);
  run("developer", applyDeveloper);
  run("compression", applyCompression);
  run("expand", applyExpand);
  run("print", applyPrint);
  run("colorHead", applyColorHead);
  run("vignette", applyVignette);
  run("grain", applyGrain);
  run("halation", (base, current) => applyGlow(base, current, "halation"));
  run("bloom", (base, current) => applyGlow(base, current, "bloom"));
  run("damage", applyDamage);
  run("overscan", applyOverscan);
  run("filmBreath", applyFilmBreath);
  run("gateWeave", applyGateWeave);
  return image;
}
