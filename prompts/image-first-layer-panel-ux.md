# Image-First Layer Panel UX

## Goal
Redesign layer rows so the layer image preview is the only visible layer identity, and make visibility, locking, and reordering controls easier to understand and operate.

## Skills and guidance read
- `.agents/skills/architect/SKILL.md`
- `.agents/skills/review/SKILL.md`
- Project `AGENTS.md`

## Existing code inspected
- `app/page.tsx`: preset/effect layer rendering, visibility/lock/reorder/remove handlers, drag-and-drop logic, opacity editing, and layer numbering/name lookup.
- `app/globals.css`: layer row, thumbnail, actions, opacity control, hover/focus and responsive styles.
- `app/types.ts`: layer lock state.

## Decisions or assumptions
- “Remove the text on the layer” means remove the visible preset/effect name and numeric badge from each layer row while retaining the image thumbnail as its visual identity. Preserve accessible names through `aria-label` and titles.
- Keep opacity controls and existing actions. Arrange the eye, lock, move up/down, and remove controls into clear, consistently spaced action groups.
- Make the thumbnail the explicit drag handle, rather than making clicks anywhere on the row start a drag. Keep arrow buttons as a keyboard-friendly reorder option.
- A locked layer cannot be dragged or moved with arrows, while visibility, opacity, and remove remain available as they are now.
- Preserve current image/effect processing and layer state behavior.

## Files likely to change
- `app/page.tsx`
- `app/globals.css`

## Implementation requirements
- Remove visible layer title and order-number text from both preset and effect rows; retain a useful thumbnail for each row.
- Make the thumbnail area communicate that it can be dragged to reorder, with a concise tooltip and grab cursor; show a clear locked state and disable drag when locked.
- Keep eye visibility control and lock toggle individually understandable, with accurate state-specific tooltips and accessible labels.
- Keep move up/down controls distinct, compact, and disabled at boundaries or when the layer or adjacent layer is locked.
- Preserve existing lock semantics, undo history, layer visibility, removal, double-click opacity editing, and reorder rules.
- Use compact image-first rows with a dedicated action area, adequate hit targets, visible focus states, and responsive behavior that avoids icon collisions.
- Do not alter presets, effects processing, authentication, or persistence behavior.

## Security requirements
- Add no external dependencies or services.
- Continue rendering layer labels/metadata safely as text for assistive technology; do not use HTML injection.

## Acceptance criteria
- Each layer row visually identifies itself by its image preview without visible layer name or number text.
- Users can tell how to show/hide a layer, lock/unlock it, move it with arrows, or drag it using the thumbnail.
- Locked layers cannot be dragged or moved with arrows; unlocking restores reorder controls.
- Layer actions remain keyboard accessible and have accurate accessible names/tooltips.
- Opacity and remove behavior continue to work, and the panel remains legible at narrow widths.

## Checks to run
- `npx tsc --noEmit`
- `npm run lint` and report existing project errors separately.
- `git diff --check`

## Exact manual test steps
1. Open the editor with an image and add at least three preset layers and one effect layer.
2. Confirm each layer row shows its image preview without a visible name or number.
3. Use the eye control to hide/show a layer and check its state and tooltip.
4. Lock a layer; confirm thumbnail dragging and move arrows cannot reorder it, while eye, opacity, and remove controls remain usable.
5. Unlock it, drag by the thumbnail, and move it with arrows; confirm order changes correctly and boundaries disable the relevant arrow.
6. Check keyboard focus and operate layer actions using Tab, Enter, and Space.
7. Resize to a narrow viewport and confirm action targets remain distinct without clipping.
