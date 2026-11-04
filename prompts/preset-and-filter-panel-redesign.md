# Preset and Filter Panel Redesign

## Goal
Redesign the editor's Presets and Effects (filter) sidebar sections to follow the compact, image-led preset browser shown in the user's second reference, replacing the current square two-column preset thumbnails from the first reference while preserving all existing editing behavior.

## Skills read
- `.agents/skills/architect/SKILL.md`
- `.agents/skills/review/SKILL.md`

## Existing code inspected
- `app/page.tsx`: editor sidebar tabs, built-in and saved preset tiles, effect cards, effect controls and selection state.
- `app/presets.ts`: built-in presets and category membership.
- `app/types.ts`: effect and saved-preset types.
- `app/globals.css`: sidebar, preset thumbnail, and effect card styling.
- `AGENTS.md`: product scope, architecture, security, and workflow requirements.
- Reference images supplied in the request: current square preview grid and target compact two-column film-preset catalog.

## Decisions or assumptions
- “Filter section” refers to the existing **Effects** tab, since the application has Presets and Effects tabs and no separate Filters tab.
- Apply the target image's visual language to both tabs: compact two-column cards, larger landscape preview, readable title beneath, and a clear cyan/blue selected state. Preserve the app's existing theme tokens and restrained dark UI rather than copying the reference's entire palette literally.
- Preset preview images use the currently loaded image and the corresponding preset filter. Effect tiles preview the current image with their effect-specific ImageData processing only if the existing effect pipeline supports an efficient preview; otherwise use the existing image with a restrained effect icon/label treatment and preserve the current controls. Do not add a second image-processing implementation in the UI.
- On narrow screens, retain a usable two-column grid where space allows and collapse to one column when the sidebar width requires it.

## Files likely to change
- `app/page.tsx`
- `app/globals.css`
- Optionally `app/presets.ts` only if a small amount of presentational metadata is needed; avoid changing filter behavior or preset definitions without necessity.

## Implementation requirements
- Rework built-in and saved preset tiles to match the target's compact catalog proportions and typography, with names below the image instead of an overlay label.
- Make hover, keyboard focus, active, and in-use states visually distinct. Use the existing accent token for the selected treatment and ensure selected text remains legible.
- Carry the same card layout and active-state language into the Effects tab while keeping effect descriptions and controls accessible; opening a control must not inadvertently toggle the effect.
- Keep category headings, saved-preset deletion, save-preset controls, effect toggling, and all existing effect-specific controls functional.
- Preserve scrolling and avoid clipping tile names or controls in the sidebar.
- Keep the UI declarative: trigger existing effect updates and do not place pixel-processing logic in presentation code.
- Use strict TypeScript and existing CSS variables/design patterns.

## Security requirements
- Do not expose or log secrets, authentication values, or local storage contents.
- Do not introduce external services, dependencies, or persistence changes.
- Keep user-generated preset names rendered as text, not HTML.

## Acceptance criteria
- Preset cards visually resemble the second reference: compact two-column catalog cards with landscape image previews, title text below, and a clearly highlighted active selection.
- Effects/filter section uses a consistent card grid and selected state while retaining descriptions and all settings controls.
- Existing preset application, saved-preset management, effect activation, and controls continue to work.
- Layout remains usable at desktop and narrow viewport widths with no horizontal overflow or clipped content.
- No unrelated screens or image-processing algorithms are changed.

## Checks to run
- `npm run typecheck` (currently not defined in `package.json`; if still absent, report that and run `npx tsc --noEmit` instead).
- `npm run lint`.
- `npm run build` if route, configuration, or server modules change; this UI-only change should not need it unless review finds a reason.
- Inspect the rendered editor at desktop and narrow widths and interact with preset cards, saved presets, Effects cards, and an expanded effect control.

## Exact manual test steps expected after implementation
1. Run `npm run dev`, sign in or enter the editor, and load an image.
2. Open Presets and confirm built-in and saved presets render as compact two-column landscape cards with names beneath each preview.
3. Select several presets and confirm the canvas updates and the selected/in-use card state is visible.
4. Save a preset, apply it, then delete it; confirm all actions still work.
5. Open Effects, activate an effect, adjust its control(s), and confirm the canvas updates while the card and control remain usable.
6. Resize to a narrow viewport and confirm tiles, labels, save controls, effect descriptions, and expanded controls remain visible without horizontal overflow.
