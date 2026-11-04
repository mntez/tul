# Profile Controls and Effect Support

## Goal

Bring the editor’s preset/profile controls closer to the supplied Dehancer reference. Keep the 40 profiles already imported from `tultul/profiles`, and let users inspect and adjust the actual settings behind the supported film-processing modules. Changes must update the existing non-destructive image processing pipeline and be included when the user saves/applies a saved preset.

## Skills read

- `.agents/skills/architect/SKILL.md`

Before implementation, also read the relevant Next.js 16 guide under `node_modules/next/dist/docs/` and inspect existing project conventions for theme tokens and image processing. Do not use unapproved skills.

## Existing code and data inspected

- `app/page.tsx`: profile selection, effect chain, worker usage, settings inspector and saved preset flow.
- `app/profile-catalog.ts`: 40 profile entries over Bloom (4), Dirt (4), Photo Dirt (4), Film Breath (4), Gate Weave (4), Grain (12), and Halation (8).
- `app/profile-effects.ts`: current pixel-processing implementations for the imported profile families.
- `app/profile-worker.ts`: worker entry point for profile processing.
- `app/components/editor/EffectControls.tsx`: reusable range and numeric value inputs.
- `app/effects.ts`: existing still-image effect processors.
- `tultul/profiles/**/*.json`: per-family profile values and parameter ranges.
- `tultul/branded_presets/*.dhpreset`: full nested preset state, including Source/Developer, Film Compression, Expand, Print/Color Head, Grain, Bloom, Halation, Vignette, Film Damage, and Overscan.
- Existing modified files and untracked prompt/data files were present before this task. Preserve unrelated edits.

## Decisions and assumptions

- The screenshot is a reference for the available processing controls, not a request to replace the existing preset catalog again.
- Keep the current profile browser and preset-only layer workflow.
- Make the profile-specific controls editable in an inspector panel, with values and ranges sourced from the profile data or the matching `.dhpreset` schema where applicable.
- Use existing family profile values as the starting point when a profile is selected. Provide explicit defaults for global modules that have no corresponding value in the selected profile.
- A control must either change the rendered image or be clearly unavailable for still-image processing. Do not add controls that look functional but do nothing.
- Treat the supplied `.dhpreset` files as untrusted data: validate nested values and clamp numeric inputs before applying or persisting them.
- The current editor targets still images. Do not introduce video/timeline infrastructure as part of this change.

## Files likely to change

- `app/page.tsx` — inspector composition, selected profile/settings state, saved preset state integration.
- `app/profile-catalog.ts` — typed module definitions and safe profile setting access if needed.
- `app/profile-effects.ts` — processing implementations and module dispatch.
- `app/profile-worker.ts` — structured-clone-safe worker messages and processing dispatch.
- `app/types.ts` — explicit typed processing settings and persistence shape.
- `app/components/editor/EffectControls.tsx` and/or new focused components under `app/components/editor/` — controls UI.
- `app/globals.css` — responsive minimal inspector styling.
- A new prompt file is the only file to create before approval; implementation files must not be edited until approval.

## Implementation requirements

1. Define explicit TypeScript types for the editor’s processing settings. Model numeric values with validated ranges and model switches/selects explicitly; avoid `any`.
2. Build compact, collapsible control groups based on the reference:
   - Source: exposure compensation, temperature/tint compensation, defringe and radius.
   - Film Developer: contrast boost, gamma correction, color separation/boost.
   - Film Compression: impact, white point, tonal range, color density.
   - Expand: black/white point and color mode.
   - Print: profile, target white, exposure, tonal contrast, color density, saturation, analogue range limiter.
   - Color Head: yellow/blue, magenta/green, cyan/red, gang, shadows/midtones/highlights tone, preserve exposure, impact.
   - Vignette: exposure, size, feather, aspect ratio.
   - Film Grain: size, amount, resolution, tonal balance, color, film type, mode.
   - Halation and Bloom: profile selector and the family-specific controls already represented by imported profile data.
   - Film Damage: dust/scratches/hairs toggles and their amounts/scales/balance, total amount, global opacity/chromaticity, deterministic refresh/seed behavior.
   - Overscan: gate type/shape, perforation mode, film orientation, exposure, scale, lens zoom, offsets, gate defocus.
   - Film Breath and Gate Weave: profile, period/length, exposure/contrast/color impact, translation/rotation/scale, and auto zoom controls for still-image approximations.
3. Match reference behavior where possible: module-level enabled toggles and reset-to-default actions; proper numeric value editing; sliders paired with readable value fields.
4. Selecting a profile must seed its matching family settings. Editing controls should update the active processing settings and preview; selecting another profile should load its profile values without losing unrelated module settings.
5. Keep UI separate from image processing. Implement algorithms only in the effects layer and invoke them through the existing worker path. Use deterministic randomness for repeatable still-image rendering.
6. Integrate saved preset serialization with the new settings while remaining compatible with existing saved preset data in localStorage; validate and safely ignore malformed/obsolete settings.
7. Keep processing responsive for large images. Avoid repeated full-resolution allocations where possible; continue using the worker for expensive passes and cancel/ignore stale work.
8. Preserve the existing editor’s minimal dark visual style and current preset/layer behavior. Use shared spacing, borders, typography, and tokens; do not reintroduce a layer stack for effects.
9. Make the settings panel scrollable and usable at narrow widths. Ensure controls remain keyboard accessible with labels, focus states, and sensible hit targets.

## Security and data handling

- Parse imported preset data as unknown and validate before use.
- Clamp every number to an explicit allowed range and reject NaN/Infinity.
- Do not evaluate strings or expose browser secrets.
- Keep persistence local to the existing application storage patterns.
- Keep all image processing on the client and do not upload user images.

## Acceptance criteria

- The existing 40 profiles remain available and can be applied.
- Selecting a profile exposes the relevant editable module settings with the profile’s current values.
- Each visible setting either changes the preview as expected or is disabled with a clear reason because it requires temporal/video processing.
- Toggling modules on/off and editing settings updates the preview without blocking the UI.
- Saving and reapplying a user preset restores both the profile composition and edited module settings.
- Existing localStorage data remains readable and malformed settings cannot crash the editor.
- UI follows the supplied reference’s compact settings-panel layout and works at desktop and mobile widths.
- No unrelated editor behavior or existing user edits are lost.

## Checks to run

- `npm run typecheck` (if unavailable, run `npx tsc --noEmit` and report that fallback).
- `npm run lint`.
- `npm run build`.
- Report exact command results; do not claim success without running them.

## Manual test steps

1. Start with `npm run dev`, open the editor, and load a sample image.
2. Select at least one profile from each imported family; verify its controls initialize from that profile and the preview updates.
3. Change a slider, type a numeric value, toggle a module, and reset the module; verify the resulting preview and displayed values.
4. Select a different profile and confirm unrelated settings remain intact.
5. Save the composition as a preset, reload/reapply it, and confirm profile selection and modified controls restore.
6. Reload the page with existing localStorage data and verify no crash or data loss.
7. Test the scroll behavior and keyboard operation at desktop and narrow viewport widths.
8. Confirm Film Breath and Gate Weave controls produce stable still-image results without adding video or timeline infrastructure.

