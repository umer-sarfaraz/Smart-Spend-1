// Smart Expense Parser Utility
// Supports offline dictionary parsing, gas meter parsing, and Gemini API parsing.

// 1. Sleek Icon and Color Mapping for Categories (14 Premium Sectors)
export const CATEGORIES = {
  vegetables: { label: 'Vegetables', icon: '🥦', color: '#10b981', gradient: 'linear-gradient(135deg, #059669, #10b981)' },
  fruits: { label: 'Fruits', icon: '🍎', color: '#f43f5e', gradient: 'linear-gradient(135deg, #e11d48, #f43f5e)' },
  dairy: { label: 'Dairy & Eggs', icon: '🥛', color: '#60a5fa', gradient: 'linear-gradient(135deg, #2563eb, #60a5fa)' },
  meat: { label: 'Meat & Seafood', icon: '🥩', color: '#fb7185', gradient: 'linear-gradient(135deg, #f43f5e, #fb7185)' },
  bakery: { label: 'Bakery & Pantry', icon: '🍞', color: '#fbbf24', gradient: 'linear-gradient(135deg, #d97706, #fbbf24)' },
  rent: { label: 'Rent & Housing', icon: '🏠', color: '#818cf8', gradient: 'linear-gradient(135deg, #4f46e5, #818cf8)' },
  utilities: { label: 'Home Utilities', icon: '⚡', color: '#a78bfa', gradient: 'linear-gradient(135deg, #7c3aed, #a78bfa)' },
  fuel: { label: 'Fuel & Transport', icon: '⛽', color: '#f59e0b', gradient: 'linear-gradient(135deg, #b45309, #f59e0b)' },
  dining: { label: 'Café & Dining', icon: '☕', color: '#ec4899', gradient: 'linear-gradient(135deg, #be185d, #ec4899)' },
  fitness: { label: 'Gym & Fitness', icon: '🏋️', color: '#a3e635', gradient: 'linear-gradient(135deg, #65a30d, #a3e635)' },
  education: { label: 'Education & Fees', icon: '🎓', color: '#22d3ee', gradient: 'linear-gradient(135deg, #0891b2, #22d3ee)' },
  shopping: { label: 'Shopping & Personal', icon: '🛍️', color: '#2dd4bf', gradient: 'linear-gradient(135deg, #0f766e, #2dd4bf)' },
  entertainment: { label: 'Entertainment', icon: '🎮', color: '#f472b6', gradient: 'linear-gradient(135deg, #db2777, #f472b6)' },
  other: { label: 'General / Other', icon: '📦', color: '#9ca3af', gradient: 'linear-gradient(135deg, #4b5563, #9ca3af)' }
};

// 2. Local Keyword Dictionary for Offline Parsing
const DICTIONARY = [
  // Vegetables
  { keywords: ['tomato', 'potato', 'onion', 'garlic', 'carrot', 'lettuce', 'cucumber', 'spinach', 'cabbage', 'broccoli', 'avocado', 'salad', 'veg', 'peppers', 'chili', 'ginger'], category: 'vegetables' },
  // Fruits
  { keywords: ['apple', 'banana', 'lemon', 'orange', 'berry', 'strawberry', 'blueberry', 'grapes', 'mango', 'peach', 'watermelon', 'fruit'], category: 'fruits' },
  // Dairy & Eggs
  { keywords: ['milk', 'cheese', 'butter', 'yogurt', 'egg', 'cream', 'cheddar', 'mozzarella', 'dairy', 'curd'], category: 'dairy' },
  // Meat & Seafood (includes wholesale bulk formats)
  { keywords: ['chicken', 'beef', 'pork', 'salmon', 'tuna', 'steak', 'turkey', 'sausage', 'bacon', 'shrimp', 'fish', 'meat', 'breast', 'thigh', 'wing', 'leg', 'ground beef', 'ribeye', 'tilapia', 'catfish', 'cod', 'crab', 'lobster', 'clam', 'oyster', 'veal', 'lamb', 'brisket'], category: 'meat' },
  // Bakery & Pantry (includes wholesale bulk dry goods)
  { keywords: ['bread', 'rice', 'flour', 'sugar', 'pasta', 'oil', 'cereal', 'oats', 'toast', 'tortilla', 'spaghetti', 'bean', 'sauce', 'spice', 'wheat', 'canola', 'olive oil', 'vinegar', 'seasoning', 'salt', 'pepper', 'canned', 'case', 'pack', 'jar', 'can '], category: 'bakery' },
  // Rent & Housing
  { keywords: ['rent', 'mortgage', 'lease', 'housing fee', 'property tax', 'landlord', 'tenant'], category: 'rent' },
  // Home Utilities
  { keywords: ['electricity', 'water bill', 'power', 'sewer', 'trash', 'internet', 'wifi', 'comcast', 'verizon', 'utility', 'electric'], category: 'utilities' },
  // Fuel & Transport
  { keywords: ['gas', 'fuel', 'petrol', 'chevron', 'shell', 'exxon', 'mobil', 'bp', 'unleaded', 'diesel', 'octane', 'gal', 'gallon', 'pump'], category: 'fuel' },
  // Café & Dining
  { keywords: ['coffee', 'cafe', 'cappuccino', 'latte', 'starbucks', 'pizza', 'mcdonald', 'burger', 'restaurant', 'dining', 'lunch', 'dinner', 'pub', 'bar'], category: 'dining' },
  // Gym & Fitness
  { keywords: ['gym', 'fitness', 'membership', 'yoga', 'workout', 'exercise', 'training', 'health club', 'crossfit'], category: 'fitness' },
  // Education & Fees
  { keywords: ['tuition', 'school', 'fees', 'course', 'book', 'learning', 'class', 'university', 'college', 'academy'], category: 'education' },
  // Shopping & Personal
  { keywords: ['amazon', 'target', 'walmart', 'shampoo', 'soap', 'clothes', 'shirt', 'pants', 'shoes', 'apparel', 'ikea', 'furniture', 'gift', 'bag', 'toothpaste', 'detergent'], category: 'shopping' },
  // Entertainment
  { keywords: ['cinema', 'movie', 'concert', 'game', 'playstation', 'steam', 'bowling', 'theater', 'show', 'netflix', 'spotify', 'subscription'], category: 'entertainment' }
];

// Determine category based on item name
export function categorizeItem(name) {
  const cleanName = name.toLowerCase();
  for (const group of DICTIONARY) {
    for (const word of group.keywords) {
      if (cleanName.includes(word)) {
        return group.category;
      }
    }
  }
  return 'other';
}

// 3. Demo Receipts for Simulator Screen (Funnels mock data for instant wow factor!)
export const DEMO_RECEIPTS = [
  {
    id: 'kroger_grocery',
    title: '🥦 Kroger Grocery Receipt',
    merchant: 'Kroger Supermarket',
    date: new Date().toISOString().split('T')[0],
    isGasMeter: false,
    items: [
      { name: 'Organic Roma Tomatoes (1lb)', amount: 3.49, category: 'vegetables' },
      { name: 'Fresh Gala Apples (3lb bag)', amount: 4.99, category: 'fruits' },
      { name: 'Whole Milk 1 Gallon', amount: 3.89, category: 'dairy' },
      { name: 'Large White Eggs 12ct', amount: 2.99, category: 'dairy' },
      { name: 'Fresh Atlantic Salmon Fillet', amount: 14.50, category: 'meat' },
      { name: 'Honey Wheat Sandwich Bread', amount: 2.29, category: 'bakery' },
      { name: 'Head & Shoulders Shampoo 400ml', amount: 6.99, category: 'shopping' }
    ]
  },
  {
    id: 'chevron_fuel',
    title: '⛽ Chevron Gas Meter Screen',
    merchant: 'Chevron Fuel Station',
    date: new Date().toISOString().split('T')[0],
    isGasMeter: true,
    items: [
      { name: 'Unleaded Fuel (12.8 Gal @ $3.51/gal)', amount: 45.00, category: 'fuel' }
    ]
  },
  {
    id: 'starbucks_dining',
    title: '☕ Starbucks Cafe Receipt',
    merchant: 'Starbucks #4829',
    date: new Date().toISOString().split('T')[0],
    isGasMeter: false,
    items: [
      { name: 'Grande Caffe Latte', amount: 5.45, category: 'dining' },
      { name: 'Butter Croissant', amount: 3.95, category: 'dining' },
      { name: 'Chocolate Chip Cookie', amount: 2.85, category: 'dining' }
    ]
  }
];

// 4. Pantry Fridge Mock Database for AI Vision Scanner Simulation
export const DEMO_PANTRY_ITEMS = {
  fridge: [
    { name: 'Whole Milk Gallon', category: 'dairy', fullPercent: 30, originalCost: 3.89 },
    { name: 'Large Eggs 12ct', category: 'dairy', fullPercent: 50, originalCost: 2.99 },
    { name: 'Organic Roma Tomatoes', category: 'vegetables', fullPercent: 20, originalCost: 3.49 },
    { name: 'Fresh Atlantic Salmon', category: 'meat', fullPercent: 0, originalCost: 14.50 }
  ],
  dry: [
    { name: 'Honey Wheat Sandwich Bread', category: 'bakery', fullPercent: 50, originalCost: 2.29 },
    { name: 'Premium Wheat Container', category: 'bakery', fullPercent: 40, originalCost: 10.00 }
  ]
};

// Known store name patterns for merchant detection
const KNOWN_STORES = [
  ['restaurant depot', 'Restaurant Depot'],
  ['costco', 'Costco Wholesale'],
  ["sam's club", "Sam's Club"],
  ["bj's wholesale", "BJ's Wholesale"],
  ['walmart', 'Walmart'],
  ['kroger', 'Kroger'],
  ['target', 'Target'],
  ['whole foods', 'Whole Foods Market'],
  ['trader joe', "Trader Joe's"],
  ['aldi', 'ALDI'],
  ['publix', 'Publix'],
  ['safeway', 'Safeway'],
  ['chevron', 'Chevron'],
  ['shell', 'Shell'],
  ['exxon', 'ExxonMobil'],
  ['bp fuel', 'BP'],
  ['starbucks', 'Starbucks'],
  ['mcdonald', "McDonald's"],
];

// Skip-line keywords (totals, taxes, payment lines)
const SKIP_KEYWORDS = ['total', 'subtotal', 'amount due', 'balance', 'tax', 'hst', 'gst', 'vat',
  'cash', 'change', 'credit', 'debit', 'visa', 'mastercard', 'payment', 'tender', 'savings', 'discount'];

// 5. Offline Tesseract Regex Parser
// Handles retail receipts AND wholesale/bulk store formats (Restaurant Depot, Costco, etc.)
export function parseOcrTextOffline(text) {
  const lines = text.split('\n');
  const items = [];
  let merchant = 'Unknown Merchant';
  let total = 0;
  let date = new Date().toISOString().split('T')[0];
  let isGasMeter = false;

  const lowerText = text.toLowerCase();
  const nonEmptyLines = lines.map(l => l.trim()).filter(l => l.length > 0);

  // Merchant: scan full text for known store names first, then fall back to first line
  let foundStore = false;
  for (const [keyword, name] of KNOWN_STORES) {
    if (lowerText.includes(keyword)) {
      merchant = name;
      foundStore = true;
      break;
    }
  }
  if (!foundStore && nonEmptyLines.length > 0) {
    merchant = nonEmptyLines[0];
  }

  // Gas meter detection
  if (lowerText.includes('gallon') || lowerText.includes('gal ') || lowerText.includes('price/gal') ||
      lowerText.includes('$/gal') || lowerText.includes('octane') || lowerText.includes('pump #')) {
    isGasMeter = true;
    if (!foundStore) merchant = 'Gas Station Fuel';
  }

  // Date extraction: MM/DD/YY or MM/DD/YYYY or YYYY-MM-DD
  const dateMatch = text.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/) ||
                    text.match(/\b(\d{4})\-(\d{2})\-(\d{2})\b/);
  if (dateMatch) {
    try {
      const [, a, b, c] = dateMatch;
      if (a.length === 4) {
        date = `${a}-${b}-${c}`;
      } else {
        const yr = c.length === 2 ? `20${c}` : c;
        date = `${yr}-${a.padStart(2, '0')}-${b.padStart(2, '0')}`;
      }
    } catch {}
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 3) continue;

    const lowerLine = trimmed.toLowerCase();

    // Capture max total from summary lines, then skip them
    if (SKIP_KEYWORDS.some(k => lowerLine.includes(k))) {
      const m = trimmed.match(/(\d+\.\d{2})/g);
      if (m) {
        const val = Math.max(...m.map(parseFloat));
        if (val > total) total = val;
      }
      continue;
    }

    // Strip leading item codes: 5+ consecutive digits at start of line (wholesale format)
    let cleaned = trimmed.replace(/^\d{5,}\s+/, '').trim();
    if (!cleaned || cleaned.length < 2) continue;

    // Find ALL prices on the line
    const allPrices = cleaned.match(/\b\d{1,5}\.\d{2}\b/g);
    if (!allPrices || allPrices.length === 0) continue;

    // Use the LAST price — in wholesale receipts the rightmost column is the extended (line) total
    const lastPriceStr = allPrices[allPrices.length - 1];
    const amount = parseFloat(lastPriceStr);
    if (amount <= 0 || amount > 9999) continue;

    // Name = everything before the last price occurrence
    const lastPriceIdx = cleaned.lastIndexOf(lastPriceStr);
    let name = cleaned.substring(0, lastPriceIdx).trim();

    // Clean up wholesale formatting artifacts from name
    name = name.replace(/\s+@\s+\$?\d+\.\d+\/\w+\s*$/, '').trim();    // "@ $1.29/LB"
    name = name.replace(/\s+\d+\.\d+\/\w+\s*$/, '').trim();            // "1.29/LB"
    name = name.replace(/^\d+\.?\d*\s*(LB|OZ|KG|G|EA|CS|CT|PC)\s+/i, '').trim(); // "15.62 LB "
    name = name.replace(/^\d+\s*[xX]\s+/, '').trim();                  // "2 X "
    name = name.replace(/[\*\#]+$/, '').trim();                         // trailing * #

    if (name.length < 2) continue;
    if (/^[\d\s\.\-\*\/\\]+$/.test(name)) continue; // pure numeric/symbol — not an item
    if (lowerLine.includes('www.') || lowerLine.includes('http')) continue;

    items.push({ name, amount, category: categorizeItem(name) });
  }

  if (items.length === 0) {
    if (total === 0) {
      const allPrices = text.match(/\b\d+\.\d{2}\b/g);
      if (allPrices) total = Math.max(...allPrices.map(parseFloat));
    }
    if (total === 0) total = 10.00;
    items.push({
      name: isGasMeter ? 'Fuel Capture' : 'General Purchase',
      amount: total,
      category: isGasMeter ? 'fuel' : 'other'
    });
  }

  return { merchant, date, isGasMeter, items };
}

// Store-specific prompt hints injected into the Gemini prompt for better accuracy
const STORE_HINTS = {
  restaurant_depot: `
STORE: This is a Restaurant Depot wholesale food distributor receipt. Use these rules:
- Items appear in MULTI-LINE blocks: line 1 = item name, line 2 = 12-13 digit UPC barcode, line 3 = tax code + sometimes weight info, then price right-aligned.
- STRIP all 12-13 digit UPC barcodes — they are not part of the item name.
- STRIP tax code tokens: "(TA)", "U(TA)", "(TX)", "N" — these are tax indicators, not part of the name.
- STRIP "UNITS 1", "CASES ENTERED 0", "ITEMS RUNG UP", "UNITS COUNT", "TOTAL RW ITEMS" — these are footer labels, not items.
- Weight-based pricing format: "(TA)10.05LB@$6.73LB  $67.64" means 10.05 lbs at $6.73/lb = $67.64. Use the final right-aligned price ($67.64) and write name as "Beef Ground 90% Halal (10.05 lb)".
- Case format: "6/5LB" = case of 6 units each 5 lb. "CHZ PS MOZZ SH GAL 6/5LB" → "Mozzarella Shredded Gallon 6×5 lb".
- Always include bulk size in name: "Atta Flour 20 lb", "Chicken Breast 40 lb", "All-Purpose Flour 25 lb".
- The rightmost dollar amount on each item block is the extended price (what was charged). Use that.`,

  costco: `
STORE: This is a Costco Wholesale receipt.
- Strip 6-7 digit Costco item numbers that appear before item names.
- Items are bulk/large quantity. Include size in name ("Kirkland Chicken Breast 6 lb").
- Format: item number, description, quantity, unit price, extended price. Use extended price.`,

  walmart: `
STORE: This is a Walmart retail receipt.
- Two-column format: item description left, price right.
- Strip trailing tax codes: T = taxable, X = taxable, N = non-taxable.
- Weight stickers show "XX LB @ $X.XX/LB" — use the extended price and include weight in name.`,

  lotte: `
STORE: This is a Lotte Plaza Asian supermarket receipt.
- May contain Korean, Chinese, or Japanese product abbreviations — translate to readable English names.
- Focus: fresh Asian produce, seafood, Korean/Japanese packaged foods.
- Standard retail single-line format.`,

  halal: `
STORE: This is a halal butcher / Middle Eastern grocery receipt.
- Focus: halal meats, Middle Eastern pantry items.
- Weight-based pricing common for fresh cuts.
- May have Arabic or Urdu product names — translate to English.`,

  gas: `
STORE: This is a gas station fuel receipt or pump display.
- Set isGasMeter: true.
- Extract as a single fuel item: gallons pumped, price per gallon, total.
- Name format: "Unleaded Fuel (12.8 gal @ $3.51/gal)".`,

  general: '',
};

// 6. Gemini Receipt Parser — calls the server-side proxy (/api/gemini)
// The API key is stored as a Vercel environment variable; clients never see it.
// storeHint: 'general' | 'restaurant_depot' | 'costco' | 'walmart' | 'lotte' | 'halal' | 'gas'
export async function parseWithGemini(base64Image, mimeType, storeHint = 'general') {
  const storeContext = STORE_HINTS[storeHint] || '';

  const prompt = `You are a receipt scanning engine for a personal mobile expense app.
Analyze this photo — it could be a retail grocery receipt, a wholesale/bulk store receipt, or a gas pump display.
${storeContext}

Extract:
1. The merchant/store name (e.g. "Restaurant Depot", "Costco", "Walmart", "Chevron").
2. The transaction date in YYYY-MM-DD format (use today's date if not clearly visible).
3. Whether this is a gas station pump display screen (isGasMeter: true/false).
4. Every purchased line item with its correct extended price (the final charged amount per line).

GENERAL rules (apply to all stores unless overridden above):
- STRIP item/product codes — wholesale receipts often have 5-8 digit codes before item names. Remove them.
- For weight-based items (e.g. "15.62 LB @ $1.29/LB  $20.15"), use the extended price ($20.15) and include weight in name.
- For case/pack items (e.g. "2 CS TOMATO SAUCE  $18.00"), write a clean name like "Tomato Sauce (2 cases)".
- Clean up abbreviated OCR names into readable English (e.g. "ORG TMT 25LB" → "Organic Tomatoes 25 lb").
- Skip lines for tax, fees, total, subtotal, discounts, payments, or coupons.

Categorize each item into exactly one of these 14 categories:
"vegetables","fruits","dairy","meat","bakery","rent","utilities","fuel","dining","fitness","education","shopping","entertainment","other"

Return EXACTLY a JSON object with no markdown formatting, no code fences:
{
  "merchant": "Restaurant Depot",
  "date": "2026-05-24",
  "isGasMeter": false,
  "items": [
    { "name": "Halal Chicken Patties 10 lb", "amount": 23.24, "category": "meat" },
    { "name": "Garlic Loose 6×5 lb", "amount": 14.44, "category": "vegetables" }
  ]
}`;

  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64Image, mimeType, prompt })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'AI service failed');
  }

  return await response.json();
}

// 7. NEW PRIMARY PARSER: Send OCR text to Gemini for intelligent parsing
// This is more reliable than sending the image — Gemini's text reasoning >> its vision OCR
export async function parseTextWithGemini(ocrText, storeHint = 'general') {

  // Per-store text parsing rules injected into the prompt
  const textHints = {
    restaurant_depot: `
STORE: Restaurant Depot (wholesale food distributor)

RECEIPT FORMAT — each item appears in a 3–4 line block:
  Line 1: Item name in ALL CAPS (abbreviated), e.g. "CHX GV PATTY HALAL 10LBS"
  Line 2: 12–13 digit UPC barcode — IGNORE completely, never include in name
  Line 3: Tax code "(TA)" or "U(TA)", sometimes followed by weight×price e.g. "(TA)10.05LB@$6.73LB"
  Line 4: "UNITS 1" then the extended price right-aligned, e.g. "$23.24"
  (Lines 3–4 are sometimes merged into one line)

PRICE RULE: The price for each item is the LAST "$X.XX" value that appears in the item block — that is the extended/total price actually charged.

SKIP THESE LINES (not items):
  • Any line that is only digits (barcode)
  • "(TA)", "U(TA)", "(TX)", "N" alone on a line
  • "UNITS 1", "UNITS ENTERED", "CASES ENTERED", "ITEMS RUNG UP"
  • "TOTAL RW ITEMS", "UNITS COUNT"
  • Header line (transaction number like "C16 I10736 DP287941")
  • Any line containing TOTAL, SUBTOTAL, TAX, CHANGE, CASH, CREDIT

DECODE THESE ABBREVIATIONS (expand them in the output name):
  CHX → Chicken | BF → Beef | BF GROUND → Ground Beef | PD → Produce
  GV → Giant Value (brand, can keep or drop) | FLOR → Flour | A/P → All-Purpose
  CHZ → Cheese | PS → Processed | MOZZ → Mozzarella | SH → Shredded | GAL → Gallon
  CHIC BRST → Chicken Breast | MED SIZE → Medium Size | SWARNA CHAKKI ATTA → Swarna Chakki Atta (keep as-is, it's a flour brand)

SIZE FORMAT: Include bulk size in the name.
  10LBS → "10 lb" | 20LBS → "20 lb" | 25LB → "25 lb" | 6/5LB → "6×5 lb" | 40LB → "40 lb"

WEIGHT ITEMS: "(TA)40LB@$2.15LB ... $86.00" means 40 lb at $2.15/lb = $86.00.
  Name: "Chicken Breast Med Size (40 lb)" | Amount: 86.00`,

    costco: `
STORE: Costco Wholesale
FORMAT: Each line has: item number (6–7 digits, skip), description, quantity, unit price, extended price.
Use extended price. Include size/quantity in name. Strip Costco item numbers.`,

    walmart: `
STORE: Walmart retail
FORMAT: Two columns — description left, price right. Tax codes T/X/N after price — strip them.
Weight items: "X.XX lb @ $X.XX/lb" on same line — use the total price at the end.`,

    lotte: `
STORE: Lotte Plaza Asian supermarket
FORMAT: Standard retail receipt. Item name left, price right.
Translate any Korean/Japanese/Chinese product abbreviations to readable English.
Focus on fresh produce, seafood, Asian packaged goods.`,

    halal: `
STORE: Halal butcher / Middle Eastern grocery
FORMAT: Standard retail. Weight-based for fresh meats (lb × price/lb = total).
Translate Arabic/Urdu product names to English. Categorize halal meats as "meat".`,

    gas: `
STORE: Gas station fuel receipt or pump display
Set isGasMeter: true. Single item: gallons × price/gal = total.
Name format: "Unleaded Fuel (X.XX gal @ $X.XX/gal)"`,

    general: `
STORE: General retail receipt
FORMAT: Most lines are "Item name ..... $price" or "Item name   $price".
Skip totals, taxes, payment lines, store header/footer.
For weight items, use the extended (total) price.`,
  };

  const storeInstructions = textHints[storeHint] || textHints.general;
  const today = new Date().toISOString().split('T')[0];

  const prompt = `You are an expert receipt parser. Below is raw OCR text scanned from a grocery/store receipt. Parse it and extract all purchased items.

${storeInstructions}

CATEGORIES — assign each item to exactly one:
"vegetables" — produce: tomatoes, potatoes, onions, garlic, peppers, greens, etc.
"fruits" — apples, bananas, citrus, berries, grapes, mangoes, etc.
"dairy" — milk, cheese, butter, yogurt, eggs, cream
"meat" — chicken, beef, lamb, pork, fish, seafood, halal meats
"bakery" — bread, rice, flour, pasta, oil, sauces, canned goods, dry goods, grains, atta, lentils
"rent" — rent, mortgage, housing
"utilities" — electricity, water, internet, phone bill
"fuel" — gas station, diesel, petrol
"dining" — restaurants, cafes, coffee, fast food
"fitness" — gym, yoga, sports
"education" — tuition, books, courses
"shopping" — hygiene, cleaning, household, clothing, personal care
"entertainment" — streaming, cinema, games
"other" — anything else

TODAY'S DATE: ${today} (use this if date is not visible in receipt)

RAW OCR TEXT FROM RECEIPT:
---
${ocrText}
---

Return EXACTLY a JSON object with no markdown, no code fences, no explanation — just the raw JSON:
{
  "merchant": "Store Name",
  "date": "YYYY-MM-DD",
  "isGasMeter": false,
  "items": [
    { "name": "Human Readable Item Name", "amount": 12.34, "category": "meat" }
  ]
}`;

  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }) // text-only — no image needed
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Gemini text parse failed');
  }

  const result = await response.json();

  // Validate the response has the expected shape
  if (!result.items || !Array.isArray(result.items)) {
    throw new Error('Gemini returned invalid structure');
  }

  return result;
}

// 8. Gemini Pantry Scanner — calls the server-side proxy (/api/gemini)
export async function scanPantryWithGemini(base64Image, mimeType, scanType) {
  const prompt = scanType === 'fridge'
    ? `You are an AI fridge scanning engine. Analyze this photo of the inside of an open refrigerator.
Identify visible ingredients and estimate how full each item is as a percentage (fullPercent: 0 to 100, representing remaining quantity).
Only return standard, concrete items like Milk, Eggs, Butter, Cheese, Tomatoes, Lettuce, Meat, Salmon, Yogurt.
Categorize each into "dairy", "vegetables", "fruits", "meat", "bakery", or "other".
Return EXACTLY a JSON array, with no markdown styling around it, matching this format:
[
  { "name": "Whole Milk Gallon", "category": "dairy", "fullPercent": 30 },
  { "name": "Organic Roma Tomatoes", "category": "vegetables", "fullPercent": 70 }
]`
    : `You are an AI pantry container scanner. Analyze this photo of a dry ingredient package (like wheat, flour, rice, sugar, or cereal).
Identify what the ingredient is, and estimate what percentage of the package is still remaining (fullPercent: 0 to 100).
Return EXACTLY a JSON array containing a single item, with no markdown formatting, matching this format:
[
  { "name": "Premium Wheat Container", "category": "bakery", "fullPercent": 40 }
]`;

  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64Image, mimeType, prompt })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'AI service failed');
  }

  return await response.json();
}
