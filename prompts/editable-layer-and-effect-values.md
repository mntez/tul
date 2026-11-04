# Editable Layer and Effect Values

## Goal
Add direct numeric value entry for filter layer intensity (the app's opacity/strength percentage) and numeric effect settings, alongside their existing sliders, so users can set exact values by typing.

## Skills read
- `.agents/skills/architect/SKILL.md`
- `.agents/skills/review/SKILL.md`

## Existing code inspected
- `app/page.tsx`: layer intensity slider and all custom effect controls, including halftone, radial blur, ASCII, CRT, threshold, RGB shift, motion trail, bloom, emboss, and related settings.
- `app/components/editor/EffectControls.tsx`: reusable effect range/select controls; range values currently display as text.
- `app/globals.css`: layer slider and effect control styles.
- `app/effects.ts`, `app/halftone.ts`: effect setting ranges/defaults used by the controls.
- `AGENTS.md`: architecture, strict TypeScript, and prompt approval workflow.

## Decisions or assumptions
- “Opacity/filter” refers to each preset layer's existing 0–100% intensity value; add a directly editable percentage field next to its slider.
- “Effect” refers to numeric effect settings controlled by range sliders. Add a number field for each numeric range control; keep selects, toggles, and color pickers as they are.
- Keep the existing range sliders as a second way to edit the same values, with immediate canvas updates.
- Numeric fields accept temporary blank/partial input while editing, then validate and clamp to each control's declared min/max on blur or Enter. Preserve each control's step precision.

## Files likely to change
- `app/components/editor/EffectControls.tsx`
- `app/page.tsx`
- `app/globals.css`

## Implementation requirements
- Add a small, keyboard-accessible numeric input beside the layer intensity slider, visibly showing `%`; typing an allowed value updates the layer and preview.
- Add editable numeric fields to all numeric effect range controls, including controls currently showing their value only in labels. Keep the value and slider synchronized.
- Reuse a typed range-value component/helper where practical so min, max, step, parsing, and clamping behave consistently.
- Do not replace color pickers, enum selects, or boolean toggles with numeric inputs.
- Handle invalid and empty input without injecting `NaN` into React state or effect settings. Restore the last valid or clamped value on blur; Enter commits and returns focus predictably.
- Ensure decimal controls retain meaningful precision based on step size, including fractional values such as 0.005, 0.01, and 0.05.
- Keep number fields visually compact and aligned with the existing dark theme. Preserve visible focus indicators and usable widths on narrow panels; prevent numeric stepper controls from crowding sliders.
- Preserve existing effect handlers, local state, persistence, and image processing boundaries.
- Use strict TypeScript and do not add dependencies.

## Security requirements
- Do not expose or log secrets, authentication values, or local storage contents.
- Keep input values bounded to the setting's valid range before committing them to application state.
- Render labels and preset names as text.

## Acceptance criteria
- Users can type a layer intensity from 0 to 100 and see the layer preview and canvas update; the slider reflects the typed value.
- Users can type values for numeric effect settings and see each slider and canvas update to match.
- Inputs enforce declared bounds and step precision and recover safely from blank, invalid, or out-of-range values.
- Select, toggle, and color controls remain unchanged and functional.
- Numeric controls are aligned, keyboard accessible, and usable at desktop and narrow widths without overflow.
- No effect processing logic is moved into UI controls.

## Checks to run
- `npm run typecheck` (if unavailable as a script, run `npx tsc --noEmit`).
- `npm run lint`; report repository-wide existing errors separately from errors in changed code.
- `git diff --check`.
- If the development server starts, manually test numeric entry and slider synchronization for a layer and multiple effect types, including decimal settings and invalid input.

## Exact manual test steps expected after implementation
1. Run `npm run dev`, open the editor, load an image, and add a preset layer.
2. Type `37` in its intensity value field; confirm the slider reads 37%, the thumbnail changes, and the canvas updates.
3. Try an empty value, a nonnumeric value, a value below 0, and a value above 100; confirm invalid input does not affect application state and values are restored/clamped on commit.
4. Activate a numeric effect such as Glitch or Vignette; type a valid value in one of its fields and confirm its slider and canvas update together.
5. Test a fractional control such as Noise amount or Receipt distortion and confirm decimal precision is retained.
6. Change the same controls with their sliders and confirm the numeric fields follow.
7. Confirm select, toggle, and color controls still work, and repeat at a narrow viewport width to check for overflow.
