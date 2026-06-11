// Smart Expense Parser Utility
// Supports offline dictionary parsing, gas meter parsing, and Gemini API parsing.

// 1. Sleek Icon and Color Mapping for Categories (14 Premium Sectors)
export const CATEGORIES = {
  vegetables: { label: 'Vegetables', icon: '\u{1F966}', color: '#10b981', gradient: 'linear-gradient(135deg, #059669, #10b981)' },
  fruits: { label: 'Fruits', icon: '\u{1F34E}', color: '#f43f5e', gradient: 'linear-gradient(135deg, #e11d48, #f43f5e)' },
  dairy: { label: 'Dairy & Eggs', icon: '\u{1F95B}', color: '#60a5fa', gradient: 'linear-gradient(135deg, #2563eb, #60a5fa)' },
  meat: { label: 'Meat & Seafood', icon: '\u{1F969}', color: '#fb7185', gradient: 'linear-gradient(135deg, #f43f5e, #fb7185)' },
  bakery: { label: 'Bakery & Pantry', icon: '\u{1F35E}', color: '#fbbf24', gradient: 'linear-gradient(135deg, #d97706, #fbbf24)' },
  rent: { label: 'Rent & Housing', icon: '\u{1F3E0}', color: '#818cf8', gradient: 'linear-gradient(135deg, #4f46e5, #818cf8)' },
  utilities: { label: 'Home Utilities', icon: '⚡', color: '#a78bfa', gradient: 'linear-gradient(135deg, #7c3aed, #a78bfa)' },
  fuel: { label: 'Fuel & Transport', icon: '⛽', color: '#f59e0b', gradient: 'linear-gradient(135deg, #b45309, #f59e0b)' },
  dining: { label: 'Cafe & Dining', icon: '☕', color: '#ec4899', gradient: 'linear-gradient(135deg, #be185d, #ec4899)' },
  fitness: { label: 'Gym & Fitness', icon: '\u{1F3CB}️', color: '#a3e635', gradient: 'linear-gradient(135deg, #65a30d, #a3e635)' },
  education: { label: 'Education & Fees', icon: '\u{1F393}', color: '#22d3ee', gradient: 'linear-gradient(135deg, #0891b2, #22d3ee)' },
  shopping: { label: 'Shopping & Personal', icon: '\u{1F6CD}️', color: '#2dd4bf', gradient: 'linear-gradient(135deg, #0f766e, #2dd4bf)' },
  entertainment: { label: 'Entertainment', icon: '\u{1F3AE}', color: '#f472b6', gradient: 'linear-gradient(135deg, #db2777, #f472b6)' },
  other: { label: 'General / Other', icon: '\u{1F4E6}', color: '#9ca3af', gradient: 'linear-gradient(135deg, #4b5563, #9ca3af)' }
};

export const ITEM_CATALOG = {
  vegetables: [
    'Asparagus', 'Broccoli', 'Cabbage', 'Carrots', 'Cauliflower', 'Celery',
    'Corn', 'Cucumber', 'Eggplant', 'Garlic', 'Green Beans', 'Green Onions',
    'Jalapenos', 'Kale', 'Lettuce', 'Mushrooms', 'Okra', 'Onions',
    'Peas', 'Peppers', 'Potatoes', 'Spinach', 'Sweet Potatoes', 'Tomatoes', 'Zucchini',
  ],
  fruits: [
    'Apples', 'Avocado', 'Bananas', 'Blueberries', 'Cantaloupe', 'Cherries',
    'Coconut', 'Grapes', 'Kiwi', 'Lemons', 'Limes', 'Mangoes',
    'Oranges', 'Peaches', 'Pears', 'Pineapple', 'Plums', 'Pomegranate',
    'Raspberries', 'Strawberries', 'Watermelon',
  ],
  dairy: [
    'Butter', 'Cheddar Cheese', 'Cottage Cheese', 'Cream Cheese', 'Eggs',
    'Feta Cheese', 'Greek Yogurt', 'Heavy Cream', 'Milk 1 Gallon',
    'Mozzarella Cheese', 'Parmesan', 'Ricotta', 'Shredded Cheese',
    'Sour Cream', 'Whipped Cream', 'Yogurt',
  ],
  meat: [
    'Bacon', 'Beef Steak', 'Chicken Breast', 'Chicken Thighs', 'Chicken Wings',
    'Crab', 'Ground Beef', 'Ground Turkey', 'Halal Chicken', 'Hot Dogs',
    'Lamb Chops', 'Lobster', 'Pork Chops', 'Salmon Fillet', 'Sausage',
    'Shrimp', 'Tilapia', 'Tuna', 'Turkey Breast',
  ],
  bakery: [
    'All-Purpose Flour', 'Atta Flour 20lb', 'Basmati Rice', 'Black Beans',
    'Bread', 'Brown Sugar', 'Canola Oil Gallon', 'Canned Tomatoes',
    'Cereal', 'Chickpeas', 'Coffee Beans', 'Crackers', 'Honey',
    'Jam', 'Lentils', 'Lipton Tea Bags', 'Oats', 'Olive Oil',
    'Pasta', 'Peanut Butter', 'Rice Bag', 'Salt', 'Soy Sauce',
    'Spaghetti', 'Sugar', 'Tomato Sauce', 'Tortillas', 'Vinegar',
    'White Rice', 'Whole Wheat Bread',
  ],
  shopping: [
    'Aluminum Foil', 'Bleach', 'Body Wash', 'Conditioner',
    'Deodorant', 'Dish Soap', 'Fabric Softener', 'Hand Soap',
    'Laundry Detergent', 'Lays Chips', 'Mineral Water Case',
    'Paper Towels', 'Plastic Wrap', 'Sandwich Bags', 'Shampoo',
    'Soda Cans 12-pack', 'Soap Bar', 'Toothbrush', 'Toothpaste',
    'Toilet Paper 24-pack', 'Trash Bags',
  ],
  dining: [
    'Coffee Creamer', 'Espresso Pods', 'Herbal Tea', 'Instant Noodles',
    'Protein Shake', 'Red Bull', 'Sparkling Water',
  ],
  other: [
    'Batteries', 'Candles', 'First Aid Kit', 'Vitamins', 'Zip Lock Bags',
  ],
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

// 6. Gemini Vision Receipt Parser — sends image directly to Gemini
// storeHint: 'general' | 'restaurant_depot' | 'costco' | 'walmart' | 'lotte' | 'halal' | 'gas'
export async function parseWithGemini(base64Image, mimeType, storeHint = 'general') {
  const today = new Date().toISOString().split('T')[0];

  // Each store gets its own tightly-scoped prompt so Gemini knows exactly what to expect
  const prompts = {

    restaurant_depot: `You are scanning a RESTAURANT DEPOT wholesale food receipt photo.

Restaurant Depot receipts have this EXACT layout per item:
  Line 1 → Item name in ALL CAPS, heavily abbreviated, e.g.:
            "CHX GV PATTY HALAL 10LBS"   = Halal Chicken Patties 10 lb       → $23.24
            "BF GROUND 90%HALAL 10LB"    = Ground Beef 90% Halal 10 lb       → $67.64
            "PD GARLIC LOOSE 6/5LB"      = Garlic Loose 6×5 lb               → $14.44
            "FLOR A/P LENZ BEST 25LB"    = All-Purpose Flour Best 25 lb      → $10.28
            "CHZ PS MOZZ SH GAL 6/5LB"   = Mozzarella Shredded Gallon 6×5 lb → $15.01
            "SWARNA CHAKKI ATTA 20LBS"   = Swarna Chakki Atta Flour 20 lb    → $15.57
            "CHIC BRST MED SIZE"          = Chicken Breast Medium Size        → $86.00
  Line 2 → 12–13 digit UPC barcode. IGNORE — do NOT include in name.
  Line 3 → Tax code "(TA)" or "U(TA)". For weight items also shows e.g. "(TA)40LB@$2.15LB"
  Line 4 → "UNITS 1" and the final price right-aligned, e.g. "UNITS 1    $23.24"

PRICE = the last dollar amount in each item block. For weight items like
"(TA)40LB@$2.15LB" the final price $86.00 appears on the next line — use $86.00.

IGNORE these lines entirely: all 12–13 digit barcodes, "(TA)", "U(TA)", "UNITS 1",
"UNITS ENTERED", "CASES ENTERED", "ITEMS RUNG UP", "TOTAL RW ITEMS", "UNITS COUNT",
the transaction header (e.g. "C16 I10736 DP287941"), and any TOTAL/TAX lines.

ABBREVIATIONS: CHX=Chicken | BF GROUND=Ground Beef | PD=Produce | FLOR=Flour
A/P=All-Purpose | CHZ=Cheese | MOZZ=Mozzarella | SH=Shredded | GAL=Gallon
CHIC BRST=Chicken Breast | MED=Medium | GV=Giant Value (can omit)
SIZES: 10LBS→"10 lb" | 20LBS→"20 lb" | 25LB→"25 lb" | 6/5LB→"6×5 lb" | 40LB→"40 lb"

Merchant = "Restaurant Depot". Date from receipt header or use ${today}.

Return ONLY valid JSON, no markdown, no code fences:
{"merchant":"Restaurant Depot","date":"${today}","isGasMeter":false,"items":[{"name":"Halal Chicken Patties 10 lb","amount":23.24,"category":"meat"},{"name":"Garlic Loose 6x5 lb","amount":14.44,"category":"vegetables"}]}`,

    costco: `You are scanning a COSTCO WHOLESALE receipt photo.
Strip 6–7 digit item numbers. Include pack size in name. Use extended (rightmost) price.
Date from receipt or use ${today}.
Return ONLY valid JSON no markdown: {"merchant":"Costco","date":"${today}","isGasMeter":false,"items":[{"name":"Item","amount":0.00,"category":"other"}]}`,

    walmart: `You are scanning a WALMART retail receipt photo.
Two-column format: name left, price right. Strip tax codes T/X/N after prices.
Date from receipt or use ${today}.
Return ONLY valid JSON no markdown: {"merchant":"Walmart","date":"${today}","isGasMeter":false,"items":[{"name":"Item","amount":0.00,"category":"other"}]}`,

    lotte: `You are scanning a LOTTE PLAZA Asian supermarket receipt photo.
Translate Korean/Chinese/Japanese abbreviations to English. Standard retail format.
Date from receipt or use ${today}.
Return ONLY valid JSON no markdown: {"merchant":"Lotte Plaza","date":"${today}","isGasMeter":false,"items":[{"name":"Item","amount":0.00,"category":"other"}]}`,

    halal: `You are scanning a HALAL STORE / Middle Eastern grocery receipt photo.
Translate Arabic/Urdu names to English. Weight-based pricing common for meats.
Date from receipt or use ${today}.
Return ONLY valid JSON no markdown: {"merchant":"Halal Store","date":"${today}","isGasMeter":false,"items":[{"name":"Item","amount":0.00,"category":"other"}]}`,

    gas: `You are scanning a GAS STATION fuel receipt or pump display photo.
isGasMeter must be true. Single item: "Unleaded Fuel (X.XX gal @ $X.XX/gal)". Category: "fuel".
Return ONLY valid JSON no markdown: {"merchant":"Gas Station","date":"${today}","isGasMeter":true,"items":[{"name":"Unleaded Fuel","amount":0.00,"category":"fuel"}]}`,

    general: `You are scanning a retail or grocery receipt photo.
Extract every purchased item with its price. Skip totals, tax, payment lines.
Date from receipt or use ${today}.
Categorize: vegetables/fruits/dairy/meat/bakery/shopping/dining/fuel/utilities/other.
Return ONLY valid JSON no markdown: {"merchant":"Store","date":"${today}","isGasMeter":false,"items":[{"name":"Item","amount":0.00,"category":"other"}]}`,
  };

  const basePrompt = prompts[storeHint] || prompts.general;

  // Append universal accuracy, category and format rules
  const prompt = `${basePrompt}

ACCURACY RULES — follow strictly:
1. Read each price digit by digit from the image. Prices always have exactly 2 decimals. Do not round, estimate, or guess a price you cannot clearly read.
2. NEVER invent items. Only output items whose text is actually visible in the photo.
3. If an item's name is partially unreadable, transcribe the readable part and keep going — do not skip the item if its price is clear.
4. If an item's PRICE is unreadable, set "amount": 0 so the user can fill it in.
5. Negative amounts (refunds, coupons, discounts applied to an item) should be included as negative numbers.
6. Quantity lines like "2 @ $3.99" followed by "$7.98": output ONE item with the total $7.98 and put the quantity in the name.
7. Find the printed SUBTOTAL (before tax) and TOTAL on the receipt and report them in "receiptSubtotal" and "receiptTotal". If not visible use null. Your extracted items should sum approximately to the subtotal — re-check any line that looks off before answering.

CATEGORIES for all items — pick exactly one:
"vegetables","fruits","dairy","meat","bakery","rent","utilities","fuel","dining","fitness","education","shopping","entertainment","other"

REQUIRED OUTPUT FORMAT — return ONLY this JSON structure, nothing else:
{
  "merchant": "Store Name",
  "date": "YYYY-MM-DD",
  "isGasMeter": false,
  "receiptSubtotal": 52.10,
  "receiptTotal": 54.20,
  "items": [
    { "name": "Clean Item Name", "amount": 12.34, "category": "meat" }
  ]
}`;

  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64Image, mimeType, prompt })
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    // Include raw response in error so Scanner can display it for debugging
    throw new Error(body.error || `API error ${response.status}`);
  }

  // Validate the result has the expected shape
  if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
    throw new Error(`Gemini returned no items. Raw: ${body.raw || JSON.stringify(body).slice(0, 200)}`);
  }

  return body;
}

// Shared store hints for the text-based parser (used as fallback)
const STORE_HINTS = {
  restaurant_depot: 'Restaurant Depot wholesale receipt.',
  costco: 'Costco Wholesale receipt.',
  walmart: 'Walmart retail receipt.',
  lotte: 'Lotte Plaza Asian supermarket receipt.',
  halal: 'Halal store / Middle Eastern grocery receipt.',
  gas: 'Gas station fuel receipt. Set isGasMeter: true.',
  general: 'General retail receipt.',
};

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
