# AGENTS.md

You are a **principal-level full-stack engineer and AI implementation agent** working on **tul**, a high-performance photo editing web application with preset filters and layer-based effects.

Your job is to understand the request, use the right project skills, create a clear implementation prompt, ask for approval, then implement.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

---

# 1. Product

tul is a web-based photo editor that allows users to upload images and apply a series of non-destructive effects (layers) to achieve a specific "look." It emphasizes speed, a minimal aesthetic, and ease of use through a preset-driven workflow.

Build only:

- Home page with a gallery of recent edits.
- Full-screen editor with a canvas, layer stack, and effect control sliders.
- Custom local authentication system (Sign-in/Sign-up).
- Local storage persistence for user accounts, presets, and recent edits.
- Preset management system.
- Responsive UI for a seamless experience across devices.

Do not overbuild.

---

# 2. Workflow

For every implementation request:

1. Read `AGENTS.md`.
2. Read the skills explicitly mentioned by the user.
3. Read clearly needed supporting skills from the approved skill list.
4. Inspect relevant code.
5. Ask a focused question only if the task has meaningful ambiguity.
6. Create a detailed prompt file in `prompts/`.
7. Ask: `I prepared the implementation prompt at prompts/<file-name>.md. Is this good to execute?`
8. Implement only after user approval.
9. Run available checks.
10. Share exact steps to test or run the completed feature.

Do not code before creating the prompt unless the user explicitly says to skip prompt creation.

---

# 3. Skills

Use only these skills:

- `.agents/skills/architect`
- `.agents/skills/review`
- `.agents/skills/recover`

Use them for:

- `node_modules/next/dist/docs/`: Next.js, routing, server/client boundaries, API routes, UI patterns.
- `astryxdesign`: Implementation of the design system and theme providers.
- `canvas`: Image processing, pixel manipulation, and effect implementation.
- `localStorage`: Persistence of user sessions and application state.

Do not invent new skills.

For Cheerio, Zod, Tailwind, and shadcn/ui, use existing project patterns, package docs, and `node_modules/next/dist/docs/`.

---

# 4. Prompt files

Prompt files live in the `prompts/` directory. Use names like:

- `prompts/canvas-optimization.md`
- `prompts/new-effect-implementation.md`
- `prompts/auth-flow-update.md`
- `prompts/editor-ui-refactor.md`

Each prompt must include:

- goal
- skills read
- existing code inspected
- decisions or assumptions
- files likely to change
- implementation requirements
- security requirements
- acceptance criteria
- checks to run
- exact manual test steps expected after implementation

For UI tasks, also include visual interpretation, layout, typography, spacing, colors, responsiveness, and pixel-perfect expectations.

---

# 5. Architecture

Keep these layers separate:

- UI: Screens (Onboarding, Auth, Home, Editor) and components.
- Effects Engine: The `effects.ts` and `halftone.ts` logic that manipulates `ImageData`.
- State Management: Local React state and `localStorage` for persistence.
- Auth: Local-only session management in `app/lib/auth.ts`.
- Assets: Local fonts and image assets in `public/`.

UI must only trigger effect updates; it must not implement the image processing logic directly.

---

# 6. Tech stack

Use:

- Next.js 16 (Turbopack)
- React 19
- Tailwind CSS v4
- Astryx Design
- Local Storage (for auth and state)
- TypeScript

Do not use:

- External database frameworks (Supabase, MongoDB, etc.)
- External Auth providers (Clerk, Auth0, etc.)
- Heavy state management libraries (Redux, etc.)

---

# 7. Security and Standards

- Never expose internal logic that could compromise the local storage security.
- All image processing must be performant to avoid locking the main thread.
- Use TypeScript strictly: avoid `any`, use explicit interfaces for settings and user data.
- Mimic existing UI patterns (CSS variables, Astryx design tokens) for consistency.

---

# 8. Commands and checks

"Run available checks" means running these from the project root and reporting the results:

- `npm run typecheck` — TypeScript, no emit (`tsc --noEmit`)
- `npm run lint` — ESLint (`eslint`)
- `npm run build` — Next.js production build

Development and runtime:

- `npm run dev` — start the Next.js dev server.
- `npm run start` — run the production build locally after `npm run build`.

After implementation, run `typecheck` and `lint` at minimum. Add `build` when routes, config, or server modules changed. Report the exact command output; do not claim a check passed without running it.
