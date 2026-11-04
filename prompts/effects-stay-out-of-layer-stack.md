# Keep Image Effects Out of the Preset Layer Stack

## Goal
Separate preset layers from image effects in the editor UI. The Layers panel should contain only preset layers; effects remain available through the Effects list and their Settings controls, with no effect layer cards or effect-driven layer counts.

## Skills and guidance read
- `.agents/skills/architect/SKILL.md`
- `.agents/skills/review/SKILL.md`
- Project `AGENTS.md`

## Existing code inspected
- `app/page.tsx`: `activeEffects` state and effect toggles/settings, Layers heading/count, empty state, preset layer renderer, and the `activeEffects.map` effect-card renderer.
- `app/globals.css`: preset and effect layer card styles.
- `app/types.ts`: preset layer model.

## Decisions and assumptions
- Effects remain enabled/disabled and adjustable through the existing Effects list and right-side Settings inspector.
- Effects do not become `EffectLayer` records, do not count as preset layers, and do not show cards in the Layers panel.
- Preset layer visibility, lock, reorder, opacity, remove, undo/redo, and saved preset behavior remain unchanged.
- When there are no preset layers, show an empty-state message that directs users to apply a preset.

## Files likely to change
- `app/page.tsx`
- `app/globals.css` only if removing now-unused effect-layer styles is useful and safe.

## Implementation requirements
- Remove effect cards from the Layers list.
- Set the Layers heading count to `layers.length` only.
- Make the empty state depend only on preset layers and explain how to add one.
- Keep effect activation controls and selected-effect settings intact; effects must continue to update the preview/export through existing processing.
- Remove effect-layer-specific CSS only if no other UI uses those selectors.
- Do not change effect processing, effect order, preset layer state, or persistence formats.

## Security requirements
- Add no dependencies, external services, or data storage changes.
- Keep existing image and settings handling unchanged.

## Acceptance criteria
- Enabling one or more image effects does not add rows to Layers or change its displayed count.
- Layers contains only preset-derived image layers.
- Effects can still be enabled/disabled and edited in Settings, and their output remains visible in preview/export.
- Preset layer controls continue to work, including image-first UI, visibility, lock, reordering, opacity, remove, and undo/redo.
- Empty Layers state is clear and accurate when no presets are applied.

## Checks to run
- `npx tsc --noEmit`
- `npm run lint` and report existing project-wide errors.
- `git diff --check`

## Exact manual test steps
1. Open the editor with an image and note the empty Layers count.
2. Enable an effect; verify its Settings appear and the preview changes while Layers stays empty.
3. Toggle the effect off and on and adjust a setting; confirm the Layers count and rows remain unchanged.
4. Apply a preset; verify Layers now contains exactly that preset layer and all its image-first controls still work.
5. Add another preset and check visibility, lock, reorder, opacity, remove, and undo/redo.
6. Export and verify the selected effect is still part of the output.
