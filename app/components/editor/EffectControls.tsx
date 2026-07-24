"use client";

interface Props {
  settings: Record<string, any>;
  onChange: (patch: Record<string, any>) => void;
  controls: { key: string; label: string; type?: string; options?: { value: string; label: string }[]; min?: number; max?: number; step?: number }[];
}

export default function EffectSliderControls({ settings, onChange, controls }: Props) {
  return controls.map((ctrl) => {
    if (ctrl.type === "select" && ctrl.options) {
      return (
        <label key={ctrl.key} className="effect-control">
          <span>{ctrl.label}</span>
          <select value={settings[ctrl.key] ?? ""} onChange={(e) => onChange({ [ctrl.key]: e.target.value })}>
            {ctrl.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
      );
    }
    if (!ctrl.type || ctrl.type === "range") {
      return (
        <label key={ctrl.key} className="effect-control">
          <span>{ctrl.label}</span>
          <div className="effect-range">
            <input type="range" min={ctrl.min ?? 0} max={ctrl.max ?? 100} step={ctrl.step ?? 1} value={settings[ctrl.key] ?? 0} onChange={(e) => onChange({ [ctrl.key]: parseFloat(e.target.value) })} />
            <span className="range-value">{settings[ctrl.key] ?? 0}</span>
          </div>
        </label>
      );
    }
    return null;
  });
}
