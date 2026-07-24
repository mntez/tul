# Smooth home page flow for returning signed-in users

## Goal
Eliminate the jarring onboarding-first experience for returning signed-in users. They should see a brief loading state, then seamlessly land on the home page — no extra clicks, no flash of onboarding content.

## Skills read
- architect (self)

## Existing code inspected
- `app/page.tsx` — screen state machine, Clerk `useUser`, JSX for each screen
- `app/animations.tsx` — FadeIn, Spinner components available

## Decisions / Assumptions
- Returning signed-in user = Clerk loads, finds a valid session, `isSignedIn` becomes true
- The auto-transition fires **once** when Clerk finishes loading, not on subsequent re-renders
- Loading state shows the wordmark + subtle spinner centered on dark background
- No changes to the first-time/anonymous flow (onboarding → auth → home)
- Home page stays as-is (upload card only — no gallery re-added)

## Files likely to change
- `app/page.tsx`

## Implementation requirements

1. **Auto-redirect signed-in users**: Add a `useEffect` that watches `userLoaded` and sets `screen` to `"home"` when `isSignedIn` becomes true, but only if still on `"onboarding"`.

2. **Loading state while Clerk loads**: Show a dedicated loading screen (wordmark + spinner) when `!userLoaded && screen === "onboarding"`. This replaces the onboarding content during auth loading. Use `FadeIn` for smooth entrance.

3. **Preserve existing flows**:
   - Anonymous/guest: onboarding → click "Get started" → auth → guest mode → home
   - First-time signed-in: onboarding → click "Get started" → auth → sign in → home
   - Nothing changes for auth → home or editor transitions

## Security requirements
- None (no storage/auth logic changes)

## Acceptance criteria
- Signed-in user reloads the page: sees loading state briefly, then lands directly on home
- No flash of onboarding content for signed-in users
- Onboarding screen still shows for anonymous / first-time visitors
- All existing flows work unchanged

## Checks to run
- `npx tsc --noEmit`
- `npm run lint`

## Exact manual test steps
1. Sign in, reload the page — should see "tul" wordmark + subtle spinner, then home page
2. Sign out, reload — should see full onboarding screen
3. Click "Get started" as anonymous — should go to auth, click "Continue as guest" → home
4. Navigate editor ← → home — no regressions
