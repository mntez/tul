export type FilmModuleId =
  | "source" | "developer" | "compression" | "expand" | "print"
  | "colorHead" | "vignette" | "grain" | "halation" | "bloom"
  | "damage" | "overscan" | "filmBreath" | "gateWeave";

export type FilmControlValue = number | boolean | string;
export type FilmModuleSettings = Record<string, FilmControlValue>;
export type FilmLookSettings = Record<FilmModuleId, FilmModuleSettings>;

export const DEFAULT_FILM_SETTINGS: FilmLookSettings = {
  source: { enabled: false, exposure: 0, temperature: 0, tint: 0, defringe: 0, defringeRadius: 50 },
  developer: { enabled: false, contrast: 0, gamma: 0, colorSeparation: 100, colorBoost: 0 },
  compression: { enabled: false, impact: 0, whitePoint: 100, tonalRange: 0, colorDensity: 0 },
  expand: { enabled: false, blackPoint: 0, whitePoint: 100, colorMode: "normal" },
  print: { enabled: false, profile: "linear", targetWhite: 0, exposure: 0, tonalContrast: 0, colorDensity: 0, saturation: 100, analogueRangeLimiter: false },
  colorHead: { enabled: false, yellowBlue: 0, magentaGreen: 0, cyanRed: 0, gang: false, shadowsTone: 0, midtonesTone: 0, highlightsTone: 0, preserveExposure: 0, impact: 0 },
  vignette: { enabled: false, exposure: 0, size: 50, feather: 100, aspectRatio: 0 },
  grain: { enabled: false, size: 23, amount: 0, resolution: 50, shadows: 25, midtones: 25, highlights: 25, color: 100, filmType: "positive", mode: "analogue" },
  halation: { enabled: false, maskMode: false, sourceLimiter: 80, backgroundGain: 50, smoothness: 7, localDiffusion: 13, globalDiffusion: 22, amplify: 34, hue: 61, blueCompensation: 14, impact: 0 },
  bloom: { enabled: false, maskMode: false, highlights: 30, sourceLimiter: 80, details: 90, diffusion: 48, amplify: 69, saveLights: 100, saturation: 100, impact: 0 },
  damage: { enabled: false, dustEnabled: true, dustAmount: 0, dustScale: 30, dustBalance: 50, scratchesEnabled: true, scratchesAmount: 0, scratchesScale: 30, scratchesBalance: 50, hairsEnabled: true, hairsAmount: 0, hairsScale: 30, hairsBalance: 50, totalAmount: 0, globalOpacity: 100, globalChromaticity: 100, seed: 1 },
  overscan: { enabled: false, gateType: "super35", gateShape: "normal", perforationMode: "negative", filmOrientation: "vertical", exposure: 0, scale: 0, lensZoom: 100, offsetX: 0, offsetY: 0, gateDefocus: 0 },
  filmBreath: { enabled: false, period: 3, length: 24, exposure: 10, contrast: 10, color: 10, impact: 100 },
  gateWeave: { enabled: false, autoZoom: true, period: 3, length: 24, scale: 0, translateX: 0, translateY: 0, angle: 0, translateXImpact: 10, translateYImpact: 10, rotateImpact: 5, impact: 100 },
};

const ENUMS: Partial<Record<FilmModuleId, Record<string, readonly string[]>>> = {
  expand: { colorMode: ["normal", "monochrome", "warm", "cool"] },
  print: { profile: ["linear", "print", "cineon"] },
  grain: { filmType: ["positive", "negative", "print"], mode: ["analogue", "digital"] },
  overscan: { gateType: ["super35", "academy", "full-frame", "super16"], gateShape: ["normal", "rounded", "anamorphic"], perforationMode: ["negative", "positive", "none"], filmOrientation: ["vertical", "horizontal"] },
  filmBreath: {}, gateWeave: {},
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseFilmSettings(value: unknown): FilmLookSettings {
  if (!isRecord(value)) return DEFAULT_FILM_SETTINGS;
  const parsed = structuredClone(DEFAULT_FILM_SETTINGS);
  for (const moduleId of Object.keys(DEFAULT_FILM_SETTINGS) as FilmModuleId[]) {
    const incoming = value[moduleId];
    if (!isRecord(incoming)) continue;
    for (const [key, fallback] of Object.entries(parsed[moduleId])) {
      const candidate = incoming[key];
      if (typeof fallback === "boolean") {
        if (typeof candidate === "boolean") parsed[moduleId][key] = candidate;
      } else if (typeof fallback === "number") {
        if (typeof candidate === "number" && Number.isFinite(candidate)) parsed[moduleId][key] = Math.max(-10000, Math.min(10000, candidate));
      } else if (typeof candidate === "string") {
        const options = ENUMS[moduleId]?.[key];
        if (!options || options.includes(candidate)) parsed[moduleId][key] = candidate;
      }
    }
  }
  return parsed;
}

export function patchFilmSettings(
  settings: FilmLookSettings,
  moduleId: FilmModuleId,
  patch: FilmModuleSettings,
): FilmLookSettings {
  return parseFilmSettings({ ...settings, [moduleId]: { ...settings[moduleId], ...patch } });
}

export function getProfileModuleId(family: string): FilmModuleId | null {
  if (family === "bloom" || family === "grain" || family === "halation" || family === "film_breath" || family === "gate_weave") return family === "film_breath" ? "filmBreath" : family === "gate_weave" ? "gateWeave" : family;
  if (family === "dirt" || family === "photo-dirt") return "damage";
  return null;
}

export function filmSettingsForProfile(current: FilmLookSettings, profile: { family: string; settings: Record<string, unknown> }): FilmLookSettings {
  const read = (source: unknown, path: string, fallback: number): number => {
    let cursor: unknown = source;
    for (const part of path.split(".")) cursor = isRecord(cursor) ? cursor[part] : undefined;
    if (typeof cursor === "string") {
      const embedded = /value\s*=\s*(-?\d+(?:\.\d+)?)/i.exec(cursor)?.[1];
      if (embedded) return Number(embedded);
    }
    if (typeof cursor === "string") {
      const embedded = /value\s*=\s*(-?\d+(?:\.\d+)?)/i.exec(cursor)?.[1];
      if (embedded) return Number(embedded);
    }
    const candidate = typeof cursor === "number" ? cursor : isRecord(cursor) ? cursor.value : undefined;
    return typeof candidate === "number" && Number.isFinite(candidate) ? candidate : fallback;
  };
  const next = structuredClone(current);
  if (profile.family === "bloom") {
    next.bloom = { ...next.bloom, enabled: true, sourceLimiter: read(profile.settings, "bloom.thresholds.upper_value", 80), highlights: read(profile.settings, "falloff", 40), details: read(profile.settings, "edges_mask.details_radius", 50), diffusion: read(profile.settings, "bloom.diffusion_amount", 60), amplify: read(profile.settings, "bloom.brightness_amplify", 50), saturation: read(profile.settings, "saturation", 100), impact: read(profile.settings, "impact", 50) };
  } else if (profile.family === "halation") {
    next.halation = { ...next.halation, enabled: true, sourceLimiter: read(profile.settings, "exposure.threshold", 78), backgroundGain: read(profile.settings, "opacity", 80), smoothness: read(profile.settings, "smoothness", 0), localDiffusion: read(profile.settings, "local_diffusion", 20), globalDiffusion: read(profile.settings, "global_diffusion", 30), amplify: read(profile.settings, "power", 50), hue: read(profile.settings, "hue", 50), blueCompensation: read(profile.settings, "blue_compensation", 0), impact: 50 };
  } else if (profile.family === "grain") {
    next.grain = { ...next.grain, enabled: true, size: read(profile.settings, "scale", 23), amount: read(profile.settings, "amount", 25), resolution: read(profile.settings, "resolution_factor", 50), shadows: read(profile.settings, "shadows", 25), midtones: read(profile.settings, "midtones", 25), highlights: read(profile.settings, "highlights", 25), color: read(profile.settings, "color", 100), filmType: read(profile.settings, "type", 0) === 0 ? "positive" : "negative", mode: profile.settings.is_clustered === true ? "analogue" : "digital" };
  } else if (profile.family === "dirt" || profile.family === "photo-dirt") {
    const damageTypes = Array.isArray(profile.settings.damage_types) ? profile.settings.damage_types.filter(isRecord) : [];
    const damageOf = (id: string, key: string, fallback: number) => {
      const found = damageTypes.find((item) => item.id === id);
      return found ? read(found, key, fallback) : fallback;
    };
    next.damage = { ...next.damage, enabled: true, dustAmount: damageOf("dust", "amount", 0), dustScale: damageOf("dust", "scale", 30), dustBalance: damageOf("dust", "size_balance", 50), scratchesAmount: damageOf("scratches", "amount", 0), scratchesScale: damageOf("scratches", "scale", 30), scratchesBalance: damageOf("scratches", "size_balance", 50), hairsAmount: damageOf("hairs", "amount", 0), hairsScale: damageOf("hairs", "scale", 30), hairsBalance: damageOf("hairs", "size_balance", 50), totalAmount: read(profile.settings, "total_amount", 0), globalOpacity: read(profile.settings, "opacity", 100), globalChromaticity: read(profile.settings, "chromaticity", 100) };
  } else if (profile.family === "film_breath") {
    next.filmBreath = { ...next.filmBreath, enabled: true, period: read(profile.settings, "period", 3), length: read(profile.settings, "length", 24), exposure: read(profile.settings, "exposure.impact", 10), contrast: read(profile.settings, "contrast.impact", 10), color: read(profile.settings, "color.impact", 10), impact: read(profile.settings, "impact", 100) };
  } else if (profile.family === "gate_weave") {
    next.gateWeave = { ...next.gateWeave, enabled: true, autoZoom: profile.settings.auto_zoom !== false, period: read(profile.settings, "period", 3), length: read(profile.settings, "length", 24), scale: read(profile.settings, "scale", 1), translateX: read(profile.settings, "translate_x", 0), translateY: read(profile.settings, "translate_y", 0), angle: read(profile.settings, "angle", 0), translateXImpact: read(profile.settings, "translate_curve_x.impact", 10), translateYImpact: read(profile.settings, "translate_curve_y.impact", 10), rotateImpact: read(profile.settings, "rotate.impact", 5), impact: read(profile.settings, "impact", 100) };
  }
  return parseFilmSettings(next);
}

