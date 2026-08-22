# Getting SmartSpend onto your iPhone (and your friend's)

You don't need an Apple Developer account, a Mac, or the App Store. SmartSpend
installs straight from Safari as a standalone app — its own icon on the home
screen, no browser bar, works offline.

Total time: about 15 minutes, once.

---

## What I fixed to make this work

The app was already 90% installable — it had a manifest, a working service
worker and the right Apple meta tags. Three things were missing:

1. **`index.html` never linked the manifest.** Without `<link rel="manifest">`
   the browser never treats a site as installable, so "Add to Home Screen" only
   ever made a plain bookmark. This was the actual blocker.
2. **No `apple-touch-icon`.** iOS ignores the manifest's icons and reads this
   tag instead. With it missing, iOS uses a *screenshot of the page* as your home
   screen icon.
3. **The icons were emoji SVG data-URIs.** iOS requires a real PNG. Replaced with
   proper icons: the Home budget ring in violet `#A99BFA` with the teal
   "on track" tip, per DESIGN_DIRECTION.md.

---

## Step 1 — Get a Gemini API key (only if you don't have one)

Receipt scanning calls Google's Gemini through a small server function
(`api/gemini.js`), which needs a key. Everything else in the app works without
it.

1. Go to https://aistudio.google.com/apikey
2. Sign in, click **Create API key**
3. Copy it somewhere safe — you'll paste it in Step 3

The free tier is generous and fine for two people.

---

## Step 2 — Push to GitHub, then import in Vercel

Your repo is `github.com/umer-sarfaraz/Smart-Spend-1`, and the live app already
deploys from it to `smart-spend-1.vercel.app`. The dev copy becomes a **second,
separate** Vercel project pointed at the `Daily-Dev-Copy` subfolder — the live
app and its URL are untouched.

> **Already handled:** `.gitignore` now excludes `Chat_Transcripts/`,
> `CLAUDE_MEMORY.md` and `Backups/`. This repo is **public**, so those must never
> be committed. Verified with a dry run — `git add .` stages only the dev copy.

**2a. Push.** Open a terminal in the repo root (the *parent* folder,
`expenses mobile app`) and run:

```bash
git add .
git commit -m "Add Daily-Dev-Copy: PWA install fix, real icons, unified palette"
git push
```

**2b. Import in Vercel.** Go to https://vercel.com/new and pick
`Smart-Spend-1`. Vercel will offer to import it again — that's fine, you want a
second project from the same repo.

**⚠️ The one setting that matters:** expand **Root Directory** and set it to

```
Daily-Dev-Copy
```

If you skip this, Vercel builds the repo root and you just get a copy of the
live app. Leave the framework (Vite) and build settings as detected.

Give the project a name like `smartspend-dev`, click **Deploy**, and you'll get
a URL like `https://smartspend-dev.vercel.app`. **That's your app.**

> Pushing also triggers a rebuild of the existing `smart-spend-1` project. That's
> harmless — none of the live app's files changed, so it rebuilds identical code.

**From now on**, any change you push to `main` redeploys both automatically.

---

## Step 3 — Add your API key

1. Go to https://vercel.com/dashboard and open the project
2. **Settings → Environment Variables**
3. Add: name `GEMINI_API_KEY`, value = the key from Step 1
4. Tick all three environments (Production, Preview, Development), **Save**
5. Go to **Deployments**, click the newest one, **⋯ → Redeploy**

The redeploy is required — env vars only apply to builds made after they're set.

---

## Step 4 — Install it on your iPhone

**It must be Safari.** Chrome on iOS cannot install home-screen apps.

1. Open your Vercel URL in **Safari**
2. Tap the **Share** button (square with an arrow, at the bottom)
3. Scroll down, tap **Add to Home Screen**
4. Name it **SmartSpend**, tap **Add**

You'll get the coin-ring icon on your home screen. Open it — full screen, no
address bar, no Safari chrome. That's the app.

## Step 5 — Send it to your friend

Just send them the URL. Tell them: **open it in Safari, Share → Add to Home
Screen.** Same four taps. Nothing to install, nothing to approve.

---

## Things worth knowing

**Your data and theirs are completely separate.** SmartSpend is local-first —
everything lives in your phone's own storage. Your friend's expenses never touch
yours, and yours never leave your phone. Nothing syncs between devices, and
there is no shared household ledger yet. (`src/utils/profiles.js` is already
written as the seam where real accounts would plug in, if we ever want that.)

**Back up occasionally.** Because data is on-device, it goes if you delete the
app or wipe Safari's storage. Settings → **Export** writes a file — worth doing
now and then, especially early on.

**Updates are automatic.** Re-run `npx vercel --prod` after any change; the
service worker is network-first, so the next time you open the app it picks up
the new version by itself. No reinstalling.

**Offline works.** Once opened, the app shell is cached. You can add expenses
and tick off grocery items on a plane. Receipt *scanning* needs a connection,
since that call goes to Google.

**Camera works.** iOS has allowed camera access inside installed PWAs since
iOS 14.3, and the Scanner has a photo-upload fallback if it's ever refused.

---

## If something goes wrong

**"Add to Home Screen" is missing from the Share sheet**
You're not in Safari, or you're in a Private tab. Use a normal Safari tab.

**The icon is a blurry screenshot instead of the ring**
iOS cached the old page. Delete it from the home screen, fully quit Safari
(swipe up), reopen the URL, add it again.

**Scanning says the API key is missing**
Step 3 wasn't finished, or the project wasn't redeployed afterwards.

**A change you made isn't showing**
Close the app fully (swipe up from the app switcher) and reopen. If it's
stubborn, delete and re-add it to the home screen.
