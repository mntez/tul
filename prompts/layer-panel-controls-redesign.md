# Layer Panel Controls Redesign

## Goal
Make the editor's Layers panel clean, readable, and easy to operate, especially the visibility (eye), reorder, remove, and intensity controls shown crowded and overlapping in the supplied screenshot.

## Skills read
- `.agents/skills/architect/SKILL.md`
- `.agents/skills/review/SKILL.md`

## Existing code inspected
- `app/page.tsx`: layer list markup, eye visibility toggles, up/down reorder buttons, remove buttons, intensity sliders, effect rows, and undo/redo/add controls.
- `app/globals.css`: workspace header, layer cards, action buttons, thumbnails, intensity slider, and responsive rules.
- `app/types.ts`: `EffectLayer` shape and enabled/intensity fields.
- `AGENTS.md`: project scope, UI/state architecture, styling, and implementation workflow.
- User screenshot: controls visually overlap the layer name/thumbnail area, card actions are crowded, and layer list scroll is prominent.

## Decisions or assumptions
- Keep existing layer behavior: eye toggles visibility, up/down reorders, X removes, and slider changes intensity.
- Keep drag-to-reorder if possible, but make the layer number read as an index rather than appearing to be a drag handle unless a real grip is added.
- Improve the visual hierarchy and hit targets without adding new layer capabilities or changing effect processing.
- Use existing dark-theme variables and accent color; keep responsive behavior inside the current workspace.

## Files likely to change
- `app/page.tsx`
- `app/globals.css`

## Implementation requirements
- Arrange each layer card into a clear information row and a separate intensity row; never allow the action toolbar to overlap the thumbnail, title, or percentage.
- Keep thumbnail, layer number, name, and intensity value aligned and legible, including long preset names.
- Present visibility as an easy-to-find, adequately sized button with a clear enabled/disabled appearance, tooltip, and accessible label/state.
- Group reorder and remove actions consistently with visible hover/focus feedback and adequate button hit areas. Keep unavailable first/last reorder actions visibly disabled.
- Align the intensity slider with the content column and its displayed percentage. Keep it usable by pointer, touch, and keyboard.
- Avoid dimming the entire disabled card so strongly that its eye/action controls become hard to see; distinguish disabled content while keeping controls operable and readable.
- Keep active-effect rows and undo/redo/add controls visually consistent and functional.
- Prevent horizontal overflow and clipped controls at narrow widths; allow sensible wrapping or stacking when needed.
- Use semantic buttons, descriptive `aria-label` values, and `aria-pressed` or equivalent state for visibility.
- Keep layer state and operations in the existing React handlers; do not move business logic into CSS or change persistence.

## Security requirements
- Do not expose or log secrets, authentication values, or local storage contents.
- Do not introduce external services, dependencies, or persistence changes.
- Render layer names as text and retain existing safe handling of user-created preset names.

## Acceptance criteria
- Eye, reorder, and remove controls do not overlap any layer text or image at desktop or narrow widths.
- Each action has a clear purpose, consistent placement, accessible name, and comfortable hit target.
- Visibility state is obvious while the card and its controls remain readable.
- Slider and percentage are aligned and remain fully visible.
- Drag reorder, arrow reorder, toggle, remove, slider updates, undo, and redo continue to work.
- No horizontal scroll or clipped controls are introduced in the workspace.

## Checks to run
- `npm run typecheck` (if unavailable as a script, run `npx tsc --noEmit`).
- `npm run lint` and report existing unrelated errors separately from any changed-line findings.
- `git diff --check`.
- If the dev server can start, inspect the panel with multiple layers at desktop and narrow viewport widths and operate every control.

## Exact manual test steps expected after implementation
1. Run `npm run dev`, open the editor, load an image, and add at least four preset layers.
2. Confirm each layer's number, thumbnail, name, percentage, eye, reorder, and remove controls are distinct and aligned without overlap.
3. Toggle an eye off and on; confirm the canvas updates and the eye state remains legible.
4. Move a middle layer up and down with the controls, then drag a layer to another position; confirm order changes correctly and boundary arrows disable at the correct positions.
5. Change the intensity slider and confirm both the percentage and canvas update.
6. Remove a layer and use undo/redo; confirm the layer list and canvas recover correctly.
7. Repeat at a narrow viewport width and confirm all buttons and the slider remain reachable without clipping or horizontal overflow.
