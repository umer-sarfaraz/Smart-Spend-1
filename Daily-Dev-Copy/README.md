# 📱 SmartSpend — Premium Local-First Mobile Expense Tracker

SmartSpend is a high-fidelity, high-performance Progressive Web Application (PWA) designed exclusively for seamless mobile expense tracking, smart visual bill parsing, collaborative family checklists, and pantry-audit budget rollovers. 

Built with a **100% Local-First** and privacy-first philosophy, all data resides securely on the user's phone, giving instant response times with zero network dependencies.

---

## 🚀 Key Features

*   **📈 Dynamic Circular Budget Ring**: Real-time visualization of monthly limits with glow rings and automatic warning alerts when passing 85% usage. Tap directly on the progress ring to instantly adjust limits.
*   **📷 AI Bill & Visual Object OCR Scanner**: Powered by Google Gemini AI (with a fallback offline rule engine), scan paper receipts to extract merchants, line items, and totals instantly.
*   **🛒 Store-Grouped Family Checklist**: Auto-groups items by assigned target shops (e.g., Walmart, Costco, Lotte). Collaborative checklist importing and exporting with partners over **WhatsApp** in a single tap.
*   **🌾 AI Pantry & Leftovers Rollover Engine**: Audits dry goods, fridge contents, and wheat bags. It estimates remaining volume percentages and automatically transfers the equivalent leftover cash value into next month's spending budget.
*   **🧠 Self-Learning Autocompletion Engine**: Automatically catalogs new user-typed grocery item names, pairing them with historical categories and stores for immediate future tap-completion.
*   **🎨 Ultra-Premium Modern Dark UI**: Implements glassmorphism, HSL tailormade glow accents,Outfit and Plus Jakarta Sans typography, and smooth touch drawer panels designed specifically for standard smartphone screens.

---

## 🛠️ Technology Stack

1.  **Core Framework**: React 18 & Vite 5 (Fast, optimized single-page bundle).
2.  **Styles**: Vanilla CSS Custom Premium System (Tailored variable theme tokens, high responsiveness, blur filters).
3.  **Visualization**: Recharts 2 (Sector breakdown gradients and monthly trends).
4.  **Parsing Utilities**: Tesseract.js (Offline client-side OCR) & Gemini 1.5 Flash API (Cloud vision extractor).
5.  **Iconography**: Lucide React.
6.  **Celebrations**: Try-catched canvas-confetti engines.

---

## ⚙️ Mobile PWA Deployment Guide

### Stand-alone App Setup
This application is fully responsive and behaves like a native iOS/Android shell when added to the home screen:

1.  **For Apple iOS (Safari)**: Open the app URL, tap the **Share** button, and select **Add to Home Screen**.
2.  **For Google Android (Chrome)**: Open the app URL, tap the three dots, and select **Install App** or **Add to Home Screen**.

### PWA Stability Hardening (Recent Updates)
To ensure reliable operation under standalone PWA conditions (Safari WebClips and Android standalone containers), the codebase has been heavily hardened:
*   **Anti-Hijacking Div Inputs**: Replaced legacy HTML `<form>` wrappers in checklist quick-type inputs and verify editors with modern active `div` elements, binding input `onKeyDown` (Enter key) and button `onClick` directly. This completely prevents standard browser navigation/reload hijacks common in WebClips.
*   **Confetti Sandboxing**: Wrapped all physics celebration sparks in robust `try-catch` blocks to prevent thread-blocking DOM exceptions in isolated PWA sandboxes where `HTMLCanvasElement` rendering is restricted.
*   **Chicken-and-Egg Camera Deadlock Solver**: Bypassed camera stream mounting locks. Viewports render immediately on `!cameraError` instead of waiting for `streamActive`, allowing `useRef` to mount the hardware video stream instantly.
*   **Responsive Item Splitting Columns**: Moved delete buttons to card-level headers in manual split-item rows, allowing the numeric price fields to expand to full width on mobile viewports for clean, spacious numeric typing.

---

## 💾 Local Storage Architecture

All state variables are serialized and saved inside the device's native local storage. If offline or in standalone mode, standard operations are fully operational:

| Storage Key | Data Structure | Purpose |
| :--- | :--- | :--- |
| `smartspend_expenses` | `Array<Expense>` | Primary ledger entries (Merchants, dates, amounts, items) |
| `smartspend_budget` | `Float` | Monthly spending ceiling |
| `smartspend_shopping_list` | `Array<ChecklistItem>` | Active checklist items grouped by store name |
| `smartspend_custom_stores` | `Array<String>` | User-added stores populated in dropdown filters |
| `smartspend_custom_suggestions` | `Array<Suggestion>` | Self-learned item suggestion catalog |
| `smartspend_pantry_inventory` | `Array<PantryItem>` | Current refrigerator and dry container audited stocks |
| `smartspend_gemini_key` | `String` | Secure local Google Gemini API key |

---

## 💻 Local Development Setup

To test and develop the application locally, clone this repository and run:

```bash
# Install package dependencies
npm install

# Run Vite responsive dev server
npm run dev

# Compile production-ready single page PWA bundle
npm run build
```

Once the dev server is launched, access the local port (e.g. `http://localhost:5173`) on your device or scan your local network IP on your mobile phone to test hardware cameras and touch interactions immediately.

---
*Created with 💙 by Antigravity pair-programming for premium personal finance management.*
