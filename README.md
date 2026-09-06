# expenses mobile app — project map

This folder holds one product in two generations. **`Mobile-App/`** is the
current product: a local-first iOS/Android expense + grocery app (Expo /
React Native) with receipt OCR at line-item level, fourteen languages with
full RTL, and optional family sharing — heading for App Store submission.
The files at this root are the earlier **web app** (React/Vite PWA), still
deployed on Vercel because it hosts the receipt-scanning proxy and the
privacy/terms pages the native app depends on. Everything else here is
either design handoffs or archive.

**Start with `Mobile-App/PROJECT-MEMORY.md`** (status, decisions, what is
pending), then `Mobile-App/AGENTS.md` (the rules), then the top entry of
`Mobile-App/release/CHANGELOG_NATIVE.md`.

## What is where

| Folder / file | What's inside | Why it matters |
|---|---|---|
| `Mobile-App/` | **The native app** — source, tests, tools, and its docs: `release/` (publish runbook + changelog), `product/` (locked decisions), `testing/`, `guidance/`, `store/` | The product. Its own README explains the inside. It is **not** part of this git repository — it has a private one, mirrored from `C:\dev\smartspend-native` |
| `Mobile-App/PROJECT-MEMORY.md` | Current status, key decisions, parking list, open questions | The first thing to read |
| `Mobile-App/release/` | Exact publish sequence, pre-flight checks, failure history, build history | Highest-value doc when something must ship |
| `design/` | Claude Design handoffs (zips + unzipped folders), design references | Proposals to review and land — never copy blindly (`design/README.md`) |
| `_archive/` | Everything obsolete, moved here instead of deleted, each with a reason | Nothing in the project is ever deleted (`_archive/README.md`) |
| `api/` `public/` `src/` `index.html` `vite.config.js` `vercel.json` `package.json` `package-lock.json` | **The web app + receipt proxy** (`api/gemini.js`, `api/_guard.js`) and the hosted `privacy.html` / `terms.html` | Deployed by Vercel from this root on every `git push` to `main`. **Must stay here** — moving them would break the proxy the native app calls. The proxy's tested twin lives in `Mobile-App/api/`; keep both identical |
| `public/guides/v2/` | **The help clips the app plays** — 27 animated WebP files rendered from the pages in `Mobile-App/tools/guides/` | The app fetches them from here rather than carrying 20 MB of them in every update. The path is versioned: a re-rendered clip is published under `v3/` and `GUIDES_VERSION` in `GuideClips.tsx` is bumped, because phones cache by URL (`vercel.json` marks `/guides/*` immutable for a year). **Push this repo before the app update that expects them** |
| `Daily-Dev-Copy/` | An August 2026 dev copy of the web app (tracked by this repo; may be its own Vercel preview). Its `DESIGN_DIRECTION.md` is the original design spec | Reference only. Never the build target |
| `.git`, `.gitignore` | This root's public repository (`umer-sarfaraz/Smart-Spend-1`) | The ignore file keeps `Mobile-App/`, `design/`, `_archive/` and private files out of the public repo |

## How to run the important things

- **Publish an update or make a build of the native app:**
  `Mobile-App/release/README.md` — owner-only, from the `C:\dev` mirror.
- **Run the native app locally:** in `Mobile-App`: `npm.cmd install`,
  `npx.cmd expo start`, Expo Go on the phone (`Mobile-App/guidance/RUN_IN_EXPO.md`).
- **Verify the native app:** in `Mobile-App`: `npx.cmd tsc --noEmit` and
  `npm.cmd test` (all suites green = done).
- **Deploy the web side (proxy / legal pages):** commit at this root and
  `git push origin main`; Vercel builds it. Secrets live only in Vercel's
  environment variables, never in files.
- **Run the web app locally:** `npm install`, `npm run dev` (Vite, port 5173).
