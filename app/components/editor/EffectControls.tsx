"use client";

import { useEffect, useRef } from "react";

interface RangeValueControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  unit?: string;
  disabled?: boolean;
}

function formatStepValue(value: number, step: number) {
  const decimalPlaces = Math.min(step.toString().split(".")[1]?.length ?? 0, 10);
  return Number(value.toFixed(decimalPlaces)).toString();
}

function normalizeRangeValue(rawValue: string, fallback: number, min: number, max: number, step: number) {
  const normalizedInput = rawValue.trim().replace(",", ".");
  const entered = normalizedInput === "" ? Number.NaN : Number(normalizedInput);
  const bounded = Number.isFinite(entered) ? Math.min(max, Math.max(min, entered)) : fallback;
  const stepsFromMin = Math.round((bounded - min) / step);
  const decimalPlaces = Math.min(step.toString().split(".")[1]?.length ?? 0, 10);
  const snapped = Number((min + stepsFromMin * step).toFixed(decimalPlaces));
  return Math.min(max, Math.max(min, snapped));
}

export function RangeValueControl({ label, value, min, max, step, onChange, unit, disabled = false }: RangeValueControlProps) {
  const numberRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const input = numberRef.current;
    if (input && document.activeElement !== input) {
      input.value = formatStepValue(value, step);
    }
  }, [step, value]);

  const commitNumber = (input: HTMLInputElement) => {
    const normalized = normalizeRangeValue(input.value, value, min, max, step);
    input.value = formatStepValue(normalized, step);
    onChange(normalized);
  };

  return (
    <div className="range-value-control">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-label={label}
        onChange={(event) => onChange(event.currentTarget.valueAsNumber)}
      />
      <span className={`range-number-wrap ${unit ? "has-unit" : ""}`}>
        <input
          ref={numberRef}
          type="text"
          inputMode="decimal"
          defaultValue={formatStepValue(value, step)}
          disabled={disabled}
          role="spinbutton"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-label={`${label} value`}
          onChange={(event) => {
            const rawValue = event.currentTarget.value.trim().replace(",", ".");
            const entered = rawValue === "" ? Number.NaN : Number(rawValue);
            if (Number.isFinite(entered) && entered >= min && entered <= max) onChange(entered);
          }}
          onBlur={(event) => commitNumber(event.currentTarget)}
          onDoubleClick={(event) => {
            event.currentTarget.focus();
            event.currentTarget.select();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "ArrowUp" || event.key === "ArrowDown") {
              event.preventDefault();
              const current = Number(event.currentTarget.value);
              const baseValue = Number.isFinite(current) ? current : value;
              const increment = event.key === "ArrowUp" ? step : -step;
              const nextValue = normalizeRangeValue(String(baseValue + increment), value, min, max, step);
              event.currentTarget.value = formatStepValue(nextValue, step);
              onChange(nextValue);
            }
            if (event.key === "Escape") {
              event.currentTarget.value = formatStepValue(value, step);
              event.currentTarget.blur();
            }
          }}
        />
        {unit && <span className="range-number-unit" aria-hidden="true">{unit}</span>}
      </span>
    </div>
  );
}

interface Props {
  settings: object;
  onChange: (patch: Record<string, unknown>) => void;
  controls: { key: string; label: string; type?: string; options?: { value: string; label: string }[]; min?: number; max?: number; step?: number }[];
}

export default function EffectSliderControls({ settings, onChange, controls }: Props) {
  return controls.map((ctrl) => {
    const settingValue = (settings as Record<string, unknown>)[ctrl.key];
    if (ctrl.type === "select" && ctrl.options) {
      return (
        <label key={ctrl.key} className="effect-control">
          <span>{ctrl.label}</span>
          <select value={typeof settingValue === "string" ? settingValue : ""} onChange={(e) => onChange({ [ctrl.key]: e.target.value })}>
            {ctrl.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
      );
    }
    if (!ctrl.type || ctrl.type === "range") {
      return (
        <div key={ctrl.key} className="effect-control">
          <span className="effect-control-label">{ctrl.label}</span>
          <RangeValueControl
            label={ctrl.label}
            min={ctrl.min ?? 0}
            max={ctrl.max ?? 100}
            step={ctrl.step ?? 1}
            value={typeof settingValue === "number" ? settingValue : 0}
            onChange={(value) => onChange({ [ctrl.key]: value })}
          />
        </div>
      );
    }
    return null;
  });
}
