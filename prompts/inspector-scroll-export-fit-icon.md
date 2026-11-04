# Inspector, Export, and Preview Control Fixes

## Goal
Fix the right-side editor inspector and preview controls shown in the user's screenshot: make the inspector reliably scroll so the layer stack below Settings is reachable, make Export more compact, and replace the broken Fit-to-view glyph and garbled image-dimension/zoom symbols with clear controls.

## Skills and guidance read
- `.agents/skills/architect/SKILL.md`
- `.agents/skills/review/SKILL.md`
- Next.js 16 CSS guide at `node_modules/next/dist/docs/01-app/01-getting-started/11-css.md`
- Project `AGENTS.md`

## Existing code inspected
- `app/page.tsx`: `zoomToFit`, preview toolbar glyphs and image dimensions, inspector Settings/layer/export structure.
- `app/globals.css`: editor grid sizing, `.editor-workspace` overflow, layer list, effect controls and export rules.
- The supplied screenshot: inspector content competes for vertical space; layer stack is clipped; Export occupies more height than needed; preview toolbar contains mojibake glyphs.

## Decisions and assumptions
- Keep the current minimal dark visual system and preserve editor behavior and current pane arrangement.
- Make the whole right inspector the vertical scroll container on desktop; Settings, Layers, and Export should scroll together so layer controls remain reachable. Keep internal layer scrolling only if required by narrow layouts.
- Reduce Export's padding and vertical gaps while retaining format, quality, Share, and Export controls.
- Replace misencoded text glyphs with valid UTF-8 and use a small inline SVG for Fit to view so its meaning is clear at all zoom levels.
- Keep `zoomToFit` behavior unchanged unless inspection exposes a direct implementation defect.

## Files likely to change
- `app/page.tsx`
- `app/globals.css`

## Implementation requirements
- Give the right inspector a bounded height and `overflow-y: auto` in the full-height desktop layout; ensure flex/grid children can shrink (`min-height: 0`) and the scrollbar belongs to the complete inspector rather than trapping the layer list.
- Keep the editor's small-screen stacked layout scrollable as a page, without forcing a fixed-height inspector there.
- Compact the Export section's vertical padding, action spacing, and quality-control wrapping; keep every control labeled and usable.
- Render a recognizable Fit to view icon as inline SVG with an accessible title/label. Correct the dimension separator, size unit separator, and zoom-out symbol encoding.
- Preserve zoom, layer, settings, compare, and export state/handlers.
- Avoid unrelated behavior, dependency, route, or image-processing changes.

## Security requirements
- Add no external requests, packages, fonts, or persistence systems.
- Do not expose secrets or log user data.

## Acceptance criteria
- On desktop, the right inspector has a usable vertical scrollbar and scrolling past Settings reveals the full Layers section and Export section.
- Export takes less vertical space and its quality, format, Share, and Export controls remain easy to operate.
- The Fit to view control renders as a clear icon and still fits the image to the viewport.
- Preview dimensions and zoom controls display valid symbols rather than mojibake.
- At narrow widths, the editor remains page-scrollable with no horizontal overflow.
- Existing editing behavior remains intact.

## Checks to run
- `npx tsc --noEmit`
- `npm run lint`
- `git diff --check`
- `npm run build` if the touched code/config requires it; report environmental failures accurately.

## Exact manual test steps
1. Start with `npm run dev` and open the editor at desktop width with an image loaded.
2. Scroll the right inspector from Settings through all layer cards to Export; confirm no nested clipped region traps the scroll.
3. Confirm the Export section is compact and JPEG/PNG/WebP, quality, Share, and Export still work.
4. Click Fit to view at several zoom levels and confirm the image is centered and fitted.
5. Confirm dimensions, separators, and zoom-out icon render cleanly.
6. Resize to a narrow viewport and verify page scrolling reaches Settings, Layers, and Export without horizontal overflow.
