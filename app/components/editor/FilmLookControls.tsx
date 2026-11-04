"use client";

import { DEFAULT_FILM_SETTINGS, type FilmControlValue, type FilmLookSettings, type FilmModuleId } from "../../film-settings";
import { RangeValueControl } from "./EffectControls";

type Control = { key: string; label: string; min?: number; max?: number; step?: number; options?: { value: string; label: string }[]; type?: "range" | "toggle" };
type Module = { id: FilmModuleId; title: string; controls: Control[] };

const modules: Module[] = [
  { id: "source", title: "Source", controls: [
    { key: "exposure", label: "Exposure Compensation", min: -100, max: 100, step: 1 },
    { key: "temperature", label: "Temperature Comp.", min: -100, max: 100, step: 1 },
    { key: "tint", label: "Tint Comp.", min: -100, max: 100, step: 1 },
    { key: "defringe", label: "Defringe", min: 0, max: 100, step: 1 },
    { key: "defringeRadius", label: "Defringe Radius", min: 0, max: 100, step: 1 },
  ] },
  { id: "developer", title: "Film Developer", controls: [
    { key: "contrast", label: "Contrast Boost", min: -100, max: 100, step: 1 },
    { key: "gamma", label: "Gamma Correction", min: -100, max: 100, step: 1 },
    { key: "colorSeparation", label: "Color Separation", min: 0, max: 200, step: 1 },
    { key: "colorBoost", label: "Color Boost", min: -100, max: 100, step: 1 },
  ] },
  { id: "compression", title: "Film Compression", controls: [
    { key: "impact", label: "Impact", min: 0, max: 100, step: 0.1 },
    { key: "whitePoint", label: "White Point", min: 50, max: 120, step: 0.1 },
    { key: "tonalRange", label: "Tonal Range", min: 0, max: 100, step: 0.1 },
    { key: "colorDensity", label: "Color Density", min: 0, max: 100, step: 0.1 },
  ] },
  { id: "expand", title: "Expand", controls: [
    { key: "blackPoint", label: "Black Point", min: -20, max: 30, step: 0.01 },
    { key: "whitePoint", label: "White Point", min: 30, max: 120, step: 0.1 },
    { key: "colorMode", label: "Color mode", options: [{ value: "normal", label: "Normal" }, { value: "monochrome", label: "Monochrome" }, { value: "warm", label: "Warm" }, { value: "cool", label: "Cool" }] },
  ] },
  { id: "print", title: "Print", controls: [
    { key: "profile", label: "Profile", options: [{ value: "linear", label: "Linear" }, { value: "print", label: "Print" }, { value: "cineon", label: "Cineon" }] },
    { key: "targetWhite", label: "Target White", min: -100, max: 100, step: 0.1 },
    { key: "exposure", label: "Exposure", min: -100, max: 100, step: 0.01 },
    { key: "tonalContrast", label: "Tonal Contrast", min: -50, max: 50, step: 0.1 },
    { key: "colorDensity", label: "Color Density", min: -100, max: 100, step: 0.1 },
    { key: "saturation", label: "Saturation", min: 0, max: 200, step: 0.1 },
    { key: "analogueRangeLimiter", label: "Analogue Range Limiter", type: "toggle" },
  ] },
  { id: "colorHead", title: "Color Head", controls: [
    { key: "yellowBlue", label: "Yellow - Blue", min: -50, max: 50, step: 0.01 },
    { key: "magentaGreen", label: "Magenta - Green", min: -50, max: 50, step: 0.01 },
    { key: "cyanRed", label: "Cyan - Red", min: -50, max: 50, step: 0.01 },
    { key: "gang", label: "Gang", type: "toggle" },
    { key: "shadowsTone", label: "Shadows Tone", min: -100, max: 100, step: 0.1 },
    { key: "midtonesTone", label: "Midtones Tone", min: -100, max: 100, step: 0.1 },
    { key: "highlightsTone", label: "Highlights Tone", min: -100, max: 100, step: 0.1 },
    { key: "preserveExposure", label: "Preserve Exposure", min: 0, max: 100, step: 0.1 },
    { key: "impact", label: "Impact", min: 0, max: 100, step: 0.1 },
  ] },
  { id: "vignette", title: "Vignette", controls: [
    { key: "exposure", label: "Exposure", min: -2, max: 2, step: 0.01 },
    { key: "size", label: "Size", min: 0, max: 100, step: 0.1 },
    { key: "feather", label: "Feather", min: 0, max: 100, step: 0.1 },
    { key: "aspectRatio", label: "Aspect Ratio", min: -100, max: 100, step: 0.1 },
  ] },
  { id: "grain", title: "Film Grain", controls: [
    { key: "size", label: "Size", min: 0, max: 100, step: 0.1 },
    { key: "amount", label: "Amount", min: 0, max: 100, step: 0.1 },
    { key: "resolution", label: "Resolution", min: 0, max: 100, step: 0.1 },
    { key: "shadows", label: "Shadows", min: 0, max: 100, step: 0.1 },
    { key: "midtones", label: "Midtones", min: 0, max: 100, step: 0.1 },
    { key: "highlights", label: "Highlights", min: 0, max: 100, step: 0.1 },
    { key: "color", label: "Color", min: 0, max: 100, step: 0.1 },
    { key: "filmType", label: "Film Type", options: [{ value: "positive", label: "Positive" }, { value: "negative", label: "Negative" }, { value: "print", label: "Print" }] },
    { key: "mode", label: "Mode", options: [{ value: "analogue", label: "Analogue" }, { value: "digital", label: "Digital" }] },
  ] },
  { id: "halation", title: "Halation", controls: [
    { key: "maskMode", label: "Mask Mode", type: "toggle" },
    { key: "sourceLimiter", label: "Source Limiter", min: 0, max: 100, step: 0.1 },
    { key: "backgroundGain", label: "Background Gain", min: 0, max: 100, step: 0.1 },
    { key: "smoothness", label: "Smoothness", min: 0, max: 100, step: 0.1 },
    { key: "localDiffusion", label: "Local Diffusion", min: 0, max: 100, step: 0.1 },
    { key: "globalDiffusion", label: "Global Diffusion", min: 0, max: 100, step: 0.1 },
    { key: "amplify", label: "Amplify", min: 0, max: 100, step: 0.1 },
    { key: "hue", label: "Hue", min: 0, max: 100, step: 0.1 },
    { key: "blueCompensation", label: "Blue Comp.", min: 0, max: 100, step: 0.1 },
    { key: "impact", label: "Impact", min: 0, max: 100, step: 0.1 },
  ] },
  { id: "bloom", title: "Bloom", controls: [
    { key: "maskMode", label: "Mask Mode", type: "toggle" },
    { key: "highlights", label: "Highlights", min: 0, max: 100, step: 0.1 },
    { key: "sourceLimiter", label: "Source Limiter", min: 0, max: 100, step: 0.1 },
    { key: "details", label: "Details", min: 0, max: 100, step: 0.1 },
    { key: "diffusion", label: "Diffusion", min: 0, max: 100, step: 0.1 },
    { key: "amplify", label: "Amplify", min: 0, max: 100, step: 0.1 },
    { key: "saveLights", label: "Save Lights", min: 0, max: 100, step: 0.1 },
    { key: "saturation", label: "Saturation", min: 0, max: 200, step: 0.1 },
    { key: "impact", label: "Impact", min: 0, max: 100, step: 0.1 },
  ] },
  { id: "damage", title: "Film Damage", controls: [
    { key: "dustEnabled", label: "Dust Enabled", type: "toggle" }, { key: "dustAmount", label: "Dust Amount", min: 0, max: 128, step: 1 }, { key: "dustScale", label: "Dust Scale", min: 0, max: 100, step: 0.1 }, { key: "dustBalance", label: "Dust Size Balance", min: 0, max: 100, step: 0.1 },
    { key: "scratchesEnabled", label: "Scratches Enabled", type: "toggle" }, { key: "scratchesAmount", label: "Scratches Amount", min: 0, max: 128, step: 1 }, { key: "scratchesScale", label: "Scratches Scale", min: 0, max: 100, step: 0.1 }, { key: "scratchesBalance", label: "Scratches Size Balance", min: 0, max: 100, step: 0.1 },
    { key: "hairsEnabled", label: "Hairs Enabled", type: "toggle" }, { key: "hairsAmount", label: "Hairs Amount", min: 0, max: 128, step: 1 }, { key: "hairsScale", label: "Hairs Scale", min: 0, max: 100, step: 0.1 }, { key: "hairsBalance", label: "Hairs Size Balance", min: 0, max: 100, step: 0.1 },
    { key: "totalAmount", label: "Total Amount", min: -50, max: 50, step: 0.1 }, { key: "globalOpacity", label: "Global Opacity", min: 0, max: 100, step: 0.1 }, { key: "globalChromaticity", label: "Global Chromaticity", min: 0, max: 100, step: 0.1 }, { key: "seed", label: "Refresh Seed", min: 1, max: 999999, step: 1 },
  ] },
  { id: "overscan", title: "Overscan", controls: [
    { key: "gateType", label: "Gate Type", options: [{ value: "super35", label: "Super 35mm 1.37:1" }, { value: "academy", label: "Academy" }, { value: "full-frame", label: "Full Frame" }, { value: "super16", label: "Super 16mm" }] },
    { key: "gateShape", label: "Gate Shape", options: [{ value: "normal", label: "Neat Normal" }, { value: "rounded", label: "Rounded" }, { value: "anamorphic", label: "Anamorphic" }] },
    { key: "perforationMode", label: "Perforation Mode", options: [{ value: "negative", label: "Negative" }, { value: "positive", label: "Positive" }, { value: "none", label: "None" }] },
    { key: "filmOrientation", label: "Film Orientation", options: [{ value: "vertical", label: "Vertical" }, { value: "horizontal", label: "Horizontal" }] },
    { key: "exposure", label: "Exposure", min: -5, max: 5, step: 0.01 }, { key: "scale", label: "Scale", min: 0, max: 100, step: 0.1 }, { key: "lensZoom", label: "Lens Zoom", min: 0, max: 200, step: 0.1 },
    { key: "offsetX", label: "Offset X", min: -100, max: 100, step: 0.1 }, { key: "offsetY", label: "Offset Y", min: -100, max: 100, step: 0.1 }, { key: "gateDefocus", label: "Gate Defocus", min: 0, max: 100, step: 0.1 },
  ] },
  { id: "filmBreath", title: "Film Breath", controls: [
    { key: "period", label: "Period", min: 1, max: 120, step: 1 }, { key: "length", label: "Length", min: 1, max: 240, step: 1 },
    { key: "exposure", label: "Exposure Impact", min: 0, max: 100, step: 0.1 }, { key: "contrast", label: "Contrast Impact", min: 0, max: 100, step: 0.1 },
    { key: "color", label: "Color Impact", min: 0, max: 100, step: 0.1 }, { key: "impact", label: "Impact", min: 0, max: 100, step: 0.1 },
  ] },
  { id: "gateWeave", title: "Gate Weave", controls: [
    { key: "autoZoom", label: "Auto Zoom", type: "toggle" }, { key: "period", label: "Period", min: 1, max: 120, step: 1 }, { key: "length", label: "Length", min: 1, max: 240, step: 1 },
    { key: "scale", label: "Scale", min: 0, max: 2, step: 0.01 }, { key: "translateX", label: "Translate X", min: -100, max: 100, step: 0.1 }, { key: "translateY", label: "Translate Y", min: -100, max: 100, step: 0.1 },
    { key: "angle", label: "Angle", min: -10, max: 10, step: 0.01 }, { key: "translateXImpact", label: "X Motion Impact", min: 0, max: 100, step: 0.1 }, { key: "translateYImpact", label: "Y Motion Impact", min: 0, max: 100, step: 0.1 },
    { key: "rotateImpact", label: "Rotation Impact", min: 0, max: 100, step: 0.1 }, { key: "impact", label: "Impact", min: 0, max: 100, step: 0.1 },
  ] },
];

interface Props { settings: FilmLookSettings; onChange: (settings: FilmLookSettings) => void; }

export default function FilmLookControls({ settings, onChange }: Props) {
  const update = (module: FilmModuleId, key: string, value: FilmControlValue) => onChange({ ...settings, [module]: { ...settings[module], [key]: value } });
  return <div className="film-module-controls">
    {modules.map((module, index) => {
      const values = settings[module.id];
      const active = values.enabled === true;
      return <details key={module.id} className="film-module" open={index === 0}>
        <summary>
          <span className="film-module-title">{module.title}</span>
          <span className="film-module-status">{active ? "Active" : "Off"}</span>
          <input type="checkbox" checked={active} aria-label={`Enable ${module.title}`} onClick={(event) => event.stopPropagation()} onChange={(event) => update(module.id, "enabled", event.currentTarget.checked)} />
        </summary>
        <div className={`film-module-body ${active ? "" : "is-disabled"}`}>
          {module.controls.map((control) => {
            const current = values[control.key];
            return <div className="film-module-control" key={control.key}>
              <span className="film-module-label">{control.label}</span>
              {control.type === "toggle" ? <label className="film-control-toggle"><input type="checkbox" checked={current === true} disabled={!active} onChange={(event) => update(module.id, control.key, event.currentTarget.checked)} /><span>{current === true ? "On" : "Off"}</span></label>
                : control.options ? <select value={typeof current === "string" ? current : control.options[0].value} disabled={!active} aria-label={control.label} onChange={(event) => update(module.id, control.key, event.currentTarget.value)}>{control.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                : typeof current === "number" ? <RangeValueControl label={control.label} min={control.min ?? 0} max={control.max ?? 100} step={control.step ?? 1} value={current} disabled={!active} onChange={(next) => update(module.id, control.key, next)} /> : null}
            </div>;
          })}
          <button type="button" className="film-module-reset" onClick={() => onChange({ ...settings, [module.id]: { ...DEFAULT_FILM_SETTINGS[module.id] } })}>Reset module</button>
        </div>
      </details>;
    })}
  </div>;
}
