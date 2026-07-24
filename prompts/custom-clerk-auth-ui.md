# Custom Clerk Auth UI

## Goal

Replace Clerk’s default/prebuilt sign-in/sign-up UI in tul with a custom tul-styled auth interface while keeping Clerk as the authentication/session backend. Also add a custom profile dropdown with Settings and Sign out so the app chrome no longer depends on Clerk’s default visible UI components.

## Skills Read

- `AGENTS.md`
- `.agents/skills/architect/SKILL.md`

## Existing Code Inspected

- `app/components/auth/AuthCard.tsx`
- `app/page.tsx`
- `app/globals.css`
- Clerk hook exports in `node_modules/@clerk/nextjs/dist/types/index.d.ts`
- Current Clerk integration using `ClerkProvider`, `useUser`, `SignInButton`, `SignUpButton`, and `UserButton`

## Decisions or Assumptions

- “Design a UI and wire Clerk on that UI” means tul owns the visible auth form and profile menu, while Clerk remains the auth provider under the hood.
- The custom auth form should support email + password sign-in and sign-up as the first pass.
- If the Clerk app requires email verification, the form should show a code step using Clerk’s sign-up verification flow.
- Settings should open Clerk account/profile settings through Clerk APIs without showing Clerk’s default sign-in/sign-up screens.
- Sign out should call Clerk sign-out and return tul to the auth screen.
- Guest mode stays available and local editor persistence remains unchanged.
- Do not use the JWT templates markdown and do not add custom token generation.

## Files Likely to Change

- `app/components/auth/AuthCard.tsx`
- `app/page.tsx`
- `app/globals.css`
- Possibly a new `app/components/auth/ProfileMenu.tsx`
- Possibly `app/sign-in/[[...sign-in]]/page.tsx` and `app/sign-up/[[...sign-up]]/page.tsx` if they should redirect to tul’s custom auth screen or be removed from normal navigation.

## Implementation Requirements

- Replace `SignInButton` and `SignUpButton` with a custom form using Clerk’s `useSignIn`, `useSignUp`, and `useClerk`/`setActive` flows.
- Provide sign-in and sign-up modes with tul-styled segmented controls/buttons.
- Capture only the required fields: email, password, and name when signing up if Clerk supports it.
- Show loading states, disabled states, and clear error messages.
- Support an email verification code step if Clerk returns an incomplete sign-up status requiring verification.
- On successful sign-in/sign-up, activate the Clerk session and call the existing `onAuth`/screen transition callback or equivalent.
- Replace `UserButton` in home/editor nav with a custom profile trigger/dropdown.
- Profile dropdown must include Settings and Sign out.
- Settings should open Clerk user profile/account settings using supported Clerk client APIs.
- Sign out should call Clerk sign-out, close the menu, and move the app back to auth state.
- Keep all auth implementation in UI/auth components; do not put auth logic into image effect/canvas code.
- Do not read or print `.env.local`.

## UI Requirements

- Match tul’s dark minimal aesthetic: elevated dark card, thin border, compact controls, existing `.btn` and `.field` feel.
- No Clerk “Secured by” or “Development mode” text should appear in tul’s auth card because prebuilt Clerk sign-in/sign-up components will not be used there.
- The auth form should remain centered and responsive on mobile.
- The profile dropdown should align right in the top nav, fit its text, and avoid overlapping neighboring controls.
- Buttons and inputs must have usable focus/hover/disabled states.

## Security Requirements

- Use Clerk client hooks for auth; do not store passwords or sessions in localStorage.
- Do not expose Clerk secret keys or tokens.
- Do not implement custom backend auth or JWT templates.
- Do not keep the old local password auth as an active path.

## Acceptance Criteria

- Signed-out users see tul’s custom sign-in/sign-up form, not Clerk’s prebuilt modal/card.
- Users can create an account through the custom UI.
- Users can sign in through the custom UI.
- If verification is required, users can enter the verification code in the custom UI.
- Signed-in users see a custom profile dropdown in Home and Editor nav.
- Settings opens account/profile settings.
- Sign out works and returns the app to signed-out/auth state.
- Guest mode still works.
- TypeScript compiles and production build succeeds.

## Checks to Run

- `npm run typecheck` if the script exists; otherwise report missing script.
- `node_modules\.bin\tsc.cmd --noEmit`
- `npm run lint` and targeted lint on changed auth/profile files if existing global lint issues remain.
- `npm run build`

## Manual Test Steps Expected After Implementation

1. Open `http://localhost:3000` signed out.
2. Click Get started and confirm the custom tul auth UI appears.
3. Create an account with the custom sign-up UI.
4. Complete the verification code step if Clerk asks for it.
5. Confirm the app moves to Home and shows a profile trigger.
6. Open the profile dropdown and click Settings.
7. Close settings, reopen dropdown, and click Sign out.
8. Sign back in through the custom sign-in UI.
9. Enter guest mode and confirm editor access still works locally.
10. Open Editor while signed in and confirm the profile dropdown works there too.