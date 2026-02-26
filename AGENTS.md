# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

TaskFlow is a React Native/Expo (SDK 54) mobile task management app that also runs on the web. It uses Bun as its package manager and communicates with a Google Sheets backend via Google Apps Script. See `README.md` for full details.

### Running the app

- **Web dev server:** `npx expo start --web --port 8081` (preferred for cloud agents; avoids the Rork CLI tunnel dependency in `package.json` scripts)
- **Lint:** `bun run lint` (runs `expo lint` / ESLint)
- **Type check:** `npx tsc --noEmit` (2 pre-existing TS errors in `app/(tabs)/tools/index.tsx` — these are in the existing codebase)

### Non-obvious caveats

- The `package.json` start scripts (`bun run start`, `bun run start-web`) use the Rork CLI with `--tunnel` flag, which requires ngrok. In cloud environments, use `npx expo start --web` directly instead.
- The app expects `EXPO_PUBLIC_GOOGLE_SCRIPT_URL` env var for backend connectivity. Without it, the app loads and renders UI but shows placeholder/mock data. This is acceptable for local development and testing.
- `bun install` is the correct dependency install command (lockfile is `bun.lock`).
- No Docker, no database, no CI/CD, no setup scripts, no pre-commit hooks in this repo.
- The web export/build can be tested with `npx expo export --platform web`.
