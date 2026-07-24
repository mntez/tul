# Profile Menu Settings and Sign Out

## Goal

Add a working profile dropdown menu in the tul app profile section with Settings and Sign out actions for signed-in Clerk users.

## Skills Read

- `AGENTS.md`
- `.agents/skills/architect/SKILL.md`

## Existing Code Inspected

- `app/page.tsx`
- `app/globals.css`
- `app/components/auth/AuthCard.tsx`
- Current Clerk integration via `useUser` and `UserButton`

## Decisions or Assumptions

- “Profile section” means the signed-in profile control in the top nav of both Home and Editor screens.
- “Settings” should open Clerk’s user profile/account settings UI using Clerk APIs rather than creating custom settings storage.
- “Sign out” should use Clerk sign-out and return the user to tul’s auth screen.
- The existing guest mode and editor state should not be changed.
- Keep the UI minimal and consistent with the existing dark tul nav, buttons, borders, and small control language.

## Files Likely to Change

- `app/page.tsx`
- `app/globals.css`
- Optionally `app/components/auth/ProfileMenu.tsx` or `app/components/ProfileMenu.tsx` if extracting the dropdown improves clarity.

## Implementation Requirements

- Replace Clerk’s bare `UserButton` usage in the app chrome with a tul-styled profile dropdown.
- Show the user initial or avatar-like circular trigger while signed in.
- Dropdown opens on click and closes after action selection.
- Add two visible menu actions: Settings and Sign out.
- Settings should open Clerk’s user profile/settings flow.
- Sign out should call Clerk sign-out and route the app back to the auth screen.
- Reuse one component in both Home and Editor nav to avoid duplicating menu logic.
- Do not add custom JWT templates, custom backend auth, or local password auth.
- Do not expose Clerk secrets or read `.env.local`.

## UI Requirements

- The menu should align to the right edge of the profile trigger.
- It should be compact, dark, bordered, and visually consistent with existing `.btn`, `.top-nav`, and card styling.
- It should not overlap incoherently with nav controls on desktop or mobile.
- Text must fit within menu items.
- Settings and Sign out should be clearly tappable with hover/focus states.

## Security Requirements

- Use Clerk client APIs for account settings and sign-out.
- Do not implement any manual session deletion beyond Clerk sign-out.
- Do not expose or log auth tokens or env values.

## Acceptance Criteria

- A signed-in user sees a profile trigger in the app nav.
- Clicking the trigger opens a dropdown with Settings and Sign out.
- Clicking Settings opens Clerk account/profile settings.
- Clicking Sign out signs out the Clerk user and returns the app to auth state.
- The menu works from both Home and Editor navs.
- TypeScript compiles.

## Checks to Run

- `npm run typecheck` if the script exists; otherwise report missing script.
- `node_modules\.bin\tsc.cmd --noEmit`
- `npm run lint` and, if the full app lint is still blocked by pre-existing issues, lint the new/changed auth/profile files separately.
- `npm run build`

## Manual Test Steps Expected After Implementation

1. Open `http://localhost:3000` while signed in.
2. Go to Home and click the profile trigger.
3. Confirm Settings and Sign out appear.
4. Click Settings and confirm Clerk account settings open.
5. Close settings, open the menu again, and click Sign out.
6. Confirm the app returns to signed-out/auth state.
7. Sign in again, open the Editor, and confirm the same dropdown works there.