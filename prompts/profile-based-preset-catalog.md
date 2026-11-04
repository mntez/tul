# Replace Built-in Presets with Profile-Based Presets

## Goal
Remove the current built-in CSS filter presets and replace their catalog with every profile found under `tultul/profiles` (40 profiles across bloom, dirt, film_breath, gate_weave, grain, and halation). Add native effect-engine support so selecting a profile applies its meaningful profile settings to the image rather than approximating it as a CSS filter. Preserve user-saved presets unless the user separately asks to remove them.

## Skills read
- `.agents/skills/architect/SKILL.md`
- `.agents/skills/review/SKILL.md`
- `.agents/skills/recover/SKILL.md`

## Existing code inspected
- `AGENTS.md`: required prompt-first workflow, architecture boundaries, strict TypeScript, and checks.
- `app/page.tsx`: preset catalog, filter-string application, profile-independent effect state, effect processing chain, effect controls, editor layout, and existing layer behavior.
- `app/presets.ts`: current `original`, Mono, Noir, Warm, Cool, Fade, and Vivid definitions and categories.
- `app/types.ts`: current effect-layer and saved-preset model.
- `app/effects.ts` and `app/halftone.ts`: existing ImageData effect algorithms and effect registry.
- `app/components/editor/EffectControls.tsx`: existing effect-control input patterns.
- `app/globals.css`: current minimal preset catalog and editor styling.
- `tultul/profiles/**/index_*.json`: all seven profile indices; confirmed family counts are bloom 4, dirt 4, photo dirt 4, film_breath 4, gate_weave 4, grain 12, and halation 8.
- `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`: Next.js client boundary guidance for interactive editor state.

## Decisions or assumptions
- “All profiles” means every profile entry in the seven JSON indices, for a total of 40, grouped in the preset browser by effect family. The JSON files remain the source data; do not duplicate or hand-copy the profile values into a second catalog.
- Replace built-in CSS filter presets, but retain the user's saved presets and their existing management workflow.
- Applying one of these profiles adds a profile-backed preset layer. Keep effect controls in the Effects/settings area and keep layers limited to items applied from Presets, consistent with the existing product direction.
- Add native ImageData processing support for profile families that do not currently have a corresponding implementation. Existing `bloom` and `noise` implementations may be extended where appropriate. The UI triggers processing; algorithms stay in the effects engine.
- “Faithfully” means preserve and use profile-defined values, toggles, defaults, ranges, and profile identity in tul's native implementation. It does not claim bit-for-bit parity with Dehancer's proprietary processing. Where the source profile contains metadata or controls with no meaningful image-processing equivalent, preserve the source data and explain/omit it from exposed controls rather than inventing values.
- Performance must be considered for large photos; use bounded work, avoid repeated full-resolution allocations where feasible, and move processing off the main thread if necessary within the existing architecture.
- Profile labels and group names come from the JSON metadata; stable IDs derive from family, source index, and profile ID. Validate parsed data before use and handle a missing or malformed index with a visible empty/error state rather than crashing the editor.

## Files likely to change
- `app/presets.ts` or a new profile-catalog module for typed profile loading, validation, and grouping.
- `app/types.ts` for profile-backed preset/layer types.
- `app/effects.ts` and potentially a focused new engine module for dirt, film breathing, gate weave, grain, and halation processing and profile-to-engine settings.
- `app/page.tsx` for catalog rendering, profile application, layer/filter resolution, effect activation/settings, and persistence compatibility.
- `app/components/editor/EffectControls.tsx` if profile settings need reusable controls.
- `app/globals.css` for the 40-item family-grouped catalog and responsive states.
- `prompts/profile-based-preset-catalog.md` (this specification only; implementation must not rewrite it).
- Add a Web Worker module only if required for responsive full-resolution processing.

## Implementation requirements
1. Load all 40 profile entries from the seven indices with explicit TypeScript interfaces and runtime validation; keep source profile values, units, ranges, enabled state, defaults, and IDs intact.
2. Remove the seven current built-in CSS filter choices from the preset catalog and retire their application paths where no longer used. Keep the neutral/original reset behavior if it is still needed by the editor.
3. Present the profiles in the existing minimal dark style, grouped by family with clear labels and counts. Preserve legibility and practical scrolling on desktop and mobile; do not make 40 items render as an unbounded single-width wall.
4. Selecting a profile applies a profile-backed preset through the existing preset/layer workflow. Preview, active/in-use state, remove/reorder/lock behavior, undo/redo, saved presets, and persistence must remain coherent. Persist a stable profile reference and enough validated state to restore a selected profile after reload; handle legacy saved layer records safely.
5. Implement native processing for all six families represented by the data: bloom, dirt (including photo dirt), film_breath, gate_weave, grain, and halation. Map profile parameters through explicit adapters, not UI code. Each family must use its profile values in processing and have a clear, typed engine contract.
6. Expose relevant controls in the effect settings panel for the selected/active profile family where appropriate. Do not reintroduce an effect layer stack in the Effects panel; layers remain exclusive to preset application.
7. Preserve existing non-profile effects and their control behavior. Do not change authentication, routes, export behavior, or unrelated visual sections.
8. Add focused automated checks for profile inventory/schema validation and representative processing behavior if the project already has a test framework; do not add a test framework dependency solely for this work.

## Visual interpretation
- Keep the editor's restrained near-black minimal treatment, existing monospace labels, thin separators, and cyan accent for selected/active items.
- Group profiles by family (Bloom, Dirt, Photo Dirt, Film Breath, Gate Weave, Grain, Halation) using compact section headings and counts.
- Profile cards/list rows should show source profile names (for example, “35 mm ISO 250”), effect family, and active state without duplicating dense raw parameter JSON in the browser.
- Maintain readable spacing, keyboard focus, touch targets, and scroll access to all groups at wide and narrow viewport sizes. Reuse existing editor tokens and patterns.

## Security requirements
- Treat profile JSON as local untrusted input: validate types, numeric finiteness, ranges, identifiers, and nested objects before using it.
- Do not evaluate profile content as code or render it as HTML.
- Do not log image data, profile payloads, authentication state, or local-storage contents.
- Do not add network requests, external services, dependencies, or persistence of source images beyond current behavior.

## Acceptance criteria
- The preset browser contains all 40 profiles from the seven indices, with correct labels and family grouping; none of the old Mono/Noir/Warm/Cool/Fade/Vivid built-ins remain as selectable presets.
- Applying a profile stores its identity and configuration as a preset layer and produces visible image output through its family-specific native effect path.
- Every family has an explicit typed profile adapter and engine implementation; representative profile changes alter the corresponding processing settings/output.
- Existing layers-only-in-presets product behavior, saved preset controls, undo/redo, ordering, visibility, locking, and persistence remain functional.
- Invalid/missing profile data does not crash the editor and produces a useful fallback state.
- The profile catalog and settings remain usable at desktop and mobile widths without clipped groups or horizontal overflow.
- TypeScript remains strict, no unrelated worktree changes are overwritten, and required checks report their actual results.

## Checks to run
- `npm run typecheck` (if not present, run `npx tsc --noEmit` and report that the script is missing).
- `npm run lint`.
- `npm run build` because effect/profile module boundaries and client processing may change.
- Run available existing tests only; do not create a new framework solely for this feature.
- Review the rendered editor at desktop and mobile sizes and exercise one profile from each family, including reset, adding/removing/reordering, save/apply saved preset, reload persistence, and invalid-profile fallback.

## Exact manual test steps expected after implementation
1. Start the app with `npm run dev`, open the editor, and load a photo.
2. Open Presets and verify all seven family groups and all 40 profile entries are present with correct source names and counts.
3. Apply at least one profile from each family; confirm the image changes and the matching preset layer appears with working visibility, lock, reorder, and remove controls.
4. Select a profile-backed layer and adjust its exposed controls; confirm the preview responds without adding a layer from the Effects/settings area.
5. Save the current profile-backed look, apply it to the image, and reload the editor; verify profile identities/settings restore and no legacy data crashes.
6. Exercise undo and redo after applying/removing/reordering profile layers.
7. Test at a narrow mobile viewport and verify every group remains reachable, labels remain readable, and no horizontal overflow occurs.
8. Temporarily simulate an invalid/missing profile index in development and verify the editor shows the documented fallback without crashing; restore the source file afterward.
