# SmartSpend — Design Direction (reference for daily dev work)

App: SmartSpend — React/Vite local-first PWA, an expense + grocery tracker with Gemini receipt OCR.
Goal: a polished, glitch-free, best-in-class mobile experience. Improve this dev copy toward this spec, a little each day.

## Navigation (5 tabs)
Home · List (checklist) · Scan (raised center button) · History · Settings

## Design system (apply consistently on every screen)
- Theme: dark. Page bg `#0B0E13`, cards `#141921`, inputs/chips `#1B212B`.
- Accent: violet `#A99BFA`. Positive/under-budget: teal `#34D399`.
- Category colors: groceries teal `#34D399`, dining amber `#EF9F27`, fuel blue `#5BA3E8`, other gray `#9AA3AF`, meat coral `#E8896B`, produce green `#97C459`.
- Text: primary `#F4F6F8`, secondary `#8A93A0`, tertiary `#5A6270`.
- Cards radius 18–20px; dividers 0.5px `rgba(255,255,255,.06)`; two font weights only (400 / 500); one focal element per screen; generous spacing.

## Target screens
- Home: greeting + avatar; time tabs Today/Week/Month/Custom; budget ring (remaining in center) + "on track" pill; spent / daily-avg / days-left row; "Where it went" category bars; recent transactions.
- Scan: viewfinder + Scan Receipt / Upload Photo / Add Manually; review screen with merchant header, "total matches receipt" banner, editable line items (category chip + name + amount), "auto-corrected from memory" badge, Save · total.
- List: add item + Browse grocery catalog; items grouped by store with checkboxes + photo slot; Share on WhatsApp.
- History: time tabs; total spent + vs last month; "By category / By store" toggle; breakdown bars; dated transaction list; tap a row for detail.
- Settings: profile card; Budgeting (monthly budget, category budgets, recurring expenses); Scanning & data (manage stores, custom categories, scan name memory, export); App (appearance, sign out).

## Priorities
1. Unify the design system above across all screens (biggest current weakness).
2. Fix glitches and broken/empty states.
3. Close gaps vs. leading apps (Copilot Money, Monarch Money, Spendee, YNAB, Rocket Money, grocery trackers).
4. Lean into item-level grocery intelligence (per-item trends, restock nudges) — the app's main differentiator.
5. Better onboarding and empty/loading states.

## Hard rules
- Never modify the live app (the parent folder). Only this `Daily-Dev-Copy`.
- Keep the dev copy always compiling. Small, reversible steps only.
- Preserve all existing features.
