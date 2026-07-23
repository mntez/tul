export interface PixelateSettings {
  blockSize: number;
  rounded: boolean;
}
export const DEFAULT_PIXELATE: PixelateSettings = { blockSize: 8, rounded: false };

export function applyPixelate(imageData: ImageData, s: PixelateSettings): ImageData {
  const { width, height, data } = imageData;
  const out = new ImageData(width, height);
  const bs = Math.max(1, Math.floor(s.blockSize));
  for (let y = 0; y < height; y += bs)
    for (let x = 0; x < width; x += bs) {
      let r = 0, g = 0, b = 0, count = 0;
      for (let dy = 0; dy < bs && y + dy < height; dy++)
        for (let dx = 0; dx < bs && x + dx < width; dx++) {
          const i = ((y + dy) * width + (x + dx)) * 4;
          r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
        }
      r = Math.round(r / count); g = Math.round(g / count); b = Math.round(b / count);
      for (let dy = 0; dy < bs && y + dy < height; dy++)
        for (let dx = 0; dx < bs && x + dx < width; dx++) {
          const i = ((y + dy) * width + (x + dx)) * 4;
          if (s.rounded) {
            const cx = bs / 2, cy = bs / 2;
            const dist = Math.sqrt((dx - cx) ** 2 + (dy - cy) ** 2);
            if (dist > bs / 2) continue;
          }
          out.data[i] = r; out.data[i + 1] = g; out.data[i + 2] = b; out.data[i + 3] = 255;
        }
    }
  return out;
}

export interface GlitchSettings {
  shift: number;
  intensity: number;
  jitter: number;
  scanlines: boolean;
}
export const DEFAULT_GLITCH: GlitchSettings = { shift: 6, intensity: 0.5, jitter: 0, scanlines: false };

export function applyGlitch(imageData: ImageData, s: GlitchSettings): ImageData {
  const { width, height, data } = imageData;
  const out = new ImageData(new Uint8ClampedArray(data), width, height);
  const shift = Math.max(1, Math.floor(s.shift));
  const rows = Math.floor(height * s.intensity);
  for (let i = 0; i < rows; i++) {
    const y = Math.floor(Math.random() * height);
    const offset = (Math.random() > 0.5 ? 1 : -1) * Math.floor(shift * (0.5 + Math.random() * 0.5));
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * 4;
      const dx = Math.min(width - 1, Math.max(0, x + offset));
      const dst = (y * width + dx) * 4;
      out.data[dst] = data[src];
      out.data[dst + 1] = data[src + 1];
      out.data[dst + 2] = data[src + 2];
    }
  }
  if (s.jitter > 0) {
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const jx = Math.round(x + (Math.random() - 0.5) * s.jitter);
        const jy = Math.round(y + (Math.random() - 0.5) * s.jitter);
        if (jx >= 0 && jx < width && jy >= 0 && jy < height) {
          const ji = (jy * width + jx) * 4;
          out.data[i] = data[ji];
          out.data[i + 1] = data[ji + 1];
          out.data[i + 2] = data[ji + 2];
        }
      }
  }
  if (s.scanlines) {
    for (let y = 0; y < height; y += 3)
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        out.data[i] = Math.round(out.data[i] * 0.6);
        out.data[i + 1] = Math.round(out.data[i + 1] * 0.6);
        out.data[i + 2] = Math.round(out.data[i + 2] * 0.6);
      }
  }
  return out;
}

export interface DuotoneSettings {
  color1: string;
  color2: string;
}
export const DEFAULT_DUOTONE: DuotoneSettings = { color1: "#1a1a2e", color2: "#e94560" };

function hexToRGB(hex: string): [number, number, number] {
  if (!hex) return [0, 0, 0];
  const h = hex.replace("#", "");
  if (h.length === 6) return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  if (h.length === 3) return [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)];
  return [0, 0, 0];
}

export function applyDuotone(imageData: ImageData, s: DuotoneSettings): ImageData {
  const { width, height, data } = imageData;
  const out = new ImageData(width, height);
  const [r1, g1, b1] = hexToRGB(s.color1);
  const [r2, g2, b2] = hexToRGB(s.color2);
  for (let i = 0; i < data.length; i += 4) {
    const lum = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
    out.data[i] = Math.round(r1 + (r2 - r1) * lum);
    out.data[i + 1] = Math.round(g1 + (g2 - g1) * lum);
    out.data[i + 2] = Math.round(b1 + (b2 - b1) * lum);
    out.data[i + 3] = 255;
  }
  return out;
}

export interface VignetteSettings {
  strength: number;
  radius: number;
  softness: number;
}
export const DEFAULT_VIGNETTE: VignetteSettings = { strength: 0.5, radius: 0.5, softness: 0.5 };

export function applyVignette(imageData: ImageData, s: VignetteSettings): ImageData {
  const { width, height, data } = imageData;
  const out = new ImageData(new Uint8ClampedArray(data), width, height);
  const cx = width / 2, cy = height / 2;
  const maxDist = Math.sqrt(cx * cx + cy * cy);
  const rad = Math.max(0.1, s.radius);
  const falloff = Math.max(0.01, s.softness * 2);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / (maxDist * rad);
      const factor = 1 - Math.pow(Math.min(1, dist), falloff) * s.strength;
      const i = (y * width + x) * 4;
      out.data[i] = Math.round(data[i] * factor);
      out.data[i + 1] = Math.round(data[i + 1] * factor);
      out.data[i + 2] = Math.round(data[i + 2] * factor);
    }
  return out;
}

export interface NoiseSettings {
  amount: number;
  monochrome: boolean;
  size: number;
}
export const DEFAULT_NOISE: NoiseSettings = { amount: 0.15, monochrome: false, size: 1 };

export function applyNoise(imageData: ImageData, s: NoiseSettings): ImageData {
  const { width, height, data } = imageData;
  const out = new ImageData(new Uint8ClampedArray(data), width, height);
  const step = Math.max(1, Math.floor(s.size));
  for (let y = 0; y < height; y += step)
    for (let x = 0; x < width; x += step) {
      const n = (Math.random() - 0.5) * 255 * s.amount;
      for (let dy = 0; dy < step && y + dy < height; dy++)
        for (let dx = 0; dx < step && x + dx < width; dx++) {
          const i = ((y + dy) * width + (x + dx)) * 4;
          if (s.monochrome) {
            const v = Math.max(0, Math.min(255, data[i] + n));
            out.data[i] = v; out.data[i + 1] = v; out.data[i + 2] = v;
          } else {
            out.data[i] = Math.max(0, Math.min(255, data[i] + n));
            out.data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
            out.data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
          }
        }
    }
  return out;
}

export interface KaleidoscopeSettings {
  segments: number;
}
export const DEFAULT_KALEIDOSCOPE: KaleidoscopeSettings = { segments: 8 };

export function applyKaleidoscope(imageData: ImageData, s: KaleidoscopeSettings): ImageData {
  const { width, height, data } = imageData;
  const out = new ImageData(width, height);
  const cx = width / 2, cy = height / 2;
  const segs = Math.max(2, s.segments);
  const angleStep = (Math.PI * 2) / segs;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const dx = x - cx, dy = y - cy;
      let angle = Math.atan2(dy, dx);
      const dist = Math.sqrt(dx * dx + dy * dy);
      angle = angle % angleStep;
      if (angle < 0) angle += angleStep;
      angle = Math.min(angle, angleStep - angle);
      const sx = Math.round(cx + Math.cos(angle) * dist);
      const sy = Math.round(cy + Math.sin(angle) * dist);
      if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
        const si = (sy * width + sx) * 4;
        const di = (y * width + x) * 4;
        out.data[di] = data[si];
        out.data[di + 1] = data[si + 1];
        out.data[di + 2] = data[si + 2];
        out.data[di + 3] = 255;
      }
    }
  return out;
}

export interface RippleSettings {
  amplitude: number;
  frequency: number;
  direction: "both" | "x" | "y";
}
export const DEFAULT_RIPPLE: RippleSettings = { amplitude: 10, frequency: 20, direction: "both" };

export function applyRipple(imageData: ImageData, s: RippleSettings): ImageData {
  const { width, height, data } = imageData;
  const out = new ImageData(width, height);
  const amp = Math.max(1, s.amplitude);
  const freq = Math.max(1, s.frequency);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      let dx = x, dy = y;
      if (s.direction === "both" || s.direction === "x") dx = x + Math.sin((y / height) * Math.PI * freq) * amp;
      if (s.direction === "both" || s.direction === "y") dy = y + Math.sin((x / width) * Math.PI * freq) * amp;
      const sx = Math.max(0, Math.min(width - 1, Math.round(dx)));
      const sy = Math.max(0, Math.min(height - 1, Math.round(dy)));
      const si = (sy * width + sx) * 4;
      const di = (y * width + x) * 4;
      out.data[di] = data[si];
      out.data[di + 1] = data[si + 1];
      out.data[di + 2] = data[si + 2];
      out.data[di + 3] = 255;
    }
  return out;
}

export interface MotionBlurSettings {
  length: number;
  angle: number;
  quality: number;
}
export const DEFAULT_MOTION_BLUR: MotionBlurSettings = { length: 12, angle: 0, quality: 8 };

export function applyMotionBlur(imageData: ImageData, s: MotionBlurSettings): ImageData {
  const { width, height, data } = imageData;
  const out = new ImageData(width, height);
  const len = Math.max(1, Math.floor(s.length));
  const rad = (s.angle * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  const steps = Math.max(2, Math.min(len, Math.floor(s.quality)));
  const half = Math.floor(steps / 2);
  const div = steps;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0;
      for (let s = -half; s < steps - half; s++) {
        const sx = Math.round(x + dx * s * (len / steps));
        const sy = Math.round(y + dy * s * (len / steps));
        if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
          const i = (sy * width + sx) * 4;
          r += data[i]; g += data[i + 1]; b += data[i + 2];
        }
      }
      const i = (y * width + x) * 4;
      out.data[i] = Math.round(r / div);
      out.data[i + 1] = Math.round(g / div);
      out.data[i + 2] = Math.round(b / div);
      out.data[i + 3] = 255;
    }
  return out;
}

export interface RadialBlurSettings {
  strength: number;
  centerX: number;
  centerY: number;
  type: "zoom" | "spin";
  quality: number;
}
export const DEFAULT_RADIAL_BLUR: RadialBlurSettings = { strength: 10, centerX: 50, centerY: 50, type: "zoom", quality: 8 };

export function applyRadialBlur(imageData: ImageData, settings: RadialBlurSettings): ImageData {
  const { width, height, data } = imageData;
  const out = new ImageData(width, height);
  const cx = (settings.centerX / 100) * width;
  const cy = (settings.centerY / 100) * height;
  const steps = Math.max(2, Math.min(40, Math.floor(settings.quality)));
  const half = Math.floor(steps / 2);
  const str = Math.max(0.5, settings.strength);
  const blurType = settings.type;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0;
      const dx = x - cx, dy = y - cy;
      for (let step = -half; step < steps - half; step++) {
        const t = step / steps;
        let sx = x, sy = y;
        if (blurType === "zoom") {
          const factor = 1 + t * str * 0.05;
          sx = Math.round(cx + dx * factor);
          sy = Math.round(cy + dy * factor);
        } else {
          const angle = t * str * 0.03;
          const cos = Math.cos(angle), sin = Math.sin(angle);
          sx = Math.round(cx + dx * cos - dy * sin);
          sy = Math.round(cy + dx * sin + dy * cos);
        }
        if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
          const i = (sy * width + sx) * 4;
          r += data[i]; g += data[i + 1]; b += data[i + 2];
        }
      }
      const i = (y * width + x) * 4;
      out.data[i] = Math.round(r / steps);
      out.data[i + 1] = Math.round(g / steps);
      out.data[i + 2] = Math.round(b / steps);
      out.data[i + 3] = 255;
    }
  return out;
}

export interface ASCIISettings {
  charSet: string;
  scale: number;
  invert: boolean;
}
export const DEFAULT_ASCII: ASCIISettings = { charSet: "@%#*+=-:. ", scale: 4, invert: false };

const ASCII_SETS: Record<string, string> = {
  standard: "@%#*+=-:. ",
  dense: "@80GCLft1i;:,. ",
  blocks: "█▓▒░ ",
  simple: "█░ ",
};

export function applyASCII(imageData: ImageData, s: ASCIISettings): ImageData {
  const { width, height, data } = imageData;
  const grid = Math.max(1, Math.floor(s.scale));
  const chars = s.charSet;
  const cols = Math.ceil(width / grid);
  const rows = Math.ceil(height / grid);
  const cellSize = Math.max(4, grid);
  const tempW = cols * cellSize;
  const tempH = rows * cellSize;
  const temp = document.createElement("canvas");
  temp.width = tempW;
  temp.height = tempH;
  const tctx = temp.getContext("2d")!;
  tctx.fillStyle = "#fff";
  tctx.fillRect(0, 0, tempW, tempH);
  tctx.fillStyle = "#000";
  tctx.font = `${Math.ceil(cellSize * 0.85)}px monospace`;
  tctx.textBaseline = "middle";
  tctx.textAlign = "center";
  for (let gy = 0; gy < rows; gy++)
    for (let gx = 0; gx < cols; gx++) {
      let r = 0, g = 0, b = 0, count = 0;
      for (let dy = 0; dy < grid && gy * grid + dy < height; dy++)
        for (let dx = 0; dx < grid && gx * grid + dx < width; dx++) {
          const i = ((gy * grid + dy) * width + (gx * grid + dx)) * 4;
          r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
        }
      const lum = ((r / count) * 0.299 + (g / count) * 0.587 + (b / count) * 0.114) / 255;
      const adjusted = s.invert ? 1 - lum : lum;
      const charIdx = Math.floor(adjusted * (chars.length - 1));
      const cx = gx * cellSize + cellSize / 2;
      const cy = gy * cellSize + cellSize / 2;
      tctx.fillText(chars[charIdx] || chars[0], cx, cy);
    }
  const big = document.createElement("canvas");
  big.width = width;
  big.height = height;
  const bctx = big.getContext("2d")!;
  bctx.imageSmoothingEnabled = false;
  bctx.drawImage(temp, 0, 0, width, height);
  return bctx.getImageData(0, 0, width, height);
}

export const ASCII_CHARSET_OPTIONS = [
  { label: "Standard", value: ASCII_SETS.standard },
  { label: "Dense", value: ASCII_SETS.dense },
  { label: "Blocks", value: ASCII_SETS.blocks },
  { label: "Simple", value: ASCII_SETS.simple },
];

export interface ReceiptSettings {
  paperTint: string;
  noise: number;
  distortion: number;
  vignette: number;
}
export const DEFAULT_RECEIPT: ReceiptSettings = { paperTint: "#f5e6c8", noise: 0.08, distortion: 0.02, vignette: 0.15 };

export function applyReceipt(imageData: ImageData, s: ReceiptSettings): ImageData {
  const { width, height, data } = imageData;
  const out = new ImageData(width, height);
  const [pr, pg, pb] = hexToRGB(s.paperTint);
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const blend = gray / 255;
    const n = (Math.random() - 0.5) * 255 * s.noise;
    out.data[i] = Math.max(0, Math.min(255, Math.round(pr + (data[i] - pr) * blend + n)));
    out.data[i + 1] = Math.max(0, Math.min(255, Math.round(pg + (data[i + 1] - pg) * blend + n)));
    out.data[i + 2] = Math.max(0, Math.min(255, Math.round(pb + (data[i + 2] - pb) * blend + n)));
    out.data[i + 3] = 255;
  }
  if (s.vignette > 0) {
    const cx = width / 2, cy = height / 2;
    const maxDist = Math.sqrt(cx * cx + cy * cy);
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / maxDist;
        const factor = 1 - Math.min(1, dist * 1.2) * s.vignette;
        const i = (y * width + x) * 4;
        out.data[i] = Math.round(out.data[i] * factor);
        out.data[i + 1] = Math.round(out.data[i + 1] * factor);
        out.data[i + 2] = Math.round(out.data[i + 2] * factor);
      }
  }
  if (s.distortion > 0) {
    for (let y = 0; y < height; y++) {
      const shift = Math.sin(y * 0.05) * s.distortion * 20;
      for (let x = 0; x < width; x++) {
        const sx = Math.max(0, Math.min(width - 1, Math.round(x + shift)));
        const i = (y * width + x) * 4;
        const si = (y * width + sx) * 4;
        out.data[i] = out.data[si];
        out.data[i + 1] = out.data[si + 1];
        out.data[i + 2] = out.data[si + 2];
      }
    }
  }
  return out;
}

export interface CRTSettings {
  scanlines: number;
  curvature: number;
  glow: number;
  flicker: number;
}
export const DEFAULT_CRT: CRTSettings = { scanlines: 3, curvature: 15, glow: 0.3, flicker: 0.05 };

export function applyCRT(imageData: ImageData, s: CRTSettings): ImageData {
  const { width, height, data } = imageData;
  const out = new ImageData(new Uint8ClampedArray(data), width, height);
  const scanGap = Math.max(2, Math.floor(s.scanlines));
  const flicker = Math.random() * s.flicker;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const dx = (x / width - 0.5) * 2;
      const dy = (y / height - 0.5) * 2;
      const dist2 = dx * dx + dy * dy;
      const vignette = 1 - dist2 * 0.15 * s.curvature * 0.1;
      out.data[i] = Math.round(data[i] * (0.6 + flicker));
      out.data[i + 1] = Math.round(data[i + 1] * (0.6 + flicker));
      out.data[i + 2] = Math.round(data[i + 2] * (0.6 + flicker));
      if (y % scanGap === 0) {
        out.data[i] = Math.round(out.data[i] * 0.7);
        out.data[i + 1] = Math.round(out.data[i + 1] * 0.7);
        out.data[i + 2] = Math.round(out.data[i + 2] * 0.7);
      }
      out.data[i] = Math.round(out.data[i] * vignette);
      out.data[i + 1] = Math.round(out.data[i + 1] * vignette);
      out.data[i + 2] = Math.round(out.data[i + 2] * vignette);
    }
  if (s.glow > 0) {
    for (let y = 1; y < height - 1; y++)
      for (let x = 1; x < width - 1; x++) {
        const i = (y * width + x) * 4;
        const blur = (out.data[(y - 1) * width * 4 + x * 4] + out.data[(y + 1) * width * 4 + x * 4] + out.data[y * width * 4 + (x - 1) * 4] + out.data[y * width * 4 + (x + 1) * 4]) / 4;
        out.data[i] = Math.min(255, Math.round(out.data[i] + blur * s.glow * 0.3));
        out.data[i + 1] = Math.min(255, Math.round(out.data[i + 1] + blur * s.glow * 0.3));
        out.data[i + 2] = Math.min(255, Math.round(out.data[i + 2] + blur * s.glow * 0.3));
      }
  }
  return out;
}

export interface ThresholdSettings {
  level: number;
  softness: number;
  invert: boolean;
}
export const DEFAULT_THRESHOLD: ThresholdSettings = { level: 128, softness: 0, invert: false };

export function applyThreshold(imageData: ImageData, s: ThresholdSettings): ImageData {
  const { width, height, data } = imageData;
  const out = new ImageData(width, height);
  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const soft = Math.max(1, s.softness);
    let v: number;
    if (lum > s.level + soft) v = 255;
    else if (lum < s.level - soft) v = 0;
    else v = Math.round(((lum - (s.level - soft)) / (soft * 2)) * 255);
    if (s.invert) v = 255 - v;
    out.data[i] = v; out.data[i + 1] = v; out.data[i + 2] = v; out.data[i + 3] = 255;
  }
  return out;
}

export interface RGBShiftSettings {
  shiftX: number;
  shiftY: number;
  channel: "both" | "red" | "blue";
}
export const DEFAULT_RGB_SHIFT: RGBShiftSettings = { shiftX: 4, shiftY: 0, channel: "both" };

export function applyRGBShift(imageData: ImageData, s: RGBShiftSettings): ImageData {
  const { width, height, data } = imageData;
  const out = new ImageData(new Uint8ClampedArray(data), width, height);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (s.channel === "both" || s.channel === "red") {
        const rx = Math.max(0, Math.min(width - 1, x + s.shiftX));
        const ry = Math.max(0, Math.min(height - 1, y + s.shiftY));
        out.data[i] = data[(ry * width + rx) * 4];
      }
      if (s.channel === "both" || s.channel === "blue") {
        const bx = Math.max(0, Math.min(width - 1, x - s.shiftX));
        const by = Math.max(0, Math.min(height - 1, y - s.shiftY));
        out.data[i + 2] = data[(by * width + bx) * 4 + 2];
      }
    }
  return out;
}

export interface MotionTrailSettings {
  length: number;
  decay: number;
  angle: number;
}
export const DEFAULT_MOTION_TRAIL: MotionTrailSettings = { length: 10, decay: 0.7, angle: 0 };

export function applyMotionTrail(imageData: ImageData, s: MotionTrailSettings): ImageData {
  const { width, height, data } = imageData;
  const out = new ImageData(width, height);
  const len = Math.max(1, Math.floor(s.length));
  const rad = (s.angle * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, totalWeight = 0;
      for (let t = 0; t < len; t++) {
        const sx = Math.round(x - dx * t);
        const sy = Math.round(y - dy * t);
        if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
          const weight = Math.pow(s.decay, t);
          const i = (sy * width + sx) * 4;
          r += data[i] * weight; g += data[i + 1] * weight; b += data[i + 2] * weight;
          totalWeight += weight;
        }
      }
      const i = (y * width + x) * 4;
      out.data[i] = Math.round(r / totalWeight);
      out.data[i + 1] = Math.round(g / totalWeight);
      out.data[i + 2] = Math.round(b / totalWeight);
      out.data[i + 3] = 255;
    }
  return out;
}

export interface BloomSettings {
  threshold: number;
  radius: number;
  intensity: number;
}
export const DEFAULT_BLOOM: BloomSettings = { threshold: 200, radius: 3, intensity: 0.5 };

export function applyBloom(imageData: ImageData, s: BloomSettings): ImageData {
  const { width, height, data } = imageData;
  const out = new ImageData(new Uint8ClampedArray(data), width, height);
  const glow = new Uint8ClampedArray(data.length);
  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (lum > s.threshold) {
      glow[i] = data[i]; glow[i + 1] = data[i + 1]; glow[i + 2] = data[i + 2]; glow[i + 3] = 255;
    }
  }
  const rad = Math.max(1, Math.floor(s.radius));
  const blurData = new Uint8ClampedArray(data.length);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, count = 0;
      for (let dy = -rad; dy <= rad; dy++)
        for (let dx = -rad; dx <= rad; dx++) {
          const sx = x + dx, sy = y + dy;
          if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
            const i = (sy * width + sx) * 4;
            r += glow[i]; g += glow[i + 1]; b += glow[i + 2]; count++;
          }
        }
      const i = (y * width + x) * 4;
      blurData[i] = Math.round(r / count); blurData[i + 1] = Math.round(g / count); blurData[i + 2] = Math.round(b / count);
    }
  for (let i = 0; i < data.length; i += 4) {
    out.data[i] = Math.min(255, Math.round(data[i] + blurData[i] * s.intensity));
    out.data[i + 1] = Math.min(255, Math.round(data[i + 1] + blurData[i + 1] * s.intensity));
    out.data[i + 2] = Math.min(255, Math.round(data[i + 2] + blurData[i + 2] * s.intensity));
  }
  return out;
}

export interface EmbossSettings {
  strength: number;
  angle: number;
}
export const DEFAULT_EMBOSS: EmbossSettings = { strength: 2, angle: 135 };

export function applyEmboss(imageData: ImageData, s: EmbossSettings): ImageData {
  const { width, height, data } = imageData;
  const out = new ImageData(width, height);
  const rad = (s.angle * Math.PI) / 180;
  const kx = Math.cos(rad);
  const ky = Math.sin(rad);
  for (let y = 1; y < height - 1; y++)
    for (let x = 1; x < width - 1; x++) {
      const i = (y * width + x) * 4;
      const i1 = ((y + Math.round(ky)) * width + (x + Math.round(kx))) * 4;
      const i2 = ((y - Math.round(ky)) * width + (x - Math.round(kx))) * 4;
      const lum1 = 0.299 * data[i1] + 0.587 * data[i1 + 1] + 0.114 * data[i1 + 2];
      const lum2 = 0.299 * data[i2] + 0.587 * data[i2 + 1] + 0.114 * data[i2 + 2];
      let v = 128 + (lum1 - lum2) * s.strength;
      v = Math.max(0, Math.min(255, v));
      out.data[i] = v; out.data[i + 1] = v; out.data[i + 2] = v; out.data[i + 3] = 255;
    }
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      if (y === 0 || y === height - 1 || x === 0 || x === width - 1) {
        const i = (y * width + x) * 4;
        out.data[i] = 128; out.data[i + 1] = 128; out.data[i + 2] = 128; out.data[i + 3] = 255;
      }
    }
  return out;
}

export type EffectId = "pixelate" | "glitch" | "duotone" | "vignette" | "noise" | "kaleidoscope" | "ripple" | "halftone" | "ascii" | "receipt" | "motion-blur" | "radial-blur" | "crt" | "threshold" | "rgb-shift" | "motion-trail" | "bloom" | "emboss";

export interface EffectDef {
  id: EffectId;
  name: string;
  desc: string;
}

export const EFFECTS: EffectDef[] = [
  { id: "halftone", name: "Halftone", desc: "Dithering with threshold maps" },
  { id: "pixelate", name: "Pixelate", desc: "Mosaic block effect" },
  { id: "glitch", name: "Glitch", desc: "RGB channel corruption" },
  { id: "motion-blur", name: "Motion Blur", desc: "Directional blur" },
  { id: "radial-blur", name: "Radial Blur", desc: "Zoom & spin blur" },
  { id: "duotone", name: "Duotone", desc: "Two-color mapping" },
  { id: "threshold", name: "Threshold", desc: "High-contrast posterize" },
  { id: "bloom", name: "Bloom", desc: "Bright area glow" },
  { id: "emboss", name: "Emboss", desc: "3D relief effect" },
  { id: "crt", name: "CRT", desc: "Old monitor scanlines" },
  { id: "rgb-shift", name: "RGB Shift", desc: "Chromatic separation" },
  { id: "motion-trail", name: "Motion Trail", desc: "Directional afterimage" },
  { id: "vignette", name: "Vignette", desc: "Darken image edges" },
  { id: "noise", name: "Noise", desc: "Film grain texture" },
  { id: "kaleidoscope", name: "Kaleidoscope", desc: "Mirror tiling" },
  { id: "ripple", name: "Ripple", desc: "Wave distortion" },
  { id: "ascii", name: "ASCII", desc: "Character-based art" },
  { id: "receipt", name: "Receipt", desc: "Thermal paper scan" },
];
