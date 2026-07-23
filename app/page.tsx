"use client";

import { useState, useRef, useCallback } from "react";

const PRESETS = [
  { id: "original", name: "Original", filter: () => "none" },
  { id: "mono", name: "Mono", filter: (i: number) => `grayscale(${i}%) contrast(${100 + i * 0.15}%)` },
  { id: "warm", name: "Warm", filter: (i: number) => `sepia(${i * 0.4}%) saturate(${100 + i * 0.35}%) brightness(${100 + i * 0.05}%)` },
  { id: "cool", name: "Cool", filter: (i: number) => `hue-rotate(${i * 1.8}deg) saturate(${100 - i * 0.1}%) brightness(${100 + i * 0.08}%)` },
  { id: "fade", name: "Fade", filter: (i: number) => `contrast(${100 - i * 0.25}%) brightness(${100 + i * 0.15}%) saturate(${100 - i * 0.35}%)` },
  { id: "noir", name: "Noir", filter: (i: number) => `grayscale(${i}%) contrast(${100 + i * 0.35}%) brightness(${100 - i * 0.1}%)` },
  { id: "vivid", name: "Vivid", filter: (i: number) => `saturate(${100 + i * 0.6}%) contrast(${100 + i * 0.15}%)` },
];

interface EffectLayer {
  id: string;
  presetId: string;
  intensity: number;
  enabled: boolean;
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
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [currentImage, setCurrentImage] = useState<CurrentImage | null>(null);
  const [recentEdits, setRecentEdits] = useState<RecentEdit[]>([]);
  const [layers, setLayers] = useState<EffectLayer[]>([]);
  const [compare, setCompare] = useState<"edited" | "original">("edited");
  const [showExport, setShowExport] = useState(false);
  const [emailFieldsOpen, setEmailFieldsOpen] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [passInput, setPassInput] = useState("");
  const [sidebarTab, setSidebarTab] = useState<"presets" | "effects">("presets");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showScreen = useCallback((id: "onboarding" | "auth" | "home" | "editor") => {
    setScreen(id);
  }, []);

  const mockLogin = useCallback((name: string) => {
    const userName = name === "Guest" ? "Guest" : emailInput || name;
    setUser({ name: userName });
    showScreen("home");
  }, [emailInput, showScreen]);

  const logout = useCallback(() => {
    setUser(null);
    showScreen("auth");
  }, [showScreen]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCurrentImage({ src: ev.target?.result as string, name: file.name });
      setLayers([]);
      setCompare("edited");
      showScreen("editor");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, [showScreen]);

  const getCombinedFilterString = useCallback(() => {
    const parts = layers
      .filter((l) => l.enabled)
      .map((l) => {
        const preset = PRESETS.find((p) => p.id === l.presetId);
        return preset ? preset.filter(l.intensity) : "";
      })
      .filter(Boolean);
    return parts.length ? parts.join(" ") : "none";
  }, [layers]);

  const addLayer = useCallback((presetId: string) => {
    if (presetId === "original") {
      setLayers([]);
      return;
    }
    setLayers((prev) => [
      ...prev,
      { id: Date.now().toString(), presetId, intensity: 100, enabled: true },
    ]);
  }, []);

  const removeLayer = useCallback((id: string) => {
    setLayers((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const updateLayerIntensity = useCallback((id: string, intensity: number) => {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, intensity } : l)));
  }, []);

  const toggleLayer = useCallback((id: string) => {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, enabled: !l.enabled } : l)));
  }, []);

  const moveLayer = useCallback((id: string, dir: "up" | "down") => {
    setLayers((prev) => {
      const idx = prev.findIndex((l) => l.id === id);
      if (idx === -1) return prev;
      const next = dir === "up" ? idx - 1 : idx + 1;
      if (next < 0 || next >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr;
    });
  }, []);

  const recordEdit = useCallback(() => {
    if (!currentImage) return;
    setRecentEdits((prev) => [
      ...prev,
      { id: Date.now(), src: currentImage.src, layers: [...layers] },
    ]);
  }, [currentImage, layers]);

  const openEditorWithRecent = useCallback(
    (edit: RecentEdit) => {
      setCurrentImage({ src: edit.src, name: "reopened" });
      setLayers(edit.layers);
      showScreen("editor");
    },
    [showScreen]
  );

  const bakeImageToCanvas = useCallback(
    (callback: (canvas: HTMLCanvasElement) => void) => {
      if (!currentImage) return;
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
      img.src = currentImage.src;
    },
    [currentImage, getCombinedFilterString]
  );

  const bakeAndDownload = useCallback(() => {
    bakeImageToCanvas((canvas) => {
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "tul-edit.jpg";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        recordEdit();
        setShowExport(false);
      }, "image/jpeg", 0.92);
    });
  }, [bakeImageToCanvas, recordEdit]);

  const shareImage = useCallback(() => {
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
  }, [bakeImageToCanvas, recordEdit]);

  const presetIdsInUse = new Set(layers.map((l) => l.presetId));

  return (
    <>
      <section className={`screen screen-onboarding ${screen === "onboarding" ? "active" : ""}`}>
        <div className="onboard-content">
          <div className="onboard-art">
            <div className="split">
              <div className="left"></div>
              <div className="right"></div>
            </div>
            <div className="divider"></div>
            <div className="tag">before / after</div>
          </div>
          <p className="onboard-eyebrow">tul</p>
          <h1 className="onboard-h1">
            Upload a photo.<br />
            Pick a look.<br />
            <em>Done.</em>
          </h1>
          <p className="onboard-lede">
            No sliders to learn, no filters to fight with — just presets built
            to make your photos better in one tap.
          </p>
          <button className="btn btn-primary" onClick={() => showScreen("auth")} style={{ padding: "12px 32px", fontSize: "15px" }}>
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
            <button className="btn btn-primary btn-block" onClick={() => mockLogin("Google")}>
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M21.6 12.23c0-.68-.06-1.36-.18-2H12v3.79h5.4a4.6 4.6 0 01-2 3.02v2.5h3.24c1.9-1.75 3-4.32 3-7.31z" fill="#fff" />
                <path d="M12 22c2.7 0 4.97-.9 6.63-2.44l-3.24-2.5c-.9.6-2.06.96-3.39.96-2.6 0-4.8-1.76-5.6-4.12H3.05v2.58A10 10 0 0012 22z" fill="#fff" opacity=".8" />
                <path d="M6.4 13.9a5.98 5.98 0 010-3.8V7.52H3.05a10 10 0 000 8.96l3.35-2.58z" fill="#fff" opacity=".6" />
                <path d="M12 5.98c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.96 9.96 0 0012 2a10 10 0 00-8.95 5.52L6.4 10.1c.8-2.36 3-4.12 5.6-4.12z" fill="#fff" opacity=".9" />
              </svg>
              Continue with Google
            </button>
            <button className="btn btn-outline btn-block" onClick={() => setEmailFieldsOpen(!emailFieldsOpen)}>
              Continue with email
            </button>
            <div className={`email-fields ${emailFieldsOpen ? "open" : ""}`}>
              <input className="field" type="email" placeholder="Email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} />
              <input className="field" type="password" placeholder="Password" value={passInput} onChange={(e) => setPassInput(e.target.value)} />
              <button className="btn btn-primary btn-block" onClick={() => mockLogin("you")}>Continue</button>
            </div>
          </div>
          <div className="auth-footer">
            <button className="link-quiet" onClick={() => mockLogin("Guest")}>Skip for now — try it as a guest</button>
            <p className="fine">
              By continuing you agree to tul&apos;s Terms &amp; Privacy.<br />
              This demo signs you in locally — no account is created.
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
            <button className="btn btn-outline" onClick={() => fileInputRef.current?.click()}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 16V4" /><path d="M6 10l6-6 6 6" /><path d="M4 20h16" />
              </svg>
              Upload
            </button>
            <button className="avatar" onClick={logout} title="Sign out">
              {(user?.name || "?").trim().charAt(0).toUpperCase()}
            </button>
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
                      <img src={edit.src} alt="" />
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
            <button className="avatar" onClick={logout} title="Sign out">
              {(user?.name || "?").trim().charAt(0).toUpperCase()}
            </button>
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
              {PRESETS.filter((p) => p.id !== "original").map((p) => (
                <div
                  key={p.id}
                  className={`preset-thumb ${presetIdsInUse.has(p.id) ? "in-use" : ""}`}
                  onClick={() => addLayer(p.id)}
                >
                  {currentImage && <img src={currentImage.src} alt={p.name} style={{ filter: p.filter(100) }} />}
                  <span className="preset-label">{p.name}</span>
                </div>
              ))}
            </div>
          </aside>

          <div className="editor-workspace">
            {/* Source image */}
            <div className="source-section">
              <div className="workspace-section-header">
                <span>Source</span>
                {currentImage && <button className="link-quiet" onClick={() => fileInputRef.current?.click()}>Change</button>}
              </div>
              {currentImage ? (
                <div className="source-info">
                  <div className="source-thumb">
                    <img src={currentImage.src} alt="" />
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
                <span>Effects ({layers.length})</span>
                <button className="btn btn-ghost" onClick={() => addLayer("mono")} style={{ padding: "4px 10px", fontSize: "12px" }}>+ Add</button>
              </div>
              {layers.length === 0 ? (
                <div className="layers-empty">
                  Click a preset in the sidebar to add an effect layer
                </div>
              ) : (
                <div className="layers-list">
                  {layers.map((layer, i) => {
                    const preset = PRESETS.find((p) => p.id === layer.presetId);
                    return (
                      <div key={layer.id} className={`layer-item ${!layer.enabled ? "layer-disabled" : ""}`}>
                        <div className="layer-top">
                          <div className="layer-left">
                            <span className="layer-index">{i + 1}</span>
                            <div className="layer-thumb-small">
                              {currentImage && (
                                <img src={currentImage.src} alt="" style={{ filter: preset ? preset.filter(layer.intensity) : "none" }} />
                              )}
                            </div>
                            <div>
                              <div className="layer-name">{preset?.name || layer.presetId}</div>
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
                </div>
              )}
            </div>
          </div>

          <aside className="editor-preview">
            <div className="preview-header">Preview</div>
            <div className="preview-content">
              {currentImage ? (
                <img
                  src={currentImage.src}
                  alt="Final output"
                  style={{ filter: compare === "edited" ? getCombinedFilterString() : "none" }}
                />
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
          {currentImage && <img src={currentImage.src} alt="Final preview" style={{ filter: getCombinedFilterString() }} />}
        </div>
        <div className="modal-actions">
          <button className="btn btn-primary" onClick={bakeAndDownload}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12" /><path d="M8 11l4 4 4-4" /><path d="M5 19h14" />
            </svg>
            Download
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
