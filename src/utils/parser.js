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

// 6. Gemini Receipt Parser — calls the server-side proxy (/api/gemini)
// The API key is stored as a Vercel environment variable; clients never see it.
export async function parseWithGemini(base64Image, mimeType) {
  const prompt = `You are a receipt scanning engine for a personal mobile expense app.
Analyze this photo — it could be a retail grocery receipt, a wholesale/bulk store receipt (e.g. Restaurant Depot, Costco, Sam's Club, BJ's), or a gas pump meter screen.

Extract:
1. The merchant/store name (e.g. "Restaurant Depot", "Costco", "Walmart", "Chevron").
2. The transaction date in YYYY-MM-DD format (use today's date if not clearly visible).
3. Whether this is a gas station pump display screen (isGasMeter: true/false).
4. Every purchased line item with its correct extended price (the final charged amount per line).

IMPORTANT rules for item extraction:
- STRIP item/product codes — wholesale receipts often have 5-8 digit codes before item names. Remove them; only keep the human-readable name.
- For weight-based items (e.g. "15.62 LB @ $1.29/LB  $20.15"), use the extended price ($20.15) and write a clean name like "Chicken Breast (15.62 lb)".
- For case/pack items (e.g. "2 CS TOMATO SAUCE  $18.00"), write a clean name like "Tomato Sauce (2 cases)".
- Clean up abbreviated OCR names into readable English (e.g. "ORG TMT 25LB" → "Organic Tomatoes 25 lb").
- Skip lines for tax, fees, total, subtotal, discounts, payments, or coupons.
- For a gas meter, extract one item with the total fuel cost.

Categorize each item into exactly one of these 14 categories:
"vegetables" — fresh/frozen produce: tomatoes, potatoes, onions, peppers, spinach, etc.
"fruits" — apples, bananas, citrus, berries, grapes, etc.
"dairy" — milk, cheese, butter, yogurt, eggs, cream
"meat" — chicken, beef, pork, fish, seafood, deli meats
"bakery" — bread, rice, flour, pasta, oil, sauces, canned goods, dry goods, grains
"rent" — rent, mortgage, housing fees
"utilities" — electricity, water, internet, phone bill
"fuel" — gas station, diesel, petrol
"dining" — restaurants, cafes, coffee shops, fast food
"fitness" — gym, yoga, sports club
"education" — tuition, courses, school fees, books
"shopping" — hygiene, clothing, household goods, cleaning supplies
"entertainment" — streaming, cinema, games, subscriptions
"other" — anything that doesn't fit above

Return EXACTLY a JSON object with no markdown formatting, no code fences, matching this structure:
{
  "merchant": "Restaurant Depot",
  "date": "2026-05-24",
  "isGasMeter": false,
  "items": [
    { "name": "Chicken Breast (15.62 lb)", "amount": 20.15, "category": "meat" },
    { "name": "Roma Tomatoes 25 lb", "amount": 18.99, "category": "vegetables" },
    { "name": "Canola Oil 1 Gal", "amount": 12.49, "category": "bakery" }
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

// 7. Gemini Pantry Scanner — calls the server-side proxy (/api/gemini)
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
