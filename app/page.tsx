"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { UserButton, useUser } from "@clerk/nextjs";
import InteractiveLines from "./interactive-lines";
import { ImageWithSkeleton, Spinner, FadeIn } from "./animations";
import {
  applyPixelate, DEFAULT_PIXELATE,
  applyGlitch, DEFAULT_GLITCH,
  applyDuotone, DEFAULT_DUOTONE, DuotoneSettings,
  applyVignette, DEFAULT_VIGNETTE,
  applyNoise, DEFAULT_NOISE,
  applyKaleidoscope, DEFAULT_KALEIDOSCOPE,
  applyRipple, DEFAULT_RIPPLE,
  applyASCII, DEFAULT_ASCII,
  applyReceipt, DEFAULT_RECEIPT,
  applyMotionBlur, DEFAULT_MOTION_BLUR,
  applyRadialBlur, DEFAULT_RADIAL_BLUR,
  applyCRT, DEFAULT_CRT,
  applyThreshold, DEFAULT_THRESHOLD,
  applyRGBShift, DEFAULT_RGB_SHIFT,
  applyMotionTrail, DEFAULT_MOTION_TRAIL,
  applyBloom, DEFAULT_BLOOM,
  applyEmboss, DEFAULT_EMBOSS,
  EFFECTS, EffectId, ASCII_CHARSET_OPTIONS,
} from "./effects";
import { applyHalftone, DEFAULT_HALFTONE_SETTINGS, HalftoneSettings, HALFTONE_MAP_OPTIONS } from "./halftone";
import { parseStoredProfileLayers, PROFILE_BY_ID, PROFILE_CATALOG, PROFILE_GROUPS } from "./profile-catalog";
import { applyFilmProfile } from "./profile-effects";
import type { EffectLayer, SavedPreset, CurrentImage, ScreenId } from "./types";
import AuthCard from "./components/auth/AuthCard";
import EffectSliderControls, { RangeValueControl } from "./components/editor/EffectControls";
import FilmLookControls from "./components/editor/FilmLookControls";
import { DEFAULT_FILM_SETTINGS, filmSettingsForProfile, getProfileModuleId, parseFilmSettings, type FilmLookSettings, type FilmModuleId } from "./film-settings";
import { applyFilmLook } from "./film-processing";

export default function Home() {
  const [screen, setScreen] = useState<ScreenId>("onboarding");
  const { isLoaded: userLoaded, isSignedIn: clerkSignedIn } = useUser();
  const isSignedIn = userLoaded && !!clerkSignedIn;

  useEffect(() => {
    if (userLoaded && clerkSignedIn) {
      setScreen((s) => s === "onboarding" ? "home" : s);
    }
  }, [userLoaded, clerkSignedIn]);
  const [guestMode, setGuestMode] = useState(false);
  const [currentImage, setCurrentImage] = useState<CurrentImage | null>(null);
  const [layers, setLayers] = useState<EffectLayer[]>([]);
  const [compare, setCompare] = useState<"edited" | "original">("edited");
  const [showExport, setShowExport] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedEffectId, setSelectedEffectId] = useState<EffectId | null>(null);
  const [savedPresets, setSavedPresets] = useState<SavedPreset[]>([]);
  const [filmSettings, setFilmSettings] = useState<FilmLookSettings>(DEFAULT_FILM_SETTINGS);
  const [presetNameInput, setPresetNameInput] = useState("");
  const [activeEffects, setActiveEffects] = useState<EffectId[]>([]);
  const [effectSettings, setEffectSettings] = useState<Record<string, any>>({});
  const [effectResultSrc, setEffectResultSrc] = useState<string | null>(null);
  const activeProfileLayers = useMemo(() => layers.filter((layer) => layer.enabled && PROFILE_BY_ID.has(layer.presetId)), [layers]);
  const hasEnabledFilmModules = useMemo(() => Object.values(filmSettings).some((module) => module.enabled === true), [filmSettings]);
  const [processing, setProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [exportFormat, setExportFormat] = useState("jpeg");
  const [exportQuality, setExportQuality] = useState(92);
  const [fileSize, setFileSize] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [panning, setPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);
  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 });
  const storageHydrationGuard = useRef(false);

  const zoomToFit = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp || !imgNatural.w) return;
    const r = vp.getBoundingClientRect();
    const f = Math.min(r.width / imgNatural.w, r.height / imgNatural.h) * 0.95;
    setZoom(f);
    setPanX((r.width - imgNatural.w * f) / 2);
    setPanY((r.height - imgNatural.h * f) / 2);
  }, [imgNatural]);

  const zoomIn = useCallback(() => {
    const levels = [-1, 0.1, 0.25, 0.33, 0.5, 0.75, 1, 1.5, 2, 3, 4, 6, 8];
    setZoom((z) => { for (const l of levels) if (l > z) return l; return z; });
  }, []);

  const zoomOut = useCallback(() => {
    const levels = [-1, 0.1, 0.25, 0.33, 0.5, 0.75, 1, 1.5, 2, 3, 4, 6, 8];
    setZoom((z) => { for (let i = levels.length - 1; i >= 0; i--) if (levels[i] < z && levels[i] > 0) return levels[i]; return 0.1; });
  }, []);

  const zoomOneToOne = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const r = vp.getBoundingClientRect();
    setZoom(1);
    setPanX((r.width - imgNatural.w) / 2);
    setPanY((r.height - imgNatural.h) / 2);
  }, [imgNatural]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) zoomIn(); else zoomOut();
  }, [zoomIn, zoomOut]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setPanning(true);
    setPanStart({ x: e.clientX - panX, y: e.clientY - panY });
  }, [panX, panY]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!panning) return;
    setPanX(e.clientX - panStart.x);
    setPanY(e.clientY - panStart.y);
  }, [panning, panStart]);

  const handleMouseUp = useCallback(() => { setPanning(false); }, []);
  const layersRef = useRef(layers);
  useEffect(() => { layersRef.current = layers; }, [layers]);
  const [undoStack, setUndoStack] = useState<EffectLayer[][]>([]);
  const [redoStack, setRedoStack] = useState<EffectLayer[][]>([]);

  const pushHistory = useCallback(() => {
    setUndoStack((prev) => [...prev.slice(-49), layersRef.current]);
    setRedoStack([]);
  }, []);

  const undo = useCallback(() => {
    const prev = undoStack[undoStack.length - 1];
    if (!prev) return;
    setUndoStack((s) => s.slice(0, -1));
    setRedoStack((s) => [...s, layersRef.current]);
    setLayers(prev);
  }, [undoStack]);

  const redo = useCallback(() => {
    const next = redoStack[redoStack.length - 1];
    if (!next) return;
    setRedoStack((s) => s.slice(0, -1));
    setUndoStack((s) => [...s, layersRef.current]);
    setLayers(next);
  }, [redoStack]);

  const EFFECT_DEFAULTS: Record<string, any> = {
    halftone: DEFAULT_HALFTONE_SETTINGS,
    pixelate: DEFAULT_PIXELATE,
    glitch: DEFAULT_GLITCH,
    duotone: DEFAULT_DUOTONE,
    vignette: DEFAULT_VIGNETTE,
    noise: DEFAULT_NOISE,
    kaleidoscope: DEFAULT_KALEIDOSCOPE,
    ripple: DEFAULT_RIPPLE,
    ascii: DEFAULT_ASCII,
    receipt: DEFAULT_RECEIPT,
    "motion-blur": DEFAULT_MOTION_BLUR,
    "radial-blur": DEFAULT_RADIAL_BLUR,
    crt: DEFAULT_CRT,
    threshold: DEFAULT_THRESHOLD,
    "rgb-shift": DEFAULT_RGB_SHIFT,
    "motion-trail": DEFAULT_MOTION_TRAIL,
    bloom: DEFAULT_BLOOM,
    emboss: DEFAULT_EMBOSS,
  };

  const isEffectActive = useCallback((id: EffectId) => activeEffects.includes(id), [activeEffects]);

  const toggleEffect = useCallback((id: EffectId) => {
    setActiveEffects((prev) => {
      const on = prev.includes(id);
      if (on) return prev.filter((e) => e !== id);
      if (!effectSettings[id]) {
        setEffectSettings((s) => ({ ...s, [id]: EFFECT_DEFAULTS[id] }));
      }
      return [...prev, id];
    });
  }, [effectSettings]);

  const getEffectSettings = useCallback(function(id: string, defaults: any) {
    return effectSettings[id] ?? defaults;
  }, [effectSettings]);

  const updateEffectSettings = useCallback((id: string, patch: Record<string, any>) => {
    setEffectSettings((prev) => ({ ...prev, [id]: { ...(prev[id] ?? {}), ...patch } }));
  }, []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showScreen = useCallback((id: ScreenId) => {
    setScreen(id);
  }, []);

  useEffect(() => {
    if (isSignedIn && screen === "auth") showScreen("home");
  }, [isSignedIn, screen, showScreen]);

  useEffect(() => {
    if (isSignedIn && guestMode) setGuestMode(false);
  }, [isSignedIn, guestMode]);

  // Redirect to auth if not signed in on protected screens
  useEffect(() => {
    if (!isSignedIn && !guestMode && (screen === "home" || screen === "editor")) showScreen("auth");
  }, [isSignedIn, guestMode, screen, showScreen]);

  // Load persisted state on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("tul_state");
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          const state = parsed as Record<string, unknown>;
          if (state.guestMode === true) setGuestMode(true);
          if (Array.isArray(state.layers)) setLayers(parseStoredProfileLayers(state.layers));
          if (state.filmSettings) setFilmSettings(parseFilmSettings(state.filmSettings));
          if (Array.isArray(state.savedPresets)) {
            const restored = state.savedPresets.flatMap((item: unknown): SavedPreset[] => {
              if (!item || typeof item !== "object") return [];
              const record = item as Record<string, unknown>;
              if (typeof record.id !== "string" || typeof record.name !== "string" || !Array.isArray(record.layers)) return [];
              const validLayers = record.layers.flatMap((entry: unknown) => {
                if (!entry || typeof entry !== "object") return [];
                const layer = entry as Record<string, unknown>;
                if (typeof layer.presetId !== "string" || typeof layer.intensity !== "number" || !Number.isFinite(layer.intensity) || !PROFILE_BY_ID.has(layer.presetId)) return [];
                return [{ presetId: layer.presetId, intensity: Math.max(0, Math.min(100, layer.intensity)) }];
              });
              return validLayers.length || record.filmSettings
                ? [{ id: record.id, name: record.name, layers: validLayers, filmSettings: parseFilmSettings(record.filmSettings) }]
                : [];
            });
            setSavedPresets(restored);
          }
        }
      }
    } catch {}
  }, []);

  // Persist state changes
  useEffect(() => {
    if (!storageHydrationGuard.current) {
      storageHydrationGuard.current = true;
      return;
    }
    try {
      localStorage.setItem("tul_state", JSON.stringify({
        guestMode,
        layers,
        filmSettings,
        savedPresets,
      }));
    } catch {}
  }, [guestMode, layers, filmSettings, savedPresets]);

  const loadImageFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    setFileSize(file.size);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCurrentImage({ src: ev.target?.result as string, name: file.name });
      setLayers([]);
      setCompare("edited");
      setImgNatural({ w: 0, h: 0 });
      showScreen("editor");
    };
    reader.readAsDataURL(file);
  }, [showScreen]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    loadImageFile(file);
    e.target.value = "";
  }, [loadImageFile]);

  const handleFileDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) loadImageFile(file);
  }, [loadImageFile]);

  const saveCurrentAsPreset = useCallback(() => {
    const enabled = layers.filter((l) => l.enabled);
    if (enabled.length === 0 && !hasEnabledFilmModules) { alert("Enable a film module or apply a profile first."); return; }
    const name = presetNameInput.trim() || "Preset " + (savedPresets.length + 1);
    setSavedPresets((prev) => [...prev, { id: "saved_" + Date.now(), name, layers: enabled.map((l) => ({ presetId: l.presetId, intensity: l.intensity })), filmSettings }]);
    setPresetNameInput("");
  }, [layers, savedPresets.length, presetNameInput, filmSettings, hasEnabledFilmModules]);

  const deleteSavedPreset = useCallback((id: string) => {
    setSavedPresets((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const applySavedPreset = useCallback((preset: SavedPreset) => {
    const profileLayers = parseStoredProfileLayers(preset.layers.map((layer, index) => ({
      ...layer,
      id: `saved-${preset.id}-${Date.now()}-${index}-${Math.random()}`,
      enabled: true,
      locked: false,
    })));
    if (preset.filmSettings) setFilmSettings(parseFilmSettings(preset.filmSettings));
    if (profileLayers.length > 0) {
      pushHistory();
      setLayers((prev) => [...prev, ...profileLayers]);
    }
  }, [pushHistory]);

  const applySingleEffect = useCallback((id: EffectId, imageData: ImageData) => {
    const s = getEffectSettings(id, EFFECT_DEFAULTS[id]);
    switch (id) {
      case "halftone": return applyHalftone(imageData, s);
      case "pixelate": return applyPixelate(imageData, s);
      case "glitch": return applyGlitch(imageData, s);
      case "duotone": return applyDuotone(imageData, s);
      case "vignette": return applyVignette(imageData, s);
      case "noise": return applyNoise(imageData, s);
      case "kaleidoscope": return applyKaleidoscope(imageData, s);
      case "ripple": return applyRipple(imageData, s);
      case "ascii": return applyASCII(imageData, s);
      case "receipt": return applyReceipt(imageData, s);
      case "motion-blur": return applyMotionBlur(imageData, s);
      case "radial-blur": return applyRadialBlur(imageData, s);
      case "crt": return applyCRT(imageData, s);
      case "threshold": return applyThreshold(imageData, s);
      case "rgb-shift": return applyRGBShift(imageData, s);
      case "motion-trail": return applyMotionTrail(imageData, s);
      case "bloom": return applyBloom(imageData, s);
      case "emboss": return applyEmboss(imageData, s);
    }
  }, [getEffectSettings]);

  const chainEffects = useCallback((imageData: ImageData, ids: EffectId[], profileLayers: EffectLayer[], settings: FilmLookSettings) => {
    let data = imageData;
    const profileIntensities: Partial<Record<FilmModuleId, number>> = {};
    for (const id of ids) {
      const r = applySingleEffect(id, data);
      if (r) data = r;
    }
    for (const layer of profileLayers) {
      const profile = PROFILE_BY_ID.get(layer.presetId);
      if (!profile) continue;
      const familyModule = getProfileModuleId(profile.family);
      if (familyModule && settings[familyModule].enabled === true) {
        const previous = profileIntensities[familyModule] ?? 0;
        const amount = Math.max(0, Math.min(100, layer.intensity)) / 100;
        profileIntensities[familyModule] = 1 - (1 - previous) * (1 - amount);
        continue;
      }
      data = applyFilmProfile(data, profile, layer.intensity);
    }
    return applyFilmLook(data, settings, profileIntensities);
  }, [applySingleEffect]);

  useEffect(() => {
    if (!currentImage || (activeEffects.length === 0 && activeProfileLayers.length === 0 && !hasEnabledFilmModules)) { setEffectResultSrc(null); setProcessing(false); return; }
    setProcessing(true);
    let cancelled = false;
    let profileWorker: Worker | null = null;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, c.width, c.height);
      const finish = (result: ImageData) => {
        if (cancelled) return;
        ctx.putImageData(result, 0, 0);
        setEffectResultSrc(c.toDataURL());
        setProcessing(false);
        profileWorker?.terminate();
        profileWorker = null;
      };
      if (activeProfileLayers.length === 0 && !hasEnabledFilmModules) {
        finish(chainEffects(imageData, activeEffects, [], filmSettings));
        return;
      }
      const base = chainEffects(imageData, activeEffects, [], DEFAULT_FILM_SETTINGS);
      try {
        profileWorker = new Worker(new URL("./profile-worker.ts", import.meta.url), { type: "module" });
        profileWorker.onmessage = (event: MessageEvent<{ data: ArrayBuffer; width: number; height: number }>) => {
          const result = event.data;
          if (!(result.data instanceof ArrayBuffer) || result.data.byteLength !== result.width * result.height * 4) {
            finish(chainEffects(imageData, activeEffects, activeProfileLayers, filmSettings));
            return;
          }
          finish(new ImageData(new Uint8ClampedArray(result.data), result.width, result.height));
        };
        profileWorker.onerror = () => finish(chainEffects(imageData, activeEffects, activeProfileLayers, filmSettings));
        const input = new Uint8ClampedArray(base.data);
        profileWorker.postMessage({
          data: input.buffer,
          width: base.width,
          height: base.height,
          layers: activeProfileLayers.map(({ presetId, intensity }) => ({ presetId, intensity })),
          settings: filmSettings,
        }, [input.buffer]);
      } catch {
        finish(chainEffects(imageData, activeEffects, activeProfileLayers, filmSettings));
      }
    };
    img.onerror = () => { if (!cancelled) { setEffectResultSrc(null); setProcessing(false); } };
    img.src = currentImage.src;
    return () => { cancelled = true; profileWorker?.terminate(); };
  }, [currentImage, activeEffects, activeProfileLayers, effectSettings, filmSettings, hasEnabledFilmModules, chainEffects]);

  const addLayer = useCallback((presetId: string) => {
    const profile = PROFILE_BY_ID.get(presetId);
    if (!profile) return;
    pushHistory();
    setFilmSettings((current) => filmSettingsForProfile(current, profile));
    setLayers((prev) => [
      ...prev,
      { id: Date.now().toString(), presetId, intensity: 100, enabled: true, locked: false },
    ]);
  }, [pushHistory]);

  const removeLayer = useCallback((id: string) => {
    pushHistory();
    setLayers((prev) => prev.filter((l) => l.id !== id));
  }, [pushHistory]);

  const updateLayerIntensity = useCallback((id: string, intensity: number) => {
    pushHistory();
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, intensity } : l)));
  }, [pushHistory]);

  const toggleLayer = useCallback((id: string) => {
    pushHistory();
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, enabled: !l.enabled } : l)));
  }, [pushHistory]);

  const toggleLayerLock = useCallback((id: string) => {
    pushHistory();
    setLayers((prev) => prev.map((layer) => (
      layer.id === id ? { ...layer, locked: !layer.locked } : layer
    )));
  }, [pushHistory]);

  const moveLayer = useCallback((id: string, dir: "up" | "down") => {
    const currentIndex = layers.findIndex((layer) => layer.id === id);
    const nextIndex = dir === "up" ? currentIndex - 1 : currentIndex + 1;
    if (
      currentIndex < 0 ||
      layers[currentIndex].locked ||
      nextIndex < 0 ||
      nextIndex >= layers.length ||
      layers[nextIndex].locked
    ) return;

    pushHistory();
    setLayers((prev) => {
      const idx = prev.findIndex((l) => l.id === id);
      if (idx === -1 || prev[idx].locked) return prev;
      const next = dir === "up" ? idx - 1 : idx + 1;
      if (next < 0 || next >= prev.length || prev[next].locked) return prev;
      const arr = [...prev];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr;
    });
  }, [layers, pushHistory]);

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const dragPushedRef = useRef(false);

  const handleDragStart = useCallback((event: React.DragEvent<HTMLDivElement>, index: number) => {
    if (layers[index]?.locked) {
      event.preventDefault();
      return;
    }
    setDragIndex(index);
    dragPushedRef.current = false;
  }, [layers]);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    if (dragIndex === null || dragIndex === index) return;
    const firstIndex = Math.min(dragIndex, index);
    const lastIndex = Math.max(dragIndex, index);
    if (layers.slice(firstIndex, lastIndex + 1).some((layer) => layer.locked)) return;

    e.preventDefault();
    if (!dragPushedRef.current) { dragPushedRef.current = true; pushHistory(); }
    setLayers((prev) => {
      if (prev[dragIndex]?.locked || prev[index]?.locked) return prev;
      if (prev.slice(firstIndex, lastIndex + 1).some((layer) => layer.locked)) return prev;
      const arr = [...prev];
      const [removed] = arr.splice(dragIndex, 1);
      arr.splice(index, 0, removed);
      return arr;
    });
    setDragIndex(index);
  }, [dragIndex, layers, pushHistory]);

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
  }, []);

  // handleKeyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        if (e.shiftKey) { e.preventDefault(); redo(); }
        else { e.preventDefault(); undo(); }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo, layersRef]);


  const bakeImageToCanvas = useCallback(
    (callback: (canvas: HTMLCanvasElement) => void) => {
      if (!currentImage) return;
      const src = effectResultSrc ?? currentImage.src;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
        }
        callback(canvas);
      };
      img.src = src;
    },
    [currentImage, effectResultSrc]
  );

  const bakeAndDownload = useCallback(() => {
    if (exporting) return;
    if (guestMode) {
      setShowExport(false);
      showScreen("auth");
      return;
    }
    setExporting(true);
    bakeImageToCanvas((canvas) => {
      const ext = exportFormat === "jpeg" ? "jpg" : exportFormat;
      const mime = exportFormat === "jpeg" ? "image/jpeg" : exportFormat === "png" ? "image/png" : "image/webp";
      const quality = exportFormat === "png" ? undefined : exportQuality / 100;
      canvas.toBlob((blob) => {
        if (!blob) { setExporting(false); return; }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `tul-edit.${ext}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        setExporting(false);
        setShowExport(false);
      }, mime, quality);
    });
  }, [bakeImageToCanvas, exporting, guestMode, showScreen, exportFormat, exportQuality]);

  const shareImage = useCallback(() => {
    if (guestMode) {
      setShowExport(false);
      showScreen("auth");
      return;
    }
    bakeImageToCanvas((canvas) => {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          const file = new File([blob], "tul-edit.jpg", { type: "image/jpeg" });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: "tul edit" });
          }
        } catch {
          // cancelled
        }
      }, "image/jpeg", 0.92);
    });
  }, [bakeImageToCanvas, guestMode, showScreen]);

  const presetIdsInUse = new Set(layers.map((l) => l.presetId));

  return (
    <>
      <section className={`screen screen-onboarding ${screen === "onboarding" ? "active" : ""}`} style={{ position: "relative" }}>
        {!userLoaded ? (
          <div className="onboard-loading">
            <p className="onboard-logo">TUL</p>
            <Spinner size={18} />
          </div>
        ) : (
        <InteractiveLines backgroundColor="rgb(10, 10, 10)" lineColor="rgba(255, 255, 255, 0.25)" lineWidth={0.7} minLines={4} maxLines={30} fade fadeIntensity={25} />
        )}
        {userLoaded && (
        <div className="onboard-content">
          <p className="onboard-logo">TUL</p>
          <h1 className="onboard-h1">
            Upload a photo.<br />
            Pick a look.<br />
            <em>Done.</em>
          </h1>
          <p className="onboard-lede">
            No sliders to learn, no filters to fight with â€” just presets built
            to make your photos better in one tap.
          </p>
          <button className="btn btn-primary" onClick={() => showScreen(isSignedIn ? "home" : "auth")} style={{ padding: "12px 32px", fontSize: "15px" }}>
            Get started
          </button>
        </div>
        )}
      </section>

      <section className={`screen screen-auth ${screen === "auth" ? "active" : ""}`}>
        <AuthCard onGuest={() => { setGuestMode(true); showScreen("home"); }} />
      </section>

      <section className={`screen screen-home ${screen === "home" ? "active" : ""}`}>
        <nav className="top-nav">
          <div className="top-nav-left">
            <span className="wordmark">tul</span>
          </div>
          <div className="top-nav-right">
            {isSignedIn ? (
              <UserButton />
            ) : (
              <button className="btn btn-ghost btn-sm" onClick={() => showScreen("auth")}>Sign in</button>
            )}
          </div>
        </nav>
        <div className="home-content">
          <div
            className={`upload-card ${isDragging ? "drag-over" : ""}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleFileDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="icon-circle">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 16V4" /><path d="M6 10l6-6 6 6" /><path d="M4 20h16" />
              </svg>
            </div>
            <strong>New edit</strong>
            <span>Upload a photo to get started</span>
          </div>
        </div>
      </section>

      <section className={`screen screen-editor ${screen === "editor" ? "active" : ""}`}>
        <nav className="top-nav">
          <div className="top-nav-left">
            <span className="wordmark">tul</span>
            <button className="btn btn-ghost" onClick={() => showScreen("home")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              Back
            </button>
          </div>
          <div className="top-nav-right">
            <button className="btn btn-ghost" onClick={() => fileInputRef.current?.click()}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><path d="M17 8l-5-5-5 5" /><path d="M12 3v12" />
              </svg>
            </button>
            {isSignedIn ? (
              <UserButton />
            ) : (
              <button className="btn btn-ghost btn-sm" onClick={() => showScreen("auth")}>Sign in</button>
            )}
          </div>
        </nav>

        <div className="editor-layout">
          <aside className="editor-sidebar">
            <div className="minimal-panel-section input-section">
              <div className="minimal-section-heading"><span>Input</span><span className="minimal-status">{currentImage ? "Ready" : "Standby"}</span></div>
              {currentImage ? (
                <button className="minimal-source" onClick={() => fileInputRef.current?.click()}>
                  <span className="minimal-source-thumb"><ImageWithSkeleton src={currentImage.src} alt="" /></span>
                  <span className="minimal-source-copy"><strong>{currentImage.name}</strong><small>Change image</small></span>
                </button>
              ) : (
                <button className={`minimal-upload ${isDragging ? "drag-over" : ""}`} onClick={() => fileInputRef.current?.click()} onDragOver={handleFileDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
                  <span>Drop file or click to browse</span><small>JPG, PNG, WebP</small>
                </button>
              )}
            </div>
            <div className="minimal-panel-section">
              <div className="minimal-section-heading"><span>Effects</span><small>{EFFECTS.length}</small></div>
              <div className="minimal-list">
                {EFFECTS.map((eff) => {
                  const on = isEffectActive(eff.id);
                  return <div key={eff.id} className={`minimal-list-row ${selectedEffectId === eff.id ? "selected" : ""}`}>
                    <button className="minimal-row-select" onClick={() => setSelectedEffectId(eff.id)}><span className={`minimal-dot ${on ? "on" : ""}`} />{eff.name}</button>
                    <button className={`minimal-toggle ${on ? "on" : ""}`} onClick={() => { setSelectedEffectId(eff.id); toggleEffect(eff.id); }} aria-label={`${on ? "Disable" : "Enable"} ${eff.name}`} title={on ? "Disable effect" : "Enable effect"}><span /></button>
                  </div>;
                })}
              </div>
            </div>
            <div className="minimal-panel-section">
              <div className="minimal-section-heading"><span>Presets</span><small>{PROFILE_CATALOG.length}</small></div>
              {PROFILE_GROUPS.map((group) => (
                <div key={group.id} className="minimal-preset-group profile-preset-group">
                  <span className="minimal-category-label">{group.name}<small>{group.profiles.length}</small></span>
                  <div className="minimal-list">
                    {group.profiles.map((profile) => {
                      const inUse = presetIdsInUse.has(profile.id);
                      return <button key={profile.id} className={`minimal-list-row minimal-preset-row profile-preset-row ${inUse ? "selected" : ""}`} onClick={() => addLayer(profile.id)}>
                        <span className={`minimal-dot ${inUse ? "on" : ""}`} />
                        <span className="profile-preset-copy"><span>{profile.name}</span><small>{profile.category} · {profile.sourceId}</small></span>
                        {inUse && <small className="profile-in-use">In use</small>}
                      </button>;
                    })}
                  </div>
                </div>
              ))}
              {savedPresets.length > 0 && <div className="minimal-preset-group"><span className="minimal-category-label">Saved</span><div className="minimal-list">{savedPresets.map((preset) => <div className="minimal-list-row" key={preset.id}><button className="minimal-row-select" onClick={() => applySavedPreset(preset)}><span className="minimal-dot" />{preset.name}</button><button className="minimal-delete" onClick={() => deleteSavedPreset(preset.id)} aria-label={`Delete ${preset.name}`}>×</button></div>)}</div></div>}
              <div className="minimal-save-row"><input className="field" type="text" placeholder="Preset name" value={presetNameInput} onChange={(e) => setPresetNameInput(e.target.value)} /><button className="minimal-text-button" onClick={saveCurrentAsPreset} disabled={layers.length === 0 && !hasEnabledFilmModules}>+ Save</button></div>
            </div>
          </aside>

          <aside className="editor-preview">
            <div className="preview-header">
              <span>Preview</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {processing && <Spinner size={14} />}
                {currentImage && imgNatural.w > 0 && (
                  <span style={{ fontSize: 11, color: "var(--ink-muted)" }}>
                    {imgNatural.w}{" \u00d7 "}{imgNatural.h}{fileSize > 0 ? ` \u00b7 ${(fileSize / 1024 / 1024).toFixed(1)}MB` : ""}
                  </span>
                )}
                {currentImage && (
                  <div className="zoom-controls">
                    <button className="icon-btn zoom-btn" onClick={zoomOut} title="Zoom out" aria-label="Zoom out">−</button>
                    <span className="zoom-label">{`${Math.round(zoom * 100)}%`}</span>
                    <button className="icon-btn zoom-btn" onClick={zoomIn} title="Zoom in">+</button>
                    <button className="icon-btn zoom-btn" onClick={zoomToFit} title="Fit image to view" aria-label="Fit image to view">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M8 3H3v5m13-5h5v5M21 16v5h-5M8 21H3v-5" />
                        <path d="m8 8-5-5m13 5 5-5m-5 13 5 5m-13-5-5 5" />
                      </svg>
                    </button>
                    <button className="icon-btn zoom-btn" onClick={zoomOneToOne} title="Actual size">1:1</button>
                  </div>
                )}
              </div>
            </div>
            <div className="preview-content" style={{ position: "relative" }}>
              {currentImage ? (
                <div ref={viewportRef} style={{ position: "absolute", inset: 0, overflow: "hidden", cursor: panning ? "grabbing" : "grab" }}
                  onWheel={handleWheel}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  <img
                    src={compare === "original" ? currentImage.src : (effectResultSrc ?? currentImage.src)}
                    alt="Final output"
                    draggable={false}
                    onLoad={(e) => {
                      const n = e.currentTarget;
                      setImgNatural({ w: n.naturalWidth, h: n.naturalHeight });
                      const vp = viewportRef.current;
                      if (!vp) return;
                      const r = vp.getBoundingClientRect();
                      const f = Math.min(r.width / n.naturalWidth, r.height / n.naturalHeight) * 0.95;
                      setZoom(f);
                      setPanX((r.width - n.naturalWidth * f) / 2);
                      setPanY((r.height - n.naturalHeight * f) / 2);
                    }}
                    style={{
                      display: "block",
                      maxWidth: "none",
                      maxHeight: "none",
                      transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
                      transformOrigin: "0 0",
                    }}
                  />
                </div>
              ) : (
                <span className="preview-empty">No image selected</span>
              )}
            </div>
            {currentImage && (
              <div className="workspace-controls">
                <button className={compare === "edited" ? "active" : ""} onClick={() => setCompare("edited")}>Edited</button>
                <button className={compare === "original" ? "active" : ""} onClick={() => setCompare("original")}>Original</button>
              </div>
            )}
          </aside>

          <div className="editor-workspace">
            <div className="minimal-inspector-section">
              <div className="minimal-inspector-heading"><span>Settings</span><button className="minimal-text-button" onClick={() => { setFilmSettings(DEFAULT_FILM_SETTINGS); if (selectedEffectId) setEffectSettings((prev) => ({ ...prev, [selectedEffectId]: EFFECT_DEFAULTS[selectedEffectId] })); }}>Reset</button></div>
              <div className="minimal-film-control-heading">Film Controls <small>14 modules</small></div>
              <FilmLookControls settings={filmSettings} onChange={setFilmSettings} />
              {selectedEffectId ? <>
                <div className="minimal-selected-effect"><span>{EFFECTS.find((item) => item.id === selectedEffectId)?.name}</span><small>{isEffectActive(selectedEffectId) ? "Active" : "Inactive"}</small></div>
                <div className="minimal-effect-settings">
                  {EFFECTS.filter((eff) => eff.id === selectedEffectId).map((eff) => {
                    const on = isEffectActive(eff.id);
                    return <div key={eff.id} className="effect-entry">{!on && <p className="minimal-hint">Enable this effect to adjust its settings.</p>}
                        {eff.id === "halftone" && (
                          <EffectHalftoneControls
                            settings={getEffectSettings("halftone", DEFAULT_HALFTONE_SETTINGS)}
                            onChange={(patch) => updateEffectSettings("halftone", patch)}
                          />
                        )}
                        {eff.id === "pixelate" && (
                          <EffectSliderControls
                            settings={getEffectSettings("pixelate", DEFAULT_PIXELATE)}
                            onChange={(patch) => updateEffectSettings("pixelate", patch)}
                            controls={[{ key: "blockSize", label: "Block size", min: 2, max: 40, step: 1 }]}
                          />
                        )}
                        {eff.id === "glitch" && (
                          <EffectSliderControls
                            settings={getEffectSettings("glitch", DEFAULT_GLITCH)}
                            onChange={(patch) => updateEffectSettings("glitch", patch)}
                            controls={[
                              { key: "shift", label: "Shift", min: 1, max: 30, step: 1 },
                              { key: "intensity", label: "Intensity", min: 0.1, max: 1, step: 0.05 },
                              { key: "jitter", label: "Jitter", min: 0, max: 10, step: 0.5 },
                            ]}
                          />
                        )}
                        {eff.id === "motion-blur" && (
                          <EffectSliderControls
                            settings={getEffectSettings("motion-blur", DEFAULT_MOTION_BLUR)}
                            onChange={(patch) => updateEffectSettings("motion-blur", patch)}
                            controls={[
                              { key: "length", label: "Length", min: 1, max: 50, step: 1 },
                              { key: "angle", label: "Angle", min: 0, max: 360, step: 1 },
                              { key: "quality", label: "Quality", min: 2, max: 20, step: 1 },
                            ]}
                          />
                        )}
                        {eff.id === "radial-blur" && (
                          <EffectRadialBlurControls
                            settings={getEffectSettings("radial-blur", DEFAULT_RADIAL_BLUR)}
                            onChange={(patch) => updateEffectSettings("radial-blur", patch)}
                          />
                        )}
                        {eff.id === "duotone" && (
                          <EffectDuotoneControls
                            settings={getEffectSettings("duotone", DEFAULT_DUOTONE)}
                            onChange={(patch) => updateEffectSettings("duotone", patch)}
                          />
                        )}
                        {eff.id === "vignette" && (
                          <EffectSliderControls
                            settings={getEffectSettings("vignette", DEFAULT_VIGNETTE)}
                            onChange={(patch) => updateEffectSettings("vignette", patch)}
                            controls={[
                              { key: "strength", label: "Strength", min: 0, max: 1, step: 0.05 },
                              { key: "radius", label: "Radius", min: 0.1, max: 1.5, step: 0.05 },
                            ]}
                          />
                        )}
                        {eff.id === "noise" && (
                          <EffectSliderControls
                            settings={getEffectSettings("noise", DEFAULT_NOISE)}
                            onChange={(patch) => updateEffectSettings("noise", patch)}
                            controls={[{ key: "amount", label: "Amount", min: 0, max: 0.5, step: 0.01 }]}
                          />
                        )}
                        {eff.id === "kaleidoscope" && (
                          <EffectSliderControls
                            settings={getEffectSettings("kaleidoscope", DEFAULT_KALEIDOSCOPE)}
                            onChange={(patch) => updateEffectSettings("kaleidoscope", patch)}
                            controls={[{ key: "segments", label: "Segments", min: 2, max: 24, step: 1 }]}
                          />
                        )}
                        {eff.id === "ripple" && (
                          <EffectSliderControls
                            settings={getEffectSettings("ripple", DEFAULT_RIPPLE)}
                            onChange={(patch) => updateEffectSettings("ripple", patch)}
                            controls={[
                              { key: "amplitude", label: "Amplitude", min: 1, max: 30, step: 1 },
                              { key: "frequency", label: "Frequency", min: 1, max: 50, step: 1 },
                            ]}
                          />
                        )}
                        {eff.id === "ascii" && (
                          <EffectASCIIControls
                            settings={getEffectSettings("ascii", DEFAULT_ASCII)}
                            onChange={(patch) => updateEffectSettings("ascii", patch)}
                          />
                        )}
                        {eff.id === "receipt" && (
                          <EffectSliderControls
                            settings={getEffectSettings("receipt", DEFAULT_RECEIPT)}
                            onChange={(patch) => updateEffectSettings("receipt", patch)}
                            controls={[
                              { key: "noise", label: "Noise", min: 0, max: 0.3, step: 0.01 },
                              { key: "distortion", label: "Distortion", min: 0, max: 0.1, step: 0.005 },
                              { key: "vignette", label: "Vignette", min: 0, max: 0.5, step: 0.01 },
                            ]}
                          />
                        )}
                        {eff.id === "crt" && (
                          <EffectCRTControls
                            settings={getEffectSettings("crt", DEFAULT_CRT)}
                            onChange={(patch) => updateEffectSettings("crt", patch)}
                          />
                        )}
                        {eff.id === "threshold" && (
                          <EffectThresholdControls
                            settings={getEffectSettings("threshold", DEFAULT_THRESHOLD)}
                            onChange={(patch) => updateEffectSettings("threshold", patch)}
                          />
                        )}
                        {eff.id === "rgb-shift" && (
                          <EffectRGBShiftControls
                            settings={getEffectSettings("rgb-shift", DEFAULT_RGB_SHIFT)}
                            onChange={(patch) => updateEffectSettings("rgb-shift", patch)}
                          />
                        )}
                        {eff.id === "motion-trail" && (
                          <EffectMotionTrailControls
                            settings={getEffectSettings("motion-trail", DEFAULT_MOTION_TRAIL)}
                            onChange={(patch) => updateEffectSettings("motion-trail", patch)}
                          />
                        )}
                        {eff.id === "bloom" && (
                          <EffectBloomControls
                            settings={getEffectSettings("bloom", DEFAULT_BLOOM)}
                            onChange={(patch) => updateEffectSettings("bloom", patch)}
                          />
                        )}
                        {eff.id === "emboss" && (
                          <EffectEmbossControls
                            settings={getEffectSettings("emboss", DEFAULT_EMBOSS)}
                            onChange={(patch) => updateEffectSettings("emboss", patch)}
                          />
                        )}
                    </div>;
                  })}
                </div>
              </> : <div className="minimal-inspector-empty">Select an effect to edit its settings.</div>}
              <div className="minimal-processing"><span>Processing</span><small>{processing ? "Working" : "Ready"}</small></div>
            </div>
            {/* Layers */}
            <div className="layers-section">
              <div className="workspace-section-header">
                <span>Layers ({layers.length})</span>
                <div className="layer-header-actions">
                  <button className="icon-btn" onClick={undo} disabled={undoStack.length === 0} title="Undo (Ctrl+Z)" aria-label="Undo" style={{ fontSize: "14px" }}>&#x21A9;</button>
                  <button className="icon-btn" onClick={redo} disabled={redoStack.length === 0} title="Redo (Ctrl+Shift+Z)" aria-label="Redo" style={{ fontSize: "14px" }}>&#x21AA;</button>
                  <button className="btn btn-ghost" onClick={() => addLayer("bloom:35mm")} style={{ padding: "4px 10px", fontSize: "12px" }}>+ Add</button>
                </div>
              </div>
              {layers.length === 0 ? (
                <div className="layers-empty">
                  Apply a preset to add a layer
                </div>
              ) : (
                <div className="layers-list">
                  {layers.map((layer, i) => {
                    const profile = PROFILE_BY_ID.get(layer.presetId);
                    const layerLabel = `Layer ${i + 1}${profile?.name ? `: ${profile.name}` : ""}`;
                    const cannotMoveUp = layer.locked || i === 0 || !!layers[i - 1]?.locked;
                    const cannotMoveDown = layer.locked || i === layers.length - 1 || !!layers[i + 1]?.locked;
                    return (
                      <div
                        key={layer.id}
                        className={`layer-item image-first-layer ${!layer.enabled ? "layer-disabled" : ""} ${dragIndex === i ? "layer-dragging" : ""} ${layer.locked ? "layer-is-locked" : ""}`}
                        onDragOver={(event) => handleDragOver(event, i)}
                        onDragEnd={handleDragEnd}
                      >
                        <div className="layer-top">
                          <div className="layer-left">
                            <div
                              className={`layer-thumb-small layer-drag-handle ${layer.locked ? "is-locked" : ""}`}
                              draggable={!layer.locked}
                              onDragStart={(event) => handleDragStart(event, i)}
                              title={layer.locked ? "Unlock to move this layer" : `Drag image to reorder ${layerLabel}`}
                              aria-label={layer.locked ? `${layerLabel} is locked` : `Drag image to reorder ${layerLabel}`}
                            >
                              {currentImage && <span className="layer-image-preview" aria-hidden="true" style={{ backgroundImage: `url("${effectResultSrc ?? currentImage.src}")` }} />}
                              {!layer.locked && <span className="layer-drag-hint" aria-hidden="true"><i /><i /><i /><i /><i /><i /></span>}
                              {layer.locked && <span className="layer-thumb-lock" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg></span>}
                            </div>
                          </div>
                          <div className="layer-actions" role="group" aria-label={`${layerLabel} controls`}>
                            <button type="button" className={`icon-btn layer-visibility ${layer.enabled ? "is-visible" : ""}`} onClick={() => toggleLayer(layer.id)} title={layer.enabled ? "Hide layer" : "Show layer"} aria-label={`${layer.enabled ? "Hide" : "Show"} ${layerLabel}`} aria-pressed={layer.enabled}>
                              {layer.enabled ? (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                                </svg>
                              ) : (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><path d="M1 1l22 22" />
                                </svg>
                              )}
                            </button>
                            <button type="button" className={`icon-btn layer-lock ${layer.locked ? "is-locked" : ""}`} onClick={() => toggleLayerLock(layer.id)} title={layer.locked ? "Unlock layer" : "Lock layer"} aria-label={`${layer.locked ? "Unlock" : "Lock"} ${layerLabel}`} aria-pressed={!!layer.locked}>
                              {layer.locked ? (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
                              ) : (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 7.5-2" /></svg>
                              )}
                            </button>
                            <span className="layer-action-divider" aria-hidden="true" />
                            <button type="button" className="icon-btn layer-move" onClick={() => moveLayer(layer.id, "up")} disabled={cannotMoveUp} title={layer.locked ? "Unlock layer to move it" : i === 0 ? "Layer is already at the top" : layers[i - 1]?.locked ? "Unlock the layer above first" : "Move layer up"} aria-label={`Move ${layerLabel} up`}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m18 15-6-6-6 6" /></svg>
                            </button>
                            <button type="button" className="icon-btn layer-move" onClick={() => moveLayer(layer.id, "down")} disabled={cannotMoveDown} title={layer.locked ? "Unlock layer to move it" : i === layers.length - 1 ? "Layer is already at the bottom" : layers[i + 1]?.locked ? "Unlock the layer below first" : "Move layer down"} aria-label={`Move ${layerLabel} down`}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
                            </button>
                            <span className="layer-action-divider" aria-hidden="true" />
                            <button type="button" className="icon-btn layer-remove" onClick={() => removeLayer(layer.id)} title="Remove layer" aria-label={`Remove ${layerLabel}`}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
                            </button>
                          </div>
                        </div>
                        <div className="layer-slider-row">
                          <span className="layer-intensity-title">Opacity</span>
                          <RangeValueControl label={`${layerLabel} opacity`} min={0} max={100} step={1} value={layer.intensity} unit="%" onChange={(value) => updateLayerIntensity(layer.id, value)} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="minimal-panel-section minimal-export-section">
              <div className="minimal-section-heading"><span>Export</span></div>
              <div className="export-bar minimal-export-bar">
          <div className="export-left">
            <span style={{ fontSize: "13px", color: "var(--ink-muted)" }}>Export as</span>
            <select className="export-select" value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}>
              <option value="jpeg">JPEG</option>
              <option value="png">PNG</option>
              <option value="webp">WebP</option>
            </select>
            <span style={{ fontSize: "13px", color: "var(--ink-muted)" }}>Quality</span>
            <input type="range" min="10" max="100" value={exportQuality} onChange={(e) => setExportQuality(Number(e.target.value))} style={{ width: 100 }} />
            <span style={{ fontSize: "12px", color: "var(--ink-secondary)", minWidth: 28 }}>{exportQuality}%</span>
          </div>
          <div className="export-right">
            <button className="btn btn-ghost" onClick={() => { if (!currentImage) { fileInputRef.current?.click(); return; } setShowExport(true); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="6" cy="12" r="2" /><circle cx="18" cy="6" r="2" /><circle cx="18" cy="18" r="2" />
                <path d="M7.6 10.9l8.8-4.8" /><path d="M7.6 13.1l8.8 4.8" />
              </svg>
              Share
            </button>
            <button className="btn btn-accent" onClick={() => { if (!currentImage) { fileInputRef.current?.click(); return; } setShowExport(true); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v12" /><path d="M8 11l4 4 4-4" /><path d="M5 19h14" />
              </svg>
              Export
            </button>
          </div>
        </div>
            </div>
          </div>
        </div>

      </section>

      <div className={`modal-backdrop ${showExport ? "show" : ""}`} onClick={() => setShowExport(false)} />
      <div className={`modal ${showExport ? "show" : ""}`}>
        <div className="modal-preview">
          {currentImage && <ImageWithSkeleton src={compare === "edited" ? (effectResultSrc ?? currentImage.src) : currentImage.src} alt="Final preview" />}
        </div>
        {guestMode && (
          <p style={{ fontSize: "12px", color: "var(--ink-muted)", textAlign: "center", margin: "0 0 12px" }}>
            Sign in to download. Edits are ready â€” they won&apos;t be lost.
          </p>
        )}
        <div className="modal-actions">
          <FadeIn show={exporting}>
            <Spinner size={16} />
          </FadeIn>
          <button className="btn btn-primary" onClick={bakeAndDownload} disabled={exporting}>
            {exporting ? "Exporting..." : "Download"}
          </button>
          <button className="btn btn-outline" onClick={shareImage}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="6" cy="12" r="2" /><circle cx="18" cy="6" r="2" /><circle cx="18" cy="18" r="2" />
              <path d="M7.6 10.9l8.8-4.8" /><path d="M7.6 13.1l8.8 4.8" />
            </svg>
            Share
          </button>
        </div>
        <p className="modal-status">&nbsp;</p>
        <button className="link-quiet modal-done" onClick={() => setShowExport(false)}>Done</button>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
    </>
  );
}

function EffectDuotoneControls({ settings, onChange }: {
  settings: DuotoneSettings;
  onChange: (patch: Record<string, any>) => void;
}) {
  return (
    <div className="effect-controls">
      <div className="effect-control">
        <label>Color 1</label>
        <input type="color" value={settings.color1} onChange={(e) => onChange({ color1: e.target.value })} />
      </div>
      <div className="effect-control">
        <label>Color 2</label>
        <input type="color" value={settings.color2} onChange={(e) => onChange({ color2: e.target.value })} />
      </div>
    </div>
  );
}

function EffectNumericControl({ settings, settingKey, label, min, max, step, onChange }: {
  settings: object;
  settingKey: string;
  label: string;
  min: number;
  max: number;
  step: number;
  onChange: (patch: Record<string, number>) => void;
}) {
  const settingValue = (settings as Record<string, unknown>)[settingKey];
  return (
    <div className="effect-control">
      <span className="effect-control-label">{label}</span>
      <RangeValueControl
        label={label}
        min={min}
        max={max}
        step={step}
        value={typeof settingValue === "number" ? settingValue : min}
        onChange={(value) => onChange({ [settingKey]: value })}
      />
    </div>
  );
}

function EffectHalftoneControls({ settings, onChange }: {
  settings: HalftoneSettings;
  onChange: (patch: Record<string, any>) => void;
}) {
  return (
    <>
      <EffectPatternGrid
        activeMap={settings.thresholdMap}
        onSelect={(mapKey) => onChange({ thresholdMap: mapKey })}
      />
      <div className="effect-controls">
        <EffectNumericControl settings={settings} settingKey="patternScale" label="Scale" min={0.3} max={3.5} step={0.01} onChange={onChange} />
        <EffectNumericControl settings={settings} settingKey="brightness" label="Brightness" min={0} max={255} step={1} onChange={onChange} />
        <EffectNumericControl settings={settings} settingKey="contrast" label="Contrast" min={0.3} max={3} step={0.01} onChange={onChange} />
        <EffectNumericControl settings={settings} settingKey="thresholdOffset" label="Offset" min={-0.4} max={0.4} step={0.005} onChange={onChange} />
        <div className="effect-control effect-toggle">
          <label>Invert</label>
          <button className={`btn btn-ghost ${settings.invert ? "active" : ""}`} onClick={() => onChange({ invert: !settings.invert })} style={{ padding: "4px 12px", fontSize: "12px" }}>
            {settings.invert ? "ON" : "OFF"}
          </button>
        </div>
      </div>
    </>
  );
}

function EffectRadialBlurControls({ settings, onChange }: {
  settings: any;
  onChange: (patch: Record<string, any>) => void;
}) {
  return (
    <div className="effect-controls">
      <div className="effect-control">
        <label>Type</label>
        <select className="export-select" value={settings.type} onChange={(e) => onChange({ type: e.target.value })}>
          <option value="zoom">Zoom</option>
          <option value="spin">Spin</option>
        </select>
      </div>
      <EffectNumericControl settings={settings} settingKey="strength" label="Strength" min={1} max={50} step={1} onChange={onChange} />
      <EffectNumericControl settings={settings} settingKey="centerX" label="Center X" min={0} max={100} step={1} onChange={onChange} />
      <EffectNumericControl settings={settings} settingKey="centerY" label="Center Y" min={0} max={100} step={1} onChange={onChange} />
      <EffectNumericControl settings={settings} settingKey="quality" label="Quality" min={2} max={30} step={1} onChange={onChange} />
    </div>
  );
}

function EffectASCIIControls({ settings, onChange }: {
  settings: any;
  onChange: (patch: Record<string, any>) => void;
}) {
  return (
    <div className="effect-controls">
      <div className="effect-control">
        <label>Character set</label>
        <select className="export-select" value={settings.charSet} onChange={(e) => onChange({ charSet: e.target.value })}>
          {ASCII_CHARSET_OPTIONS.map((opt) => (
            <option key={opt.label} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      <EffectNumericControl settings={settings} settingKey="scale" label="Scale" min={1} max={12} step={1} onChange={onChange} />
      <div className="effect-control effect-toggle">
        <label>Invert</label>
        <button className={`btn btn-ghost ${settings.invert ? "active" : ""}`} onClick={() => onChange({ invert: !settings.invert })} style={{ padding: "4px 12px", fontSize: "12px" }}>
          {settings.invert ? "ON" : "OFF"}
        </button>
      </div>
      <p style={{ fontSize: "11px", color: "var(--ink-muted)", margin: "4px 0 0" }}>Output size scales with resolution</p>
    </div>
  );
}

function EffectCRTControls({ settings, onChange }: { settings: any; onChange: (patch: Record<string, any>) => void }) {
  return (
    <div className="effect-controls">
      <EffectNumericControl settings={settings} settingKey="scanlines" label="Scanlines" min={1} max={8} step={1} onChange={onChange} />
      <EffectNumericControl settings={settings} settingKey="curvature" label="Curvature" min={0} max={30} step={1} onChange={onChange} />
      <EffectNumericControl settings={settings} settingKey="glow" label="Glow" min={0} max={1} step={0.05} onChange={onChange} />
      <EffectNumericControl settings={settings} settingKey="flicker" label="Flicker" min={0} max={0.3} step={0.01} onChange={onChange} />
    </div>
  );
}

function EffectThresholdControls({ settings, onChange }: { settings: any; onChange: (patch: Record<string, any>) => void }) {
  return (
    <div className="effect-controls">
      <EffectNumericControl settings={settings} settingKey="level" label="Level" min={0} max={255} step={1} onChange={onChange} />
      <EffectNumericControl settings={settings} settingKey="softness" label="Softness" min={0} max={50} step={1} onChange={onChange} />
      <div className="effect-control effect-toggle">
        <label>Invert</label>
        <button className={`btn btn-ghost ${settings.invert ? "active" : ""}`} onClick={() => onChange({ invert: !settings.invert })} style={{ padding: "4px 12px", fontSize: "12px" }}>
          {settings.invert ? "ON" : "OFF"}
        </button>
      </div>
    </div>
  );
}

function EffectRGBShiftControls({ settings, onChange }: { settings: any; onChange: (patch: Record<string, any>) => void }) {
  return (
    <div className="effect-controls">
      <EffectNumericControl settings={settings} settingKey="shiftX" label="Shift X" min={-20} max={20} step={1} onChange={onChange} />
      <EffectNumericControl settings={settings} settingKey="shiftY" label="Shift Y" min={-20} max={20} step={1} onChange={onChange} />
      <div className="effect-control">
        <label>Channel</label>
        <select className="export-select" value={settings.channel} onChange={(e) => onChange({ channel: e.target.value })}>
          <option value="both">Both</option>
          <option value="red">Red only</option>
          <option value="blue">Blue only</option>
        </select>
      </div>
    </div>
  );
}

function EffectMotionTrailControls({ settings, onChange }: { settings: any; onChange: (patch: Record<string, any>) => void }) {
  return (
    <div className="effect-controls">
      <EffectNumericControl settings={settings} settingKey="length" label="Length" min={1} max={40} step={1} onChange={onChange} />
      <EffectNumericControl settings={settings} settingKey="decay" label="Decay" min={0.1} max={1} step={0.05} onChange={onChange} />
      <EffectNumericControl settings={settings} settingKey="angle" label="Angle" min={0} max={360} step={1} onChange={onChange} />
    </div>
  );
}

function EffectBloomControls({ settings, onChange }: { settings: any; onChange: (patch: Record<string, any>) => void }) {
  return (
    <div className="effect-controls">
      <EffectNumericControl settings={settings} settingKey="threshold" label="Threshold" min={50} max={255} step={1} onChange={onChange} />
      <EffectNumericControl settings={settings} settingKey="radius" label="Radius" min={1} max={10} step={1} onChange={onChange} />
      <EffectNumericControl settings={settings} settingKey="intensity" label="Intensity" min={0} max={2} step={0.05} onChange={onChange} />
    </div>
  );
}

function EffectEmbossControls({ settings, onChange }: { settings: any; onChange: (patch: Record<string, any>) => void }) {
  return (
    <div className="effect-controls">
      <EffectNumericControl settings={settings} settingKey="strength" label="Strength" min={0.5} max={10} step={0.5} onChange={onChange} />
      <EffectNumericControl settings={settings} settingKey="angle" label="Angle" min={0} max={360} step={1} onChange={onChange} />
    </div>
  );
}

function EffectPatternGrid({ activeMap, onSelect }: { activeMap: string; onSelect: (key: string) => void }) {
  const thumbnailsRef = useRef<Map<string, string>>(new Map());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const map = new Map<string, string>();
      const c = document.createElement("canvas");
      const w = 120, h = 120;
      c.width = w; c.height = h;
      const ctx = c.getContext("2d")!;
      const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      const dx = (w - dw) / 2;
      const dy = (h - dh) / 2;
      ctx.drawImage(img, dx, dy, dw, dh);
      const srcData = ctx.getImageData(0, 0, w, h);

      for (const opt of HALFTONE_MAP_OPTIONS) {
        const result = applyHalftone(new ImageData(new Uint8ClampedArray(srcData.data), w, h), {
          thresholdMap: opt.value,
          patternScale: 1.0,
          brightness: 128,
          contrast: 1.0,
          invert: false,
          thresholdOffset: 0.0,
        });
        ctx.putImageData(result, 0, 0);
        map.set(opt.value, c.toDataURL());
      }
      thumbnailsRef.current = map;
      setReady(true);
    };
    img.src = "/images/ted.png";
  }, []);

  return (
    <div className="pattern-grid">
      {HALFTONE_MAP_OPTIONS.map((opt) => (
        <div
          key={opt.value}
          className={`preset-thumb ${activeMap === opt.value ? "active" : ""}`}
          onClick={() => onSelect(opt.value)}
        >
          {ready && <img src={thumbnailsRef.current.get(opt.value) || ""} alt={opt.label} />}
          <span className="preset-label">{opt.label}</span>
        </div>
      ))}
    </div>
  );
}


