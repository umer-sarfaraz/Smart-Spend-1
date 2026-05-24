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
  // Meat & Seafood
  { keywords: ['chicken', 'beef', 'pork', 'salmon', 'tuna', 'steak', 'turkey', 'sausage', 'bacon', 'shrimp', 'fish', 'meat'], category: 'meat' },
  // Bakery & Pantry
  { keywords: ['bread', 'rice', 'flour', 'sugar', 'pasta', 'oil', 'cereal', 'oats', 'toast', 'tortilla', 'spaghetti', 'bean', 'sauce', 'spice', 'wheat'], category: 'bakery' },
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

// 5. Offline Tesseract Regex Parser
// Scans extracted OCR text block by block to find totals and split items
export function parseOcrTextOffline(text) {
  const lines = text.split('\n');
  const items = [];
  let merchant = 'Unknown Merchant';
  let total = 0;
  let date = new Date().toISOString().split('T')[0];
  let isGasMeter = false;

  const nonEmptyLines = lines.map(l => l.trim()).filter(l => l.length > 0);
  if (nonEmptyLines.length > 0) {
    merchant = nonEmptyLines[0];
  }

  const lowerText = text.toLowerCase();
  if (lowerText.includes('gallon') || lowerText.includes('gal ') || lowerText.includes('price/gal') || lowerText.includes('$/gal') || lowerText.includes('octane') || lowerText.includes('pump #')) {
    isGasMeter = true;
    merchant = merchant.toLowerCase().includes('unknown') ? 'Gas Station Fuel' : merchant;
  }

  const priceRegex = /(?:\$?\s*(\d+\.\d{2}))/;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const lowerLine = trimmed.toLowerCase();
    if (lowerLine.includes('total') || lowerLine.includes('subtotal') || lowerLine.includes('amount due') || lowerLine.includes('balance')) {
      const match = trimmed.match(priceRegex);
      if (match && match[1]) {
        const val = parseFloat(match[1]);
        if (val > total) total = val;
      }
      continue;
    }

    const matches = trimmed.match(/(.+?)(?:\s+)(\d+\.\d{2})\b/);
    if (matches && matches[1] && matches[2]) {
      const name = matches[1].trim();
      const amount = parseFloat(matches[2]);
      
      if (name.length > 2 && !name.toLowerCase().includes('tax') && !name.toLowerCase().includes('cash') && !name.toLowerCase().includes('change')) {
        items.push({
          name: name,
          amount: amount,
          category: categorizeItem(name)
        });
      }
    }
  }

  if (items.length === 0) {
    if (total === 0) {
      const allPrices = text.match(/\b\d+\.\d{2}\b/g);
      if (allPrices) {
        const numbers = allPrices.map(parseFloat);
        total = Math.max(...numbers);
      }
    }
    
    if (total === 0) total = 10.00;

    items.push({
      name: isGasMeter ? 'Fuel Capture' : 'General Purchase',
      amount: total,
      category: isGasMeter ? 'fuel' : 'other'
    });
  }

  return {
    merchant: merchant,
    date: date,
    isGasMeter: isGasMeter,
    items: items
  };
}

// 6. Google Gemini 1.5 Flash Multimodal API Integrator
// Reads base64 receipts or gas meters and extracts full structured data client-side.
export async function parseWithGemini(base64Image, mimeType, apiKey) {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const prompt = `You are a receipt scanning engine for a personal mobile expense app.
Analyze this photo which is either a shopping receipt or a gas pump station meter screen.
Extract:
1. The merchant name (e.g. "Walmart", "Chevron").
2. The transaction date in YYYY-MM-DD format (use today's date if not visible).
3. Whether this is a gas station pump display screen (isGasMeter: true/false).
4. A highly detailed list of items.
   - For a gas meter screen, extract one item describing the fuel cost (e.g., "Regular Fuel 12.5 Gal") and categorize as "fuel".
   - For receipts, extract EACH line item, cleaning up bad OCR text into human readable grocery names (e.g. "ORG TMT" -> "Organic Tomatoes").
   - Categorize each item EXACTLY into one of these 14 categories: "vegetables", "fruits", "dairy", "meat", "bakery", "rent", "utilities", "fuel", "dining", "fitness", "education", "shopping", "entertainment", "other".
   Be extremely smart and detailed:
   - Green Groceries (cucumbers, spinach, tomatoes, potatoes, onions) go strictly into "vegetables".
   - Sweet/Citrus fruit items (apples, bananas, oranges, berries, grapes) go strictly into "fruits".
   - Milk, cheese, yogurt, eggs go strictly into "dairy".
   - Chicken, salmon, beef, fish go strictly into "meat".
   - Grains, wheat, flour, bread, rice, oil, sauces go strictly into "bakery".
   - Rent, mortgage payments, housing association fees go strictly into "rent".
   - Gym memberships, sports clubs, yoga fees, workout charges go strictly into "fitness".
   - School tuition, tuition fees, college courses, study books go strictly into "education".
   - Electricity, power, gas utility, water bills, wifi internet go strictly into "utilities".
   - Fuel pump station purchases go strictly into "fuel".
   - Restaurants, coffee shops, cafe checkouts go strictly into "dining".
   - Hygiene items (shampoo, soap, toothpaste), clothes, apparel go strictly into "shopping".
   - Netflix, cinema, gaming subscriptions go strictly into "entertainment".

Return EXACTLY a JSON block with no markdown formatting around it, matching this format:
{
  "merchant": "Walmart",
  "date": "2026-05-24",
  "isGasMeter": false,
  "items": [
    { "name": "Organic Roma Tomatoes", "amount": 3.49, "category": "vegetables" },
    { "name": "Fresh Gala Apples", "amount": 4.99, "category": "fruits" },
    { "name": "Whole Milk 1G", "amount": 3.89, "category": "dairy" }
  ]
}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Image
                }
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Gemini API failed');
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    return JSON.parse(resultText.trim());
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw error;
  }
}

// 7. Google Gemini AI Vision Pantry Scanner
// Analyzes images of an open fridge or container dry grains and extracts inventory details
export async function scanPantryWithGemini(base64Image, mimeType, apiKey, scanType) {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
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

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Image
                }
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Gemini API failed');
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    return JSON.parse(resultText.trim());
  } catch (error) {
    console.error('Gemini Pantry API Error:', error);
    throw error;
  }
}
