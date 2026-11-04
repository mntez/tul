# Minimal tul UI Redesign

## Goal
Replace the current app's visual design with a restrained, minimal dark interface based on the supplied reference. The editor should use a full-height three-column workspace: compact input/effect/preset/layer navigation on the left, a quiet image canvas in the center, and a settings/export inspector on the right. Carry the same visual language into the existing onboarding, home, and auth screens so the app feels cohesive.

## Skills read
- `.agents/skills/architect/SKILL.md`
- `.agents/skills/review/SKILL.md`
- Next.js 16 App Router CSS guide at `node_modules/next/dist/docs/01-app/01-getting-started/11-css.md`

## Existing code inspected
- `app/page.tsx`: onboarding, auth, home, editor screens; upload/drop behavior; preset/effect selection; effect controls; layer actions; undo/redo; canvas preview/zoom; export actions.
- `app/globals.css`: current screen system, three-pane editor pieces, card-heavy surfaces, responsive rules, and theme variables.
- `app/components/editor/EffectControls.tsx`: range/value controls used by effect settings.
- `app/components/auth/AuthCard.tsx`: existing authentication surface.
- `app/presets.ts`, `app/effects.ts`, `app/types.ts`: preset/effect data and layer model.
- `AGENTS.md`: product scope, design and architecture requirements, prompt approval workflow.
- Supplied reference image: near-black canvas, fine separators, subdued monospace typography, simple rows/accordions, center status and minimal bottom controls, right settings inspector.

## Decisions or assumptions
- “Remove the current one” means replace the current visual system and editor arrangement, not remove app features, routes, state, or image processing.
- Preserve onboarding, auth, home/recent edits, presets, effects, layers (including visibility, lock, reorder and opacity), undo/redo, upload/drop, zoom/pan, compare, and export. Redesign their presentation and placement only.
- The editor will have a left navigation column for Input, Effects, Presets, and Layers; a central canvas with a slim status/zoom strip; and a right inspector for the selected layer/effect settings, processing controls, and export.
- Selecting an effect in the left column will select it and show its settings in the right inspector. Keep effect activation semantics clear and preserve the existing activeEffects state.
- Use a low-contrast near-black palette, thin neutral dividers, minimal or no card shadows, restrained accent use, compact rows, and a monospace-led typographic treatment. Use existing local/system font availability; do not download assets or add dependencies.
- Keep home, onboarding, and auth recognizable and usable while restyling them to the same minimal visual language.
- At narrow widths, collapse the three-column editor into a usable stacked or drawer-based layout with clear access to input, tools, canvas, layers, settings, and export.

## Files likely to change
- `app/page.tsx`
- `app/globals.css`
- `app/components/auth/AuthCard.tsx` if required for visual consistency
- `app/components/editor/EffectControls.tsx` only if the new inspector layout needs presentational changes

## Implementation requirements
- Replace the current card-heavy editor layout with the described three-column workspace and restrained separators.
- Make the canvas visually dominant and quiet; keep empty-state messaging understated and upload affordances easy to find.
- Organize the left column into clearly separated Input, Effects, Presets, and Layers sections. Use compact text rows and simple expanded/collapsed section headers instead of image-card grids dominating the panel.
- Move the selected effect's controls into a right-side Settings inspector, and display the selected preset/layer's opacity and lock/visibility controls coherently without losing access to existing layer actions.
- Keep Processing and Post-Processing controls grouped and collapsible where the existing app supports them; keep Export options in the inspector with clear format/quality controls and a prominent export action.
- Preserve clear selected/active/locked/disabled/focus states with sufficient contrast. Do not rely on color alone.
- Remove obsolete layout styles and prevent old styles from overriding the new structure. Use design tokens/CSS variables consistently.
- Maintain semantic buttons, accessible labels, keyboard focus, and labels for every input.
- Keep image processing in existing effect modules and keep UI handlers focused on invoking existing behavior.
- Preserve local state, authentication, local storage, route behavior, and dependency set.
- Avoid horizontal overflow, clipped controls, and inaccessible nested scrolling. Make the left and right panels independently scrollable when necessary while keeping the canvas area stable.

## Security requirements
- Do not expose or log secrets, authentication values, or local storage contents.
- Keep uploaded-image handling and user-entered names safe; render text as text.
- Do not add external image/font services, auth services, persistence systems, or dependencies.

## Acceptance criteria
- The editor clearly reflects the reference's minimal dark three-column layout and understated visual hierarchy.
- The canvas is the dominant central region; left tools and right settings are separated by fine dividers, not heavy cards.
- Input, effects, presets, layers, settings, processing/post-processing, and export remain discoverable and usable.
- Selecting tools/effects and changing values continues to update the image through existing handlers.
- Existing layer visibility, lock, reorder, opacity, undo/redo, presets, upload, zoom/pan, compare, and export behavior remains functional.
- Home, onboarding, and auth remain usable and visually consistent with the new theme.
- Desktop and narrow layouts remain legible, keyboard accessible, and free of horizontal overflow.
- No image processing or authentication architecture changes are introduced.

## Checks to run
- `npm run typecheck` (if unavailable as a script, run `npx tsc --noEmit`).
- `npm run lint`; distinguish existing project errors from errors in changed code.
- `npm run build` because the editor's major client UI structure changes.
- `git diff --check`.
- If the dev server starts, inspect all app screens at desktop and narrow viewport widths and exercise core editor controls.

## Exact manual test steps expected after implementation
1. Run `npm run dev` and inspect onboarding, sign-in/sign-up, and home; confirm the restrained dark theme is consistent and all entry/navigation actions still work.
2. Enter the editor and confirm the left Input/Effects/Presets/Layers column, dominant center canvas, and right Settings/Processing/Export inspector.
3. Upload and drag-drop an image; select multiple effects and presets and confirm settings appear in the inspector and the image updates.
4. Add multiple layers; verify visibility, lock/unlock, arrow and drag reorder, opacity numeric entry, and undo/redo.
5. Use zoom, pan, compare, processing controls, and export format/quality/export actions.
6. Resize to a narrow viewport and confirm access to every section without horizontal overflow, clipped controls, or trapped scroll areas.
