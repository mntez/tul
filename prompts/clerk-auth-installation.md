# Clerk Authentication Installation

## Goal

Set up Clerk authentication for the existing Next.js 16 tul project using the attached Clerk CLI instructions, link it to Clerk application `app_3GuHcQfrL9GQoFD6VUVVXpIaU4t`, and fix any integration issues that appear after setup.

## Skills Read

- `AGENTS.md`
- `.agents/skills/architect/SKILL.md`

## Existing Code Inspected

- `package.json`
- `app/layout.tsx`
- `app/providers.tsx`
- `app/page.tsx`
- `app/components/auth/AuthCard.tsx`
- `app/lib/auth.ts`
- `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`
- `node_modules/next/dist/docs/02-pages/02-guides/environment-variables.md`

## Decisions or Assumptions

- This request intentionally supersedes the current product rule in `AGENTS.md` that says to use custom local authentication and not use external auth providers.
- Clerk will become the source of truth for signed-in state.
- The attached JWT templates markdown is informational only and is not used in this setup because tul does not need custom JWT generation for the login screen or a third-party backend integration.
- Existing local persistence for editor state, presets, recent edits, and guest mode should remain localStorage-based unless Clerk setup requires a narrow auth-specific change.
- Existing local account storage in `app/lib/auth.ts` should not be used for active sign-in after Clerk integration.
- Do not read, print, or expose `.env.local` values. If missing Clerk env values are needed, use the Clerk CLI and ask the user for non-sensitive setup action only when required.
- The project is an existing npm-based Next.js app because `package-lock.json` is present.

## Files Likely to Change

- `package.json`
- `package-lock.json`
- `app/layout.tsx`
- `app/providers.tsx`
- `app/page.tsx`
- `app/components/auth/AuthCard.tsx`
- `app/lib/auth.ts` or a replacement auth adapter
- `proxy.ts`
- `.env.local` may be updated by the Clerk CLI, but its contents must not be printed.

## Implementation Requirements

- Present and follow the Clerk setup checklist from the attached prompt before running Clerk CLI commands.
- Check whether the Clerk CLI is available with the project shell.
- Install or update the Clerk CLI if needed.
- Run `clerk auth login` before `clerk init`.
- Run `clerk init --app app_3GuHcQfrL9GQoFD6VUVVXpIaU4t` from the existing project root.
- If Clerk CLI scaffolding is incomplete, use the official Clerk Next.js quickstart as the fallback path.
- Use `@clerk/nextjs`, not `@clerk/clerk-react`.
- Place `ClerkProvider` inside `<body>` through the existing provider composition, not around `<html>`.
- Add or verify `proxy.ts` for Next.js 16 Proxy conventions.
- Ensure the matcher includes `'/__clerk/:path*'` once, after an API/TRPC matcher if that matcher exists.
- Replace or adapt the current `AuthCard` so the app exposes clear sign-in, sign-up, and signed-in user controls using Clerk components.
- Do not implement custom JWT templates or token generation unless a future backend or third-party integration explicitly requires it.
- Update `app/page.tsx` so protected home/editor/export behavior uses Clerk signed-in state while keeping guest mode intact.
- Avoid server/client boundary mistakes: browser-only editor code stays in Client Components, and Clerk server helpers are not imported into client-only modules unless officially supported.
- Preserve tul's current visual style: minimal dark photo-editor UI, compact controls, existing button classes, no extra landing-page-style auth surface.

## Security Requirements

- Never expose `CLERK_SECRET_KEY` or other secret env values in client code or command output.
- Do not print `.env.local`.
- Do not keep plaintext local passwords as an active auth path after Clerk is enabled.
- Keep guest mode explicit so export/download restrictions do not become ambiguous.
- Keep image processing and editor state separate from auth integration.

## Acceptance Criteria

- Clerk is installed and initialized for the configured Clerk app.
- The app builds with Clerk provider/proxy setup in Next.js 16.
- Signed-out users can see sign-in and sign-up actions.
- Signed-in users can see an account/user control.
- Guest mode still allows trying the editor locally while export/download still prompts for sign-in as currently intended.
- Existing local auth UI does not compete with Clerk auth controls.
- No Clerk secret is exposed in client code.
- No duplicate Clerk proxy matcher is added.

## Checks to Run

- `npm run typecheck` if a script exists; otherwise report that the script is missing.
- `npm run lint`
- `npm run build`
- `clerk doctor`

## Manual Test Steps Expected After Implementation

1. Start the app with `npm run dev`.
2. Open the local dev URL.
3. Confirm signed-out state shows clear sign-in and sign-up controls on the auth surface/nav.
4. Sign up as the first test user through Clerk.
5. Confirm the signed-in user/profile control appears after signup.
6. Upload an image, apply a preset/effect, and confirm editor controls still work.
7. Sign out and confirm protected home/editor/export paths route back to auth unless guest mode is selected.
8. Select guest mode and confirm local editing still works.
9. Attempt export as guest and confirm the app asks for sign-in.

