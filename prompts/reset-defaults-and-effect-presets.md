# Reset to defaults + Effect presets

## Goal
Add two features: (1) a reset button on each effect's control panel to restore its default settings, and (2) the ability to save/apply named presets combining active effects + their settings.

## Skills read
- architect

## Existing code inspected
- `app/effects.ts` — all `DEFAULT_*` constants, `EFFECTS` array, `EffectId` type
- `app/components/editor/EffectControls.tsx` — generic slider/select controls
- `app/types.ts` — all types including `SavedPreset`
- `app/page.tsx` — effect settings state, effect control rendering, existing preset save/apply flow, `EFFECT_DEFAULTS` lookup map
- `app/presets.ts` — existing CSS-filter preset system (separate from canvas effects)
- `app/halftone.ts` — `DEFAULT_HALFTONE_SETTINGS`

## Decisions / Assumptions
- Reset button: placed at the bottom of each effect's control group, small text button "Reset defaults"
- Effect presets are separate from existing CSS-filter presets (saved in `savedPresets`)
- Effect presets persist via localStorage for signed-in users
- A new `EffectPreset` type will be added to `app/types.ts`
- Effect presets UI lives in the effects sidebar tab, after the effects list
- No changes to existing CSS-filter preset system

## Files likely to change
- `app/types.ts` — new `EffectPreset` interface
- `app/page.tsx` — reset logic, effect preset state/functions, UI
- `app/globals.css` — styles for reset button, effect preset rows

## Implementation requirements

### Reset to defaults
1. Add a "Reset defaults" button at the bottom of each effect's control section (inside the existing `{on && eff.id === "xxx" && (...)}` blocks)
2. The button calls `updateEffectSettings(eff.id, EFFECT_DEFAULTS[eff.id])` to reset all sliders for that effect
3. Style: small muted text button, `font-size: 11px`, `color: var(--ink-muted)`, `cursor: pointer`, on hover turns accent color
4. For the already-collapsed generic `EffectSliderControls`, add the reset button after the component
5. For each custom control component, add the reset button below the component

### Effect presets
1. New type in `types.ts`:
   ```ts
   export interface EffectPreset {
     id: string;
     name: string;
     effects: { id: EffectId; settings: Record<string, any> }[];
   }
   ```
2. New `effectPresets` state in `page.tsx`
3. Load from localStorage on mount (under `localStorage-key-effect-presets`)
4. Save effect preset: captures `activeEffects` + `effectSettings` for each active effect
5. Apply effect preset: sets `activeEffects` and `effectSettings` from the preset
6. Delete effect preset
7. UI: in the effects panel, after the effects list, add a "Save as effect preset" button and a list of saved effect presets with "Apply" and "Delete" buttons
8. Persist to localStorage whenever `effectPresets` changes

## Security requirements
- Only store effect configurations (no image data or user PII)

## Acceptance criteria
- Each effect's controls have a "Reset defaults" button that restores all sliders to their default values
- "Reset defaults" triggers a re-render of the preview with default settings
- User can save the current combination of active effects + settings as a named preset
- User can see a list of saved effect presets
- User can apply a saved effect preset (restores effects + settings)
- User can delete a saved effect preset
- Effect presets persist across page reloads via localStorage

## Checks to run
- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`

## Exact manual test steps
1. Open editor, add pixelate effect, change block size to 20 — click "Reset defaults" — block size returns to 8
2. Add multiple effects with various settings — click "Save as effect preset" and name it
3. Reload page — see saved effect preset in the list
4. Click "Apply" on the saved preset — effects and their settings are restored
5. Click "Delete" — preset is removed
