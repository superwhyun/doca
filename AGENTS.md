# Repository Guidelines

## Project Structure & Module Organization
- `app/`: Next.js App Router pages, layouts, and API routes (e.g., `app/api/summarize/route.ts`).
- `components/`: Reusable UI (e.g., `components/ui/*`) and feature panes.
- `hooks/`: Custom React hooks (e.g., `use-toast.ts`).
- `lib/`: Utilities and helpers (e.g., `lib/utils.ts`).
- `public/`: Static assets.
- `styles/`: Global styles and Tailwind setup.

## Build, Test, and Development Commands
- `npm run dev` (or `pnpm dev`): Start local dev server with hot reload.
- `npm run build` (or `pnpm build`): Production build.
- `npm start` (or `pnpm start`): Serve the production build.
- `npm run lint` (or `pnpm lint`): Lint with Next/ESLint.
- `npm run typecheck` (or `pnpm typecheck`): TypeScript checks without emitting.
- Engines: Node >= 18. Use npm or pnpm (both lockfiles exist).

## Coding Style & Naming Conventions
- Language: TypeScript with `strict` mode; module alias `@/*` to repo root.
- Indentation: 2 spaces; use descriptive names (`FileUploadPane`, `useMobile`).
- Components: PascalCase for files (e.g., `ResultsPane.tsx`); hooks use camelCase prefixed with `use*`.
- Linting: `eslint-config-next`. Fix issues before PR (`npm run lint`).
- Styling: Tailwind CSS; prefer semantic, composable utility classes; keep design tokens in CSS vars.

## Testing Guidelines
- No unit test runner is configured yet. Recommended: Vitest (unit) and Playwright (e2e).
- Place tests alongside sources (`file.test.tsx`) or in `__tests__/`.
- Aim for critical-path coverage: API route (`app/api/summarize/route.ts`) and core UI panes.
- For now, manually verify via `npm run dev` and sample uploads.

## Commit & Pull Request Guidelines
- Commits: Use Conventional Commits (e.g., `feat: add summarize route logs`, `fix(ui): prevent double upload`).
- Scope small, focused changes; keep messages imperative and concise.
- PRs must include: clear description, linked issues (e.g., `Closes #123`), screenshots/GIFs for UI, and notes on testing.
- Run `npm run lint` and `npm run typecheck` before opening PRs. Note: build currently ignores TS/ESLint errors; CI should not.

## Security & Configuration Tips
- Do not commit API keys. For local dev, pass keys via form input or `.env.local` when introducing server-side usage.
- Be mindful of file uploads: validate size/type at the edge before hitting external APIs.
