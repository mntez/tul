"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useUser, useAuth, useSignIn, UserButton } from "@clerk/nextjs";
import InteractiveLines from "./interactive-lines";
import { ImageWithSkeleton, Skeleton, Spinner, FadeIn } from "./animations";
import { applyHalftone, DEFAULT_HALFTONE_SETTINGS, HALFTONE_MAP_OPTIONS, HalftoneSettings } from "./halftone";
import {
  applyPixelate, DEFAULT_PIXELATE,
  applyGlitch, DEFAULT_GLITCH,
  applyDuotone, DEFAULT_DUOTONE, DuotoneSettings,
  applyVignette, DEFAULT_VIGNETTE,
  applyNoise, DEFAULT_NOISE,
  applyKaleidoscope, DEFAULT_KALEIDOSCOPE,
  applyRipple, DEFAULT_RIPPLE,
  applyASCII, DEFAULT_ASCII, ASCII_CHARSET_OPTIONS,
  applyReceipt, DEFAULT_RECEIPT,
  applyMotionBlur, DEFAULT_MOTION_BLUR,
  applyRadialBlur, DEFAULT_RADIAL_BLUR,
  applyCRT, DEFAULT_CRT,
  applyThreshold, DEFAULT_THRESHOLD,
  applyRGBShift, DEFAULT_RGB_SHIFT,
  applyMotionTrail, DEFAULT_MOTION_TRAIL,
  applyBloom, DEFAULT_BLOOM,
  applyEmboss, DEFAULT_EMBOSS,
  EFFECTS, EffectId,
} from "./effects";

const PRESETS = [
  { id: "original", name: "Original", filter: () => "none" },
  { id: "mono", name: "Mono", filter: (i: number) => `grayscale(${i}%) contrast(${100 + i * 0.15}%)` },
  { id: "noir", name: "Noir", filter: (i: number) => `grayscale(${i}%) contrast(${100 + i * 0.35}%) brightness(${100 - i * 0.1}%)` },
  { id: "warm", name: "Warm", filter: (i: number) => `sepia(${i * 0.4}%) saturate(${100 + i * 0.35}%) brightness(${100 + i * 0.05}%)` },
  { id: "cool", name: "Cool", filter: (i: number) => `hue-rotate(${i * 1.8}deg) saturate(${100 - i * 0.1}%) brightness(${100 + i * 0.08}%)` },
  { id: "fade", name: "Fade", filter: (i: number) => `contrast(${100 - i * 0.25}%) brightness(${100 + i * 0.15}%) saturate(${100 - i * 0.35}%)` },
  { id: "vivid", name: "Vivid", filter: (i: number) => `saturate(${100 + i * 0.6}%) contrast(${100 + i * 0.15}%)` },
];

const PRESET_CATEGORIES = [
  { name: "B&W", ids: ["mono", "noir"] },
  { name: "Color", ids: ["warm", "cool", "vivid"] },
  { name: "Mood", ids: ["fade"] },
];

interface EffectLayer {
  id: string;
  presetId: string;
  intensity: number;
  enabled: boolean;
}

interface UserPreset {
  id: string;
  name: string;
  filters: Record<string, number>;
}

interface SavedPreset {
  id: string;
  name: string;
  layers: { presetId: string; intensity: number }[];
}

interface CurrentImage {
  src: string;
  name: string;
}

interface RecentEdit {
  id: number;
  src: string;
  layers: EffectLayer[];
}

export default function Home() {
  const [screen, setScreen] = useState<"onboarding" | "auth" | "home" | "editor">("onboarding");
  const { isSignedIn, user, isLoaded } = useUser();
  const { signOut } = useAuth();
  const { signIn } = useSignIn();
  const [emailFieldsOpen, setEmailFieldsOpen] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [passInput, setPassInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [guestMode, setGuestMode] = useState(false);
  const [currentImage, setCurrentImage] = useState<CurrentImage | null>(null);
  const [recentEdits, setRecentEdits] = useState<RecentEdit[]>([]);
  const [layers, setLayers] = useState<EffectLayer[]>([]);
  const [compare, setCompare] = useState<"edited" | "original">("edited");
  const [showExport, setShowExport] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<"presets" | "effects">("presets");
  const [userPresets, setUserPresets] = useState<UserPreset[]>([]);
  const [savedPresets, setSavedPresets] = useState<SavedPreset[]>([]);
  const [presetNameInput, setPresetNameInput] = useState("");
  const [activeEffects, setActiveEffects] = useState<EffectId[]>([]);
  const [effectSettings, setEffectSettings] = useState<Record<string, any>>({});
  const [effectResultSrc, setEffectResultSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(-1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [panning, setPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const previewRef = useRef<HTMLDivElement>(null);

  const zoomIn = useCallback(() => {
    setZoom((z) => {
      if (z < 0) return 1;
      const levels = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 6, 8];
      for (const l of levels) if (l > z) return l;
      return z;
    });
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((z) => {
      if (z < 0) return -1;
      const levels = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 6, 8];
      for (let i = levels.length - 1; i >= 0; i--) if (levels[i] < z) return levels[i];
      return 0.25;
    });
  }, []);

  const zoomReset = useCallback(() => { setZoom(-1); setPanX(0); setPanY(0); }, []);

  const zoomOneToOne = useCallback(() => { setZoom(1); setPanX(0); setPanY(0); }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.deltaY < 0) zoomIn(); else zoomOut();
  }, [zoomIn, zoomOut]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom < 0) return;
    setPanning(true);
    setPanStart({ x: e.clientX - panX, y: e.clientY - panY });
  }, [zoom, panX, panY]);

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

  const showScreen = useCallback((id: "onboarding" | "auth" | "home" | "editor") => {
    setScreen(id);
  }, []);

  useEffect(() => {
    if (isLoaded && isSignedIn && screen === "auth") showScreen("home");
  }, [isLoaded, isSignedIn, screen, showScreen]);

  // Redirect to auth if not signed in on protected screens
  useEffect(() => {
    if (isLoaded && !isSignedIn && !guestMode && (screen === "home" || screen === "editor")) showScreen("auth");
  }, [isLoaded, isSignedIn, guestMode, screen, showScreen]);

  // Load persisted state on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("tul_state");
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (parsed.guestMode) setGuestMode(true);
      if (Array.isArray(parsed.layers)) setLayers(parsed.layers);
      if (Array.isArray(parsed.recentEdits)) setRecentEdits(parsed.recentEdits);
    } catch {}
  }, []);

  // Persist state changes
  useEffect(() => {
    try {
      localStorage.setItem("tul_state", JSON.stringify({
        guestMode,
        layers,
        recentEdits: recentEdits.map(({ id, layers }) => ({ id, layers })),
      }));
    } catch {}
  }, [guestMode, layers, recentEdits]);

  const handleGoogleSignIn = useCallback(async () => {
    if (!signIn) return;
    setAuthLoading(true);
    try {
      await signIn.create({
        strategy: "oauth_google",
        redirectUrl: window.location.href,
      });
    } catch (err: any) {
      setAuthError(err?.errors?.[0]?.message || "Google sign-in failed.");
      setAuthLoading(false);
    }
  }, [signIn]);

  const handleEmailSignIn = useCallback(async () => {
    if (!signIn) return;
    setAuthLoading(true);
    setAuthError("");
    try {
      const result = await signIn.create({ identifier: emailInput, password: passInput });
      if (result.error) {
        setAuthError(result.error.message || "Check your email and password.");
      }
      setAuthLoading(false);
    } catch (err: any) {
      setAuthError(err?.errors?.[0]?.message || "Sign-in failed.");
      setAuthLoading(false);
    }
  }, [signIn, emailInput, passInput]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCurrentImage({ src: ev.target?.result as string, name: file.name });
      setLayers([]);
      setCompare("edited");
      setZoom(0.25);
      setPanX(0);
      setPanY(0);
      showScreen("editor");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, [showScreen]);

  const saveCurrentAsPreset = useCallback(() => {
    const enabled = layers.filter((l) => l.enabled);
    if (enabled.length === 0) { alert("Enable at least one effect layer first."); return; }
    const name = presetNameInput.trim() || "Preset " + (savedPresets.length + 1);
    setSavedPresets((prev) => [...prev, { id: "saved_" + Date.now(), name, layers: enabled.map((l) => ({ presetId: l.presetId, intensity: l.intensity })) }]);
    setPresetNameInput("");
  }, [layers, savedPresets.length, presetNameInput]);

  const deleteSavedPreset = useCallback((id: string) => {
    setSavedPresets((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const applySavedPreset = useCallback((preset: SavedPreset) => {
    pushHistory();
    setLayers((prev) => [
      ...prev,
      ...preset.layers.map((l) => ({ id: Date.now().toString() + Math.random(), presetId: l.presetId, intensity: l.intensity, enabled: true })),
    ]);
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

  const chainEffects = useCallback((imageData: ImageData, ids: EffectId[]) => {
    let data = imageData;
    for (const id of ids) {
      const r = applySingleEffect(id, data);
      if (r) data = r;
    }
    return data;
  }, [applySingleEffect]);

  useEffect(() => {
    if (!currentImage || activeEffects.length === 0) { setEffectResultSrc(null); return; }
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, c.width, c.height);
      const result = chainEffects(imageData, activeEffects);
      ctx.putImageData(result, 0, 0);
      setEffectResultSrc(c.toDataURL());
    };
    img.src = currentImage.src;
  }, [currentImage, activeEffects, effectSettings]);

  const userPresetFilter = useCallback((preset: UserPreset, intensity: number) => {
    const f = preset.filters;
    const parts: string[] = [];
    const t = intensity / 100;
    if (f.grayscale) parts.push(`grayscale(${f.grayscale * t}%)`);
    if (f.sepia) parts.push(`sepia(${f.sepia * t}%)`);
    if (f.saturate) parts.push(`saturate(${100 + (f.saturate - 100) * t}%)`);
    if (f.contrast) parts.push(`contrast(${100 + (f.contrast - 100) * t}%)`);
    if (f.brightness) parts.push(`brightness(${100 + (f.brightness - 100) * t}%)`);
    if (f["hue-rotate"]) parts.push(`hue-rotate(${f["hue-rotate"] * t}deg)`);
    return parts.length ? parts.join(" ") : "none";
  }, []);

  const resolvePresetFilter = useCallback((presetId: string, intensity: number) => {
    const builtin = PRESETS.find((p) => p.id === presetId);
    if (builtin) return builtin.filter(intensity);
    const user = userPresets.find((p) => p.id === presetId);
    if (user) return userPresetFilter(user, intensity);
    return "";
  }, [userPresets, userPresetFilter]);

  const getCombinedFilterStringForPreset = useCallback((preset: SavedPreset) => {
    const parts = preset.layers.map((l) => resolvePresetFilter(l.presetId, l.intensity)).filter(Boolean);
    return parts.length ? parts.join(" ") : "none";
  }, [resolvePresetFilter]);

  const getCombinedFilterString = useCallback(() => {
    const parts = layers
      .filter((l) => l.enabled)
      .map((l) => resolvePresetFilter(l.presetId, l.intensity))
      .filter(Boolean);
    return parts.length ? parts.join(" ") : "none";
  }, [layers, resolvePresetFilter]);

  const addLayer = useCallback((presetId: string) => {
    if (presetId === "original") {
      pushHistory();
      setLayers([]);
      return;
    }
    pushHistory();
    setLayers((prev) => [
      ...prev,
      { id: Date.now().toString(), presetId, intensity: 100, enabled: true },
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

  const moveLayer = useCallback((id: string, dir: "up" | "down") => {
    pushHistory();
    setLayers((prev) => {
      const idx = prev.findIndex((l) => l.id === id);
      if (idx === -1) return prev;
      const next = dir === "up" ? idx - 1 : idx + 1;
      if (next < 0 || next >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr;
    });
  }, [pushHistory]);

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const dragPushedRef = useRef(false);

  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index);
    dragPushedRef.current = false;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    if (!dragPushedRef.current) { dragPushedRef.current = true; pushHistory(); }
    setLayers((prev) => {
      const arr = [...prev];
      const [removed] = arr.splice(dragIndex, 1);
      arr.splice(index, 0, removed);
      return arr;
    });
    setDragIndex(index);
  }, [dragIndex, pushHistory]);

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

  const recordEdit = useCallback(() => {
    if (!currentImage) return;
    setRecentEdits((prev) => [
      ...prev,
      { id: Date.now(), src: currentImage.src, layers: [...layers] },
    ]);
  }, [currentImage, layers]);

  const openEditorWithRecent = useCallback(
    (edit: RecentEdit) => {
      if (!edit.src) { fileInputRef.current?.click(); return; }
      setCurrentImage({ src: edit.src, name: "reopened" });
      setLayers(edit.layers);
      showScreen("editor");
    },
    [showScreen]
  );

  const bakeImageToCanvas = useCallback(
    (callback: (canvas: HTMLCanvasElement) => void) => {
      if (!currentImage) return;
      const src = activeEffects.length > 0 && effectResultSrc ? effectResultSrc : currentImage.src;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.filter = getCombinedFilterString();
          ctx.drawImage(img, 0, 0);
        }
        callback(canvas);
      };
      img.src = src;
    },
    [currentImage, getCombinedFilterString, activeEffects, effectResultSrc]
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
      canvas.toBlob((blob) => {
        if (!blob) { setExporting(false); return; }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "tul-edit.jpg";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        recordEdit();
        setExporting(false);
        setShowExport(false);
      }, "image/jpeg", 0.92);
    });
  }, [bakeImageToCanvas, recordEdit, exporting, guestMode, showScreen]);

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
            recordEdit();
          }
        } catch {
          // cancelled
        }
      }, "image/jpeg", 0.92);
    });
  }, [bakeImageToCanvas, recordEdit, guestMode, showScreen]);

  const presetIdsInUse = new Set(layers.map((l) => l.presetId));

  if (!isLoaded) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--bg)" }}>
        <Spinner size={24} />
      </div>
    );
  }

  return (
    <>
      <section className={`screen screen-onboarding ${screen === "onboarding" ? "active" : ""}`} style={{ position: "relative" }}>
        <InteractiveLines backgroundColor="rgb(10, 10, 10)" lineColor="rgba(255, 255, 255, 0.25)" lineWidth={0.7} minLines={4} maxLines={30} fade fadeIntensity={25} />
        <div className="onboard-content">
          <p className="onboard-logo">TUL</p>
          <h1 className="onboard-h1">
            Upload a photo.<br />
            Pick a look.<br />
            <em>Done.</em>
          </h1>
          <p className="onboard-lede">
            No sliders to learn, no filters to fight with — just presets built
            to make your photos better in one tap.
          </p>
          <button className="btn btn-primary" onClick={() => showScreen(isSignedIn ? "home" : "auth")} style={{ padding: "12px 32px", fontSize: "15px" }}>
            Get started
          </button>
        </div>
      </section>

      <section className={`screen screen-auth ${screen === "auth" ? "active" : ""}`}>
        <div className="auth-card">
          <div className="auth-top">
            <span className="wordmark">tul</span>
            <p>edit photos, have fun</p>
          </div>
          <div className="auth-actions">
            <button className="btn btn-primary btn-block" onClick={handleGoogleSignIn} disabled={authLoading}>
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M21.6 12.23c0-.68-.06-1.36-.18-2H12v3.79h5.4a4.6 4.6 0 01-2 3.02v2.5h3.24c1.9-1.75 3-4.32 3-7.31z" fill="#fff" />
                <path d="M12 22c2.7 0 4.97-.9 6.63-2.44l-3.24-2.5c-.9.6-2.06.96-3.39.96-2.6 0-4.8-1.76-5.6-4.12H3.05v2.58A10 10 0 0012 22z" fill="#fff" opacity=".8" />
                <path d="M6.4 13.9a5.98 5.98 0 010-3.8V7.52H3.05a10 10 0 000 8.96l3.35-2.58z" fill="#fff" opacity=".6" />
                <path d="M12 5.98c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.96 9.96 0 0012 2a10 10 0 00-8.95 5.52L6.4 10.1c.8-2.36 3-4.12 5.6-4.12z" fill="#fff" opacity=".9" />
              </svg>
              {authLoading ? "Signing in..." : "Continue with Google"}
            </button>
            <button className="btn btn-outline btn-block" onClick={() => setEmailFieldsOpen(!emailFieldsOpen)} disabled={authLoading}>
              Continue with email
            </button>
            <div className={`email-fields ${emailFieldsOpen ? "open" : ""}`}>
              <input className="field" type="email" placeholder="Email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} disabled={authLoading} />
              <div style={{ position: "relative" }}>
                <input className="field" type={showPassword ? "text" : "password"} placeholder="Password" value={passInput} onChange={(e) => setPassInput(e.target.value)} disabled={authLoading} style={{ paddingRight: "36px" }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: "4px", color: "var(--text-secondary)", display: "flex", alignItems: "center" }} tabIndex={-1}>
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              <button className="btn btn-primary btn-block" onClick={handleEmailSignIn} disabled={authLoading}>
                {authLoading ? "Signing in..." : "Continue"}
              </button>
            </div>
            {authError && <p style={{ color: "var(--danger)", fontSize: "12px", textAlign: "center", margin: "8px 0 0" }}>{authError}</p>}
          </div>
          <div className="auth-footer">
            <button className="btn btn-ghost btn-block" onClick={() => { setGuestMode(true); showScreen("home"); }} style={{ marginBottom: "12px" }}>
              Skip for now — try as guest
            </button>
            <p className="fine">
              Sign in to download your edits. Guest edits are saved locally.
            </p>
          </div>
        </div>
      </section>

      <section className={`screen screen-home ${screen === "home" ? "active" : ""}`}>
        <nav className="top-nav">
          <div className="top-nav-left">
            <span className="wordmark">tul</span>
          </div>
          <div className="top-nav-right">
            <UserButton />
          </div>
        </nav>
        <div className="home-content">
          <div className="upload-card" onClick={() => fileInputRef.current?.click()}>
            <div className="icon-circle">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 16V4" /><path d="M6 10l6-6 6 6" /><path d="M4 20h16" />
              </svg>
            </div>
            <strong>New edit</strong>
            <span>Upload a photo to get started</span>
          </div>
          <div className="recent-section">
            <p className="section-label">Recent</p>
            {recentEdits.length === 0 ? (
              <p className="recent-empty">Your edits will show up here.</p>
            ) : (
              <div className="recent-grid">
                {[...recentEdits].reverse().map((edit) => (
                  <div key={edit.id} className="recent-card" onClick={() => openEditorWithRecent(edit)}>
                    <div className="thumb-wrap">
                      {edit.src ? <img src={edit.src} alt="" /> : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--card)", color: "var(--ink-muted)", fontSize: "11px" }}>
                          Re-upload
                        </div>
                      )}
                    </div>
                    <div className="cap">{edit.layers.length} effect{edit.layers.length !== 1 ? "s" : ""}</div>
                  </div>
                ))}
              </div>
            )}
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
            <UserButton />
          </div>
        </nav>

        <div className="editor-layout">
          <aside className="editor-sidebar">
            <div className="sidebar-header">
              <input className="sidebar-search" type="text" placeholder="Search presets..." />
            </div>
            <div className="sidebar-tabs">
              <button className={`sidebar-tab ${sidebarTab === "presets" ? "active" : ""}`} onClick={() => setSidebarTab("presets")}>Presets</button>
              <button className={`sidebar-tab ${sidebarTab === "effects" ? "active" : ""}`} onClick={() => setSidebarTab("effects")}>Effects</button>
            </div>
            <div className="sidebar-content">
              {sidebarTab === "presets" ? (
                <>
                  {PRESET_CATEGORIES.map((cat) => (
                    <div key={cat.name} className="preset-category">
                      <span className="preset-category-label">{cat.name}</span>
                      <div className="preset-category-grid">
                        {cat.ids.map((id) => {
                          const p = PRESETS.find((pr) => pr.id === id);
                          if (!p) return null;
                          return (
                            <div
                              key={p.id}
                              className={`preset-thumb ${presetIdsInUse.has(p.id) ? "in-use" : ""}`}
                              onClick={() => addLayer(p.id)}
                            >
                              {currentImage && <img src={currentImage.src} alt={p.name} style={{ filter: p.filter(100) }} />}
                              <span className="preset-label">{p.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  {savedPresets.length > 0 && (
                    <div className="preset-category">
                      <span className="preset-category-label">Saved</span>
                      <div className="preset-category-grid">
                        {savedPresets.map((sp) => (
                          <div
                            key={sp.id}
                            className="preset-thumb"
                            onClick={() => applySavedPreset(sp)}
                          >
                            {currentImage && <img src={currentImage.src} alt={sp.name} style={{ filter: getCombinedFilterStringForPreset(sp) }} />}
                            <span className="preset-label">{sp.name}</span>
                            <button className="preset-delete" onClick={(e) => { e.stopPropagation(); deleteSavedPreset(sp.id); }} title="Delete">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18" /><path d="M6 6l12 12" /></svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="sidebar-save-row">
                    <input className="field sidebar-save-input" type="text" placeholder="Preset name..." value={presetNameInput} onChange={(e) => setPresetNameInput(e.target.value)} />
                    <button className="btn btn-ghost" onClick={saveCurrentAsPreset} disabled={layers.length === 0} style={{ padding: "6px 12px", fontSize: "12px", flexShrink: 0 }}>
                      + Save
                    </button>
                  </div>
                </>
              ) : (
                <div className="effects-list">
                  {EFFECTS.map((eff) => {
                    const on = isEffectActive(eff.id);
                    return (
                      <div key={eff.id}>
                        <div className={`effect-card ${on ? "active" : ""}`} onClick={() => toggleEffect(eff.id)}>
                          <div className="effect-card-header">
                            <span className="effect-name">{eff.name}</span>
                            <span className="effect-badge">{on ? "on" : "canvas"}</span>
                          </div>
                          <p className="effect-desc">{eff.desc}</p>
                        </div>

                        {on && eff.id === "halftone" && (
                          <EffectHalftoneControls
                            settings={getEffectSettings("halftone", DEFAULT_HALFTONE_SETTINGS)}
                            onChange={(patch) => updateEffectSettings("halftone", patch)}
                          />
                        )}
                        {on && eff.id === "pixelate" && (
                          <EffectSliderControls
                            settings={getEffectSettings("pixelate", DEFAULT_PIXELATE)}
                            onChange={(patch) => updateEffectSettings("pixelate", patch)}
                            controls={[{ key: "blockSize", label: "Block size", min: 2, max: 40, step: 1 }]}
                          />
                        )}
                        {on && eff.id === "glitch" && (
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
                        {on && eff.id === "motion-blur" && (
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
                        {on && eff.id === "radial-blur" && (
                          <EffectRadialBlurControls
                            settings={getEffectSettings("radial-blur", DEFAULT_RADIAL_BLUR)}
                            onChange={(patch) => updateEffectSettings("radial-blur", patch)}
                          />
                        )}
                        {on && eff.id === "duotone" && (
                          <EffectDuotoneControls
                            settings={getEffectSettings("duotone", DEFAULT_DUOTONE)}
                            onChange={(patch) => updateEffectSettings("duotone", patch)}
                          />
                        )}
                        {on && eff.id === "vignette" && (
                          <EffectSliderControls
                            settings={getEffectSettings("vignette", DEFAULT_VIGNETTE)}
                            onChange={(patch) => updateEffectSettings("vignette", patch)}
                            controls={[
                              { key: "strength", label: "Strength", min: 0, max: 1, step: 0.05 },
                              { key: "radius", label: "Radius", min: 0.1, max: 1.5, step: 0.05 },
                            ]}
                          />
                        )}
                        {on && eff.id === "noise" && (
                          <EffectSliderControls
                            settings={getEffectSettings("noise", DEFAULT_NOISE)}
                            onChange={(patch) => updateEffectSettings("noise", patch)}
                            controls={[{ key: "amount", label: "Amount", min: 0, max: 0.5, step: 0.01 }]}
                          />
                        )}
                        {on && eff.id === "kaleidoscope" && (
                          <EffectSliderControls
                            settings={getEffectSettings("kaleidoscope", DEFAULT_KALEIDOSCOPE)}
                            onChange={(patch) => updateEffectSettings("kaleidoscope", patch)}
                            controls={[{ key: "segments", label: "Segments", min: 2, max: 24, step: 1 }]}
                          />
                        )}
                        {on && eff.id === "ripple" && (
                          <EffectSliderControls
                            settings={getEffectSettings("ripple", DEFAULT_RIPPLE)}
                            onChange={(patch) => updateEffectSettings("ripple", patch)}
                            controls={[
                              { key: "amplitude", label: "Amplitude", min: 1, max: 30, step: 1 },
                              { key: "frequency", label: "Frequency", min: 1, max: 50, step: 1 },
                            ]}
                          />
                        )}
                        {on && eff.id === "ascii" && (
                          <EffectASCIIControls
                            settings={getEffectSettings("ascii", DEFAULT_ASCII)}
                            onChange={(patch) => updateEffectSettings("ascii", patch)}
                          />
                        )}
                        {on && eff.id === "receipt" && (
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
                        {on && eff.id === "crt" && (
                          <EffectCRTControls
                            settings={getEffectSettings("crt", DEFAULT_CRT)}
                            onChange={(patch) => updateEffectSettings("crt", patch)}
                          />
                        )}
                        {on && eff.id === "threshold" && (
                          <EffectThresholdControls
                            settings={getEffectSettings("threshold", DEFAULT_THRESHOLD)}
                            onChange={(patch) => updateEffectSettings("threshold", patch)}
                          />
                        )}
                        {on && eff.id === "rgb-shift" && (
                          <EffectRGBShiftControls
                            settings={getEffectSettings("rgb-shift", DEFAULT_RGB_SHIFT)}
                            onChange={(patch) => updateEffectSettings("rgb-shift", patch)}
                          />
                        )}
                        {on && eff.id === "motion-trail" && (
                          <EffectMotionTrailControls
                            settings={getEffectSettings("motion-trail", DEFAULT_MOTION_TRAIL)}
                            onChange={(patch) => updateEffectSettings("motion-trail", patch)}
                          />
                        )}
                        {on && eff.id === "bloom" && (
                          <EffectBloomControls
                            settings={getEffectSettings("bloom", DEFAULT_BLOOM)}
                            onChange={(patch) => updateEffectSettings("bloom", patch)}
                          />
                        )}
                        {on && eff.id === "emboss" && (
                          <EffectEmbossControls
                            settings={getEffectSettings("emboss", DEFAULT_EMBOSS)}
                            onChange={(patch) => updateEffectSettings("emboss", patch)}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>

          <aside className="editor-preview">
            <div className="preview-header">
              <span>Preview</span>
              {currentImage && (
                <div className="zoom-controls">
                  <button className="icon-btn zoom-btn" onClick={zoomOut} title="Zoom out">−</button>
                  <span className="zoom-label">{zoom < 0 ? "Fit" : `${Math.round(zoom * 100)}%`}</span>
                  <button className="icon-btn zoom-btn" onClick={zoomIn} title="Zoom in">+</button>
                  <button className="icon-btn zoom-btn" onClick={zoomReset} title="Fit to container">⊡</button>
                  <button className="icon-btn zoom-btn" onClick={zoomOneToOne} title="Actual size">1:1</button>
                </div>
              )}
            </div>
            <div
              className="preview-content"
              ref={previewRef}
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{ cursor: zoom >= 0 ? (panning ? "grabbing" : "grab") : "default" }}
            >
              {currentImage ? (
                <div style={{
                  transform: zoom >= 0 ? `translate(${panX}px, ${panY}px) scale(${zoom})` : "none",
                  transition: panning ? "none" : "transform 0.15s ease",
                  transformOrigin: "center center",
                  lineHeight: 0,
                }}>
                  <ImageWithSkeleton
                    src={compare === "original" ? currentImage.src : (activeEffects.length > 0 && effectResultSrc ? effectResultSrc : currentImage.src)}
                    alt="Final output"
                    imgStyle={{ filter: compare === "edited" ? getCombinedFilterString() : "none", maxWidth: zoom >= 0 ? "none" : undefined, maxHeight: zoom >= 0 ? "none" : undefined }}
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
            {/* Source image */}
            <div className="source-section">
              <div className="workspace-section-header">
                <span>Source</span>
                {currentImage && <button className="link-quiet" onClick={() => fileInputRef.current?.click()}>Change image</button>}
              </div>
              {currentImage ? (
                <div className="source-info">
                  <div className="source-thumb">
                    <ImageWithSkeleton src={currentImage.src} alt="" />
                  </div>
                  <div className="source-name">{currentImage.name}</div>
                </div>
              ) : (
                <div className="upload-zone" onClick={() => fileInputRef.current?.click()}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 16V4" /><path d="M6 10l6-6 6 6" /><path d="M4 20h16" />
                  </svg>
                  <span>Upload an image</span>
                </div>
              )}
            </div>

            {/* Layers */}
            <div className="layers-section">
              <div className="workspace-section-header">
                <span>Effects ({layers.length + activeEffects.length})</span>
                <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                  <button className="icon-btn" onClick={undo} disabled={undoStack.length === 0} title="Undo (Ctrl+Z)" style={{ fontSize: "14px" }}>&#x21A9;</button>
                  <button className="icon-btn" onClick={redo} disabled={redoStack.length === 0} title="Redo (Ctrl+Shift+Z)" style={{ fontSize: "14px" }}>&#x21AA;</button>
                  <button className="btn btn-ghost" onClick={() => addLayer("mono")} style={{ padding: "4px 10px", fontSize: "12px" }}>+ Add</button>
                </div>
              </div>
              {layers.length === 0 && activeEffects.length === 0 ? (
                <div className="layers-empty">
                  Click a preset or effect to add a layer
                </div>
              ) : (
                <div className="layers-list">
                  {layers.map((layer, i) => {
                    const builtin = PRESETS.find((p) => p.id === layer.presetId);
                    const user = userPresets.find((p) => p.id === layer.presetId);
                    const layerPreset = builtin || user;
                    const layerName = builtin?.name || user?.name || layer.presetId;
                    return (
                      <div
                        key={layer.id}
                        className={`layer-item ${!layer.enabled ? "layer-disabled" : ""} ${dragIndex === i ? "layer-dragging" : ""}`}
                        draggable
                        onDragStart={() => handleDragStart(i)}
                        onDragOver={(e) => handleDragOver(e, i)}
                        onDragEnd={handleDragEnd}
                      >
                        <div className="layer-top">
                          <div className="layer-left">
                            <span className="layer-index layer-grip">{i + 1}</span>
                            <div className="layer-thumb-small">
                              {currentImage && (
                                <img src={currentImage.src} alt="" style={{ filter: resolvePresetFilter(layer.presetId, layer.intensity) }} />
                              )}
                            </div>
                            <div>
                              <div className="layer-name">{layerName}</div>
                              <div className="layer-intensity-label">{layer.intensity}%</div>
                            </div>
                          </div>
                          <div className="layer-actions">
                            <button className="icon-btn" onClick={() => toggleLayer(layer.id)} title={layer.enabled ? "Disable" : "Enable"}>
                              {layer.enabled ? (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              ) : (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                                  <path d="M1 1l22 22" />
                                </svg>
                              )}
                            </button>
                            <button className="icon-btn" onClick={() => moveLayer(layer.id, "up")} disabled={i === 0} title="Move up">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6" /></svg>
                            </button>
                            <button className="icon-btn" onClick={() => moveLayer(layer.id, "down")} disabled={i === layers.length - 1} title="Move down">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
                            </button>
                            <button className="icon-btn" onClick={() => removeLayer(layer.id)} title="Remove" style={{ color: "var(--ink-muted)" }}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18" /><path d="M6 6l12 12" /></svg>
                            </button>
                          </div>
                        </div>
                        <div className="layer-slider-row">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={layer.intensity}
                            onChange={(e) => updateLayerIntensity(layer.id, Number(e.target.value))}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {activeEffects.map((effId, i) => {
                    const def = EFFECTS.find((e) => e.id === effId);
                    return (
                      <div key={effId} className="layer-item layer-effect-item">
                        <div className="layer-top">
                          <div className="layer-left">
                            <span className="layer-index">{layers.length + i + 1}</span>
                            <div className="layer-thumb-small layer-icon-thumb">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                                <rect x="2" y="2" width="20" height="20" rx="2.5" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            </div>
                            <div>
                              <div className="layer-name">{def?.name || effId}</div>
                              <span className="effect-badge" style={{ fontSize: 10, padding: "1px 6px" }}>canvas</span>
                            </div>
                          </div>
                          <div className="layer-actions">
                            <button className="icon-btn" onClick={() => toggleEffect(effId)} title="Remove effect">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--ink-muted)" }}>
                                <path d="M18 6L6 18" /><path d="M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="export-bar">
          <div className="export-left">
            <span style={{ fontSize: "13px", color: "var(--ink-muted)" }}>Export as</span>
            <select className="export-select" defaultValue="jpeg">
              <option value="jpeg">JPEG</option>
              <option value="png">PNG</option>
              <option value="webp">WebP</option>
            </select>
            <span style={{ fontSize: "13px", color: "var(--ink-muted)" }}>Quality</span>
            <select className="export-select" defaultValue="92">
              <option value="80">Standard</option>
              <option value="92">High</option>
              <option value="100">Maximum</option>
            </select>
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
      </section>

      <div className={`modal-backdrop ${showExport ? "show" : ""}`} onClick={() => setShowExport(false)} />
      <div className={`modal ${showExport ? "show" : ""}`}>
        <div className="modal-preview">
          {currentImage && <ImageWithSkeleton src={activeEffects.length > 0 && effectResultSrc ? effectResultSrc : currentImage.src} alt="Final preview" imgStyle={{ filter: compare === "edited" ? getCombinedFilterString() : "none" }} />}
        </div>
        {guestMode && (
          <p style={{ fontSize: "12px", color: "var(--ink-muted)", textAlign: "center", margin: "0 0 12px" }}>
            Sign in to download. Edits are ready — they won&apos;t be lost.
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

function EffectSliderControls({ settings, onChange, controls }: {
  settings: Record<string, any>;
  onChange: (patch: Record<string, any>) => void;
  controls: { key: string; label: string; min: number; max: number; step: number }[];
}) {
  return (
    <div className="effect-controls">
      {controls.map((c) => (
        <div key={c.key} className="effect-control">
          <label>{c.label} ({settings[c.key]})</label>
          <input type="range" min={c.min} max={c.max} step={c.step} value={settings[c.key]} onChange={(e) => onChange({ [c.key]: +e.target.value })} />
        </div>
      ))}
    </div>
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
        <div className="effect-control">
          <label>Scale ({settings.patternScale.toFixed(2)})</label>
          <input type="range" min="0.3" max="3.5" step="0.01" value={settings.patternScale} onChange={(e) => onChange({ patternScale: +e.target.value })} />
        </div>
        <div className="effect-control">
          <label>Brightness ({settings.brightness})</label>
          <input type="range" min="0" max="255" step="1" value={settings.brightness} onChange={(e) => onChange({ brightness: +e.target.value })} />
        </div>
        <div className="effect-control">
          <label>Contrast ({settings.contrast.toFixed(2)})</label>
          <input type="range" min="0.3" max="3" step="0.01" value={settings.contrast} onChange={(e) => onChange({ contrast: +e.target.value })} />
        </div>
        <div className="effect-control">
          <label>Offset ({settings.thresholdOffset.toFixed(3)})</label>
          <input type="range" min="-0.4" max="0.4" step="0.005" value={settings.thresholdOffset} onChange={(e) => onChange({ thresholdOffset: +e.target.value })} />
        </div>
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
      <div className="effect-control">
        <label>Strength ({settings.strength})</label>
        <input type="range" min="1" max="50" step="1" value={settings.strength} onChange={(e) => onChange({ strength: +e.target.value })} />
      </div>
      <div className="effect-control">
        <label>Center X ({settings.centerX})</label>
        <input type="range" min="0" max="100" step="1" value={settings.centerX} onChange={(e) => onChange({ centerX: +e.target.value })} />
      </div>
      <div className="effect-control">
        <label>Center Y ({settings.centerY})</label>
        <input type="range" min="0" max="100" step="1" value={settings.centerY} onChange={(e) => onChange({ centerY: +e.target.value })} />
      </div>
      <div className="effect-control">
        <label>Quality ({settings.quality})</label>
        <input type="range" min="2" max="30" step="1" value={settings.quality} onChange={(e) => onChange({ quality: +e.target.value })} />
      </div>
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
      <div className="effect-control">
        <label>Scale ({settings.scale})</label>
        <input type="range" min="1" max="12" step="1" value={settings.scale} onChange={(e) => onChange({ scale: +e.target.value })} />
      </div>
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
      <div className="effect-control">
        <label>Scanlines ({settings.scanlines})</label>
        <input type="range" min="1" max="8" step="1" value={settings.scanlines} onChange={(e) => onChange({ scanlines: +e.target.value })} />
      </div>
      <div className="effect-control">
        <label>Curvature ({settings.curvature})</label>
        <input type="range" min="0" max="30" step="1" value={settings.curvature} onChange={(e) => onChange({ curvature: +e.target.value })} />
      </div>
      <div className="effect-control">
        <label>Glow ({settings.glow})</label>
        <input type="range" min="0" max="1" step="0.05" value={settings.glow} onChange={(e) => onChange({ glow: +e.target.value })} />
      </div>
      <div className="effect-control">
        <label>Flicker ({settings.flicker})</label>
        <input type="range" min="0" max="0.3" step="0.01" value={settings.flicker} onChange={(e) => onChange({ flicker: +e.target.value })} />
      </div>
    </div>
  );
}

function EffectThresholdControls({ settings, onChange }: { settings: any; onChange: (patch: Record<string, any>) => void }) {
  return (
    <div className="effect-controls">
      <div className="effect-control">
        <label>Level ({settings.level})</label>
        <input type="range" min="0" max="255" step="1" value={settings.level} onChange={(e) => onChange({ level: +e.target.value })} />
      </div>
      <div className="effect-control">
        <label>Softness ({settings.softness})</label>
        <input type="range" min="0" max="50" step="1" value={settings.softness} onChange={(e) => onChange({ softness: +e.target.value })} />
      </div>
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
      <div className="effect-control">
        <label>Shift X ({settings.shiftX})</label>
        <input type="range" min="-20" max="20" step="1" value={settings.shiftX} onChange={(e) => onChange({ shiftX: +e.target.value })} />
      </div>
      <div className="effect-control">
        <label>Shift Y ({settings.shiftY})</label>
        <input type="range" min="-20" max="20" step="1" value={settings.shiftY} onChange={(e) => onChange({ shiftY: +e.target.value })} />
      </div>
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
      <div className="effect-control">
        <label>Length ({settings.length})</label>
        <input type="range" min="1" max="40" step="1" value={settings.length} onChange={(e) => onChange({ length: +e.target.value })} />
      </div>
      <div className="effect-control">
        <label>Decay ({settings.decay})</label>
        <input type="range" min="0.1" max="1" step="0.05" value={settings.decay} onChange={(e) => onChange({ decay: +e.target.value })} />
      </div>
      <div className="effect-control">
        <label>Angle ({settings.angle})</label>
        <input type="range" min="0" max="360" step="1" value={settings.angle} onChange={(e) => onChange({ angle: +e.target.value })} />
      </div>
    </div>
  );
}

function EffectBloomControls({ settings, onChange }: { settings: any; onChange: (patch: Record<string, any>) => void }) {
  return (
    <div className="effect-controls">
      <div className="effect-control">
        <label>Threshold ({settings.threshold})</label>
        <input type="range" min="50" max="255" step="1" value={settings.threshold} onChange={(e) => onChange({ threshold: +e.target.value })} />
      </div>
      <div className="effect-control">
        <label>Radius ({settings.radius})</label>
        <input type="range" min="1" max="10" step="1" value={settings.radius} onChange={(e) => onChange({ radius: +e.target.value })} />
      </div>
      <div className="effect-control">
        <label>Intensity ({settings.intensity})</label>
        <input type="range" min="0" max="2" step="0.05" value={settings.intensity} onChange={(e) => onChange({ intensity: +e.target.value })} />
      </div>
    </div>
  );
}

function EffectEmbossControls({ settings, onChange }: { settings: any; onChange: (patch: Record<string, any>) => void }) {
  return (
    <div className="effect-controls">
      <div className="effect-control">
        <label>Strength ({settings.strength})</label>
        <input type="range" min="0.5" max="10" step="0.5" value={settings.strength} onChange={(e) => onChange({ strength: +e.target.value })} />
      </div>
      <div className="effect-control">
        <label>Angle ({settings.angle})</label>
        <input type="range" min="0" max="360" step="1" value={settings.angle} onChange={(e) => onChange({ angle: +e.target.value })} />
      </div>
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


