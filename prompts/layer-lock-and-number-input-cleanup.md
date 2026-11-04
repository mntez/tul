# Layer Lock and Number Input Cleanup

## Goal
Hide the browser's number-input spinner arrows from the editable value fields and add per-layer locking so locked preset layers cannot change order through either arrow controls or drag-and-drop until unlocked.

## Skills read
- `.agents/skills/architect/SKILL.md`
- `.agents/skills/review/SKILL.md`

## Existing code inspected
- `app/types.ts`: `EffectLayer` fields.
- `app/page.tsx`: editable numeric range component usage, layer creation/toggle/move handlers, drag reorder handlers, local state persistence, and layer card action buttons.
- `app/components/editor/EffectControls.tsx`: shared range-plus-number input component.
- `app/globals.css`: number input and layer action styles.
- `AGENTS.md`: strict typing, persistence, UI/state separation, and prompt approval workflow.
- User screenshot: native number input stepper arrows to remove; layer cards need a lock control.

## Decisions or assumptions
- “Value pointer” refers to the up/down spinner arrows rendered by the browser in numeric value inputs. Keep numeric fields editable and retain keyboard entry.
- Locks apply to preset/filter layers in the layer stack. Existing saved state without a `locked` property is treated as unlocked.
- A locked layer must remain at its current stack index. Reordering another layer cannot cross a locked layer, since that would move the locked layer indirectly.
- Lock state is part of each layer's existing local state and is persisted through the current `tul_state` serialization. Newly created and saved-preset-applied layers start unlocked.

## Files likely to change
- `app/types.ts`
- `app/page.tsx`
- `app/globals.css`

## Implementation requirements
- Remove number input spinner controls across supported browsers using scoped CSS; do not disable or replace numeric entry.
- Add an accessible lock/unlock icon button to each preset layer card, with clear locked styling, descriptive title and `aria-label`, and `aria-pressed` state.
- Add optional `locked` to `EffectLayer` for backward compatibility; toggle it without changing enabled/intensity or other layer fields.
- Block move-up/down if the selected layer is locked or if the adjacent destination is locked. Disable those buttons consistently in the UI.
- Prevent locked layers from initiating drag reorder. While dragging an unlocked layer, reject any move whose traversed segment contains a locked layer.
- Keep lock changes undoable using the existing layer history mechanism.
- Preserve lock state through existing local storage serialization and all operations that update/reorder layers; default old stored data and newly created layers to unlocked.
- Keep effect rows and their existing toggle behavior unchanged.
- Use strict TypeScript, existing theme tokens, and no new dependencies.

## Security requirements
- Do not expose or log secrets, authentication values, or local storage contents.
- Validate lock/reorder actions against current layer state before applying them.
- Do not change auth, preset persistence, or image processing behavior.

## Acceptance criteria
- Numeric value fields no longer show browser spinner arrows and remain keyboard-editable.
- Lock state is visible and accessible and can be toggled on and off.
- A locked layer cannot be moved by its arrow controls or drag-and-drop.
- Another layer cannot cross a locked layer and thereby change its position.
- Unlocking restores normal reorder behavior.
- Old saved layers load as unlocked; newly added layers start unlocked; lock state survives reload through existing persistence.
- Undo/redo, visibility, intensity, removal, and effect controls continue working.

## Checks to run
- `npm run typecheck` (if no script exists, run `npx tsc --noEmit`).
- `npm run lint`; report unrelated existing errors separately.
- `git diff --check`.
- If the dev server can start, manually test mouse and button reordering around locked and unlocked layers, persistence, and numeric field usability.

## Exact manual test steps expected after implementation
1. Run `npm run dev`, load an image, and add at least four preset layers.
2. Confirm the number fields have no spinner arrows and still accept typed values.
3. Lock a middle layer and confirm its lock indicator changes and its own up/down controls are disabled.
4. Try moving a neighboring unlocked layer across the locked layer using both arrows and drag-and-drop; confirm the locked layer remains at its original index.
5. Unlock it and confirm arrow and drag reordering can move it normally.
6. Reload the page and confirm lock state persists; confirm a previously saved layer without lock metadata behaves as unlocked.
7. Toggle visibility, adjust intensity, remove a layer, and test undo/redo to confirm existing actions remain functional.
