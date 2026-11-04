# Before/After Preview

## Goal

Add a draggable before/after divider to the editor preview so people can compare the untouched source image with the current edited result in one view.

## Skills read

- `.agents/skills/architect/SKILL.md`
- `.agents/skills/review/SKILL.md`
- `.agents/skills/recover/SKILL.md`
- Next.js 16 local guide: `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-client.md`

No canvas or localStorage skill folder is present in `.agents/skills`; this feature only composes existing image URLs and does not change image processing or persistence.

## Existing code inspected

- `app/page.tsx`: client editor state, preview image rendering, zoom/pan handlers, image load/fit, and current Edited/Original compare buttons.
- `app/globals.css`: preview panel, preview viewport, toolbar, and responsive editor styles.
- `app/types.ts`: current image shape.
- `package.json`: Next.js 16.2.11, React 19.2.4, and existing lint/build commands.
- Next.js 16 `use client` guide: interactive preview behavior belongs at the existing client boundary.

## Decisions and assumptions

- “Before” means the untouched `currentImage.src`; “after” means `effectResultSrc ?? currentImage.src`.
- Use a vertical divider: original on the left and edited on the right, with both images sharing the same zoom, pan, and fit transform.
- Initialize the divider at 50% for each newly selected image; keep its position while the same image is being edited.
- Retain the existing single-view Edited and Original actions as quick full-view choices, synchronized with the divider (0% and 100%), and add a Compare action to return to 50%.
- Keep image processing in the existing effect modules. The compare UI only renders existing sources.

## Files likely to change

- `app/page.tsx`
- `app/globals.css`

## Implementation requirements

- Render original and edited images in the same preview viewport with the same dimensions and transform; clip one image at the divider position instead of changing the zoom/pan state.
- Add an accessible draggable divider and keyboard-operable range control. Support pointer input on mouse and touch, and prevent divider interaction from starting image panning.
- Keep the divider constrained to the preview bounds and make its hit area usable without obscuring a large part of the image.
- Show clear Original and Edited labels while comparison is active. Preserve the current full-original and full-edited actions, plus a compare reset to the midpoint.
- When there is no image, keep the existing empty state and do not show compare controls. When there is no active effect result, both sides may show the source without errors.
- Match the existing dark editor surfaces, muted borders, compact monospace control labels, and responsive sizing. Avoid introducing unrelated design tokens or dependencies.
- Ensure divider dragging does not interfere with image pan, zoom wheel behavior, or existing export output.

## Security requirements

- Do not introduce network requests, external image sources, storage of image data, or new dependencies.
- Do not expose image data in logs or add secrets/configuration.

## Acceptance criteria

- With an image selected, both source and edited output appear simultaneously and align at all zoom levels.
- Dragging the divider reveals more or less of each image continuously, including with touch input.
- Keyboard users can adjust the divider and hear an accessible label/value.
- Edited, Original, and Compare actions show the full edited view, full original view, and midpoint comparison respectively.
- Changing zoom or panning keeps both images registered; exporting remains unchanged.
- Empty state and narrow viewport layout remain usable.

## Checks to run

- `npm run typecheck` (if unavailable, report the missing script accurately; do not substitute another command silently).
- `npm run lint`
- `npm run build` because the editor route is changed.

## Exact manual test steps

1. Run `npm run dev` and open the app in a browser.
2. Open the editor and select an image with a visible effect applied.
3. Confirm the preview shows the source on the left and edited result on the right at the midpoint.
4. Drag the divider to both edges and several points between them; confirm the reveal is continuous and labels remain clear.
5. Use keyboard focus and arrow keys on the divider control; confirm its value changes and is announced accessibly.
6. Choose Edited, Original, and Compare; confirm each shows the expected view/position.
7. Zoom in, pan, and fit the image; confirm both sides stay aligned and divider dragging does not pan the image.
8. Repeat divider dragging on a touch device or browser touch emulation.
9. Export the image and confirm export contains the full edited result, not the comparison clipping.
10. Clear or return to the empty editor and confirm compare controls are absent while the empty state remains intact.
