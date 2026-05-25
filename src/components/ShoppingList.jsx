import React, { useState, useRef, useEffect } from 'react';
import { CATEGORIES } from '../utils/parser';
import {
  ShoppingBag, Plus, Edit2, CheckCircle, Circle, Trash2,
  Copy, Send, Camera, X, Check, Search, ArrowLeft, Image,
} from 'lucide-react';
import confetti from 'canvas-confetti';

// ── Per-item emoji map (unique icon for every catalog item) ───────────────────
const ITEM_ICONS = {
  // Vegetables
  asparagus:'🌿', broccoli:'🥦', cabbage:'🥬', carrots:'🥕',
  cauliflower:'🫛', celery:'🌿', corn:'🌽', cucumber:'🥒',
  eggplant:'🍆', garlic:'🧄', 'green beans':'🫘', 'green onions':'🧅',
  'jalapeños':'🌶️', kale:'🥬', lettuce:'🥬', mushrooms:'🍄',
  okra:'🌿', onions:'🧅', peas:'🫛', peppers:'🫑',
  potatoes:'🥔', spinach:'🥬', 'sweet potatoes':'🍠', tomatoes:'🍅',
  zucchini:'🥒',
  // Fruits
  apples:'🍎', avocado:'🥑', bananas:'🍌', blueberries:'🫐',
  cantaloupe:'🍈', cherries:'🍒', coconut:'🥥', grapes:'🍇',
  kiwi:'🥝', lemons:'🍋', limes:'🍋', mangoes:'🥭',
  oranges:'🍊', peaches:'🍑', pears:'🍐', pineapple:'🍍',
  plums:'🍑', pomegranate:'🍎', raspberries:'🍓', strawberries:'🍓',
  watermelon:'🍉',
  // Dairy
  butter:'🧈', 'cheddar cheese':'🧀', 'cottage cheese':'🥛',
  'cream cheese':'🧀', eggs:'🥚', 'feta cheese':'🧀',
  'greek yogurt':'🫙', 'heavy cream':'🥛', 'milk 1 gallon':'🥛',
  'mozzarella cheese':'🧀', parmesan:'🧀', ricotta:'🧀',
  'shredded cheese':'🧀', 'sour cream':'🥛', 'whipped cream':'🍦',
  yogurt:'🫙',
  // Meat
  bacon:'🥓', 'beef steak':'🥩', 'chicken breast':'🍗',
  'chicken thighs':'🍗', 'chicken wings':'🍗', crab:'🦀',
  'ground beef':'🥩', 'ground turkey':'🦃', 'halal chicken':'🍗',
  'hot dogs':'🌭', 'lamb chops':'🥩', lobster:'🦞',
  'pork chops':'🥩', 'salmon fillet':'🐟', sausage:'🌭',
  shrimp:'🍤', tilapia:'🐟', tuna:'🐟', 'turkey breast':'🦃',
  // Bakery & Pantry
  'all-purpose flour':'🌾', 'atta flour 20lb':'🌾', 'basmati rice':'🍚',
  'black beans':'🫘', bread:'🍞', 'brown sugar':'🍬',
  'canola oil gallon':'🫙', 'canned tomatoes':'🥫', cereal:'🥣',
  chickpeas:'🫘', 'coffee beans':'☕', crackers:'🍘',
  honey:'🍯', jam:'🫙', lentils:'🫘', 'lipton tea bags':'🍵',
  oats:'🌾', 'olive oil':'🫙', pasta:'🍝', 'peanut butter':'🥜',
  'rice bag':'🍚', salt:'🧂', 'soy sauce':'🫙', spaghetti:'🍝',
  sugar:'🍬', 'tomato sauce':'🥫', tortillas:'🫓', vinegar:'🫙',
  'white rice':'🍚', 'whole wheat bread':'🍞',
  // Shopping & Personal
  'aluminum foil':'🫙', bleach:'🧴', 'body wash':'🚿',
  conditioner:'🧴', deodorant:'🧴', 'dish soap':'🧼',
  'fabric softener':'🧺', 'hand soap':'🧼', 'laundry detergent':'🧺',
  'lays chips':'🥔', 'mineral water case':'💧', 'paper towels':'🧻',
  'plastic wrap':'📦', 'sandwich bags':'🛍️', shampoo:'🧴',
  'soda cans 12-pack':'🥤', 'soap bar':'🧼', toothbrush:'🪥',
  toothpaste:'🪥', 'toilet paper 24-pack':'🧻', 'trash bags':'🗑️',
  // Café & Dining
  'coffee creamer':'☕', 'espresso pods':'☕', 'herbal tea':'🍵',
  'instant noodles':'🍜', 'protein shake':'💪', 'red bull':'🥤',
  'sparkling water':'💧',
  // Other
  batteries:'🔋', candles:'🕯️', 'dog food':'🐕',
  'cat food':'🐱', 'first aid kit':'🩹', vitamins:'💊',
  'zip lock bags':'🛍️',
};

const getItemIcon = (name, catKey) =>
  ITEM_ICONS[name.toLowerCase()] || CATEGORIES[catKey]?.icon || '📦';

// Compress an image File to a small square data-URL for localStorage
const compressPhoto = (file, cb) => {
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const MAX = 200;
      const scale = Math.min(MAX / img.width, MAX / img.height, 1);
      const c = document.createElement('canvas');
      c.width  = Math.round(img.width  * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      cb(c.toDataURL('image/jpeg', 0.72));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
};

// ── Catalog ───────────────────────────────────────────────────────────────────
const CATALOG = {
  vegetables: [
    'Asparagus','Broccoli','Cabbage','Carrots','Cauliflower','Celery',
    'Corn','Cucumber','Eggplant','Garlic','Green Beans','Green Onions',
    'Jalapeños','Kale','Lettuce','Mushrooms','Okra','Onions',
    'Peas','Peppers','Potatoes','Spinach','Sweet Potatoes','Tomatoes','Zucchini',
  ],
  fruits: [
    'Apples','Avocado','Bananas','Blueberries','Cantaloupe','Cherries',
    'Coconut','Grapes','Kiwi','Lemons','Limes','Mangoes',
    'Oranges','Peaches','Pears','Pineapple','Plums','Pomegranate',
    'Raspberries','Strawberries','Watermelon',
  ],
  dairy: [
    'Butter','Cheddar Cheese','Cottage Cheese','Cream Cheese','Eggs',
    'Feta Cheese','Greek Yogurt','Heavy Cream','Milk 1 Gallon',
    'Mozzarella Cheese','Parmesan','Ricotta','Shredded Cheese',
    'Sour Cream','Whipped Cream','Yogurt',
  ],
  meat: [
    'Bacon','Beef Steak','Chicken Breast','Chicken Thighs','Chicken Wings',
    'Crab','Ground Beef','Ground Turkey','Halal Chicken','Hot Dogs',
    'Lamb Chops','Lobster','Pork Chops','Salmon Fillet','Sausage',
    'Shrimp','Tilapia','Tuna','Turkey Breast',
  ],
  bakery: [
    'All-Purpose Flour','Atta Flour 20lb','Basmati Rice','Black Beans',
    'Bread','Brown Sugar','Canola Oil Gallon','Canned Tomatoes',
    'Cereal','Chickpeas','Coffee Beans','Crackers','Honey',
    'Jam','Lentils','Lipton Tea Bags','Oats','Olive Oil',
    'Pasta','Peanut Butter','Rice Bag','Salt','Soy Sauce',
    'Spaghetti','Sugar','Tomato Sauce','Tortillas','Vinegar',
    'White Rice','Whole Wheat Bread',
  ],
  shopping: [
    'Aluminum Foil','Bleach','Body Wash','Conditioner',
    'Deodorant','Dish Soap','Fabric Softener','Hand Soap',
    'Laundry Detergent','Lays Chips','Mineral Water Case',
    'Paper Towels','Plastic Wrap','Sandwich Bags','Shampoo',
    'Soda Cans 12-pack','Soap Bar','Toothbrush','Toothpaste',
    'Toilet Paper 24-pack','Trash Bags',
  ],
  dining: [
    'Coffee Creamer','Espresso Pods','Herbal Tea','Instant Noodles',
    'Protein Shake','Red Bull','Sparkling Water',
  ],
  other: [
    'Batteries','Candles','Dog Food','Cat Food','First Aid Kit','Vitamins','Zip Lock Bags',
  ],
};

const STORE_EMOJIS = {
  walmart:'🛒', costco:'📦', lotte:'🏮',
  halal:'🥩', 'home depot':'🏗️', restaurant:'🍽️',
};
const storeEmoji = (name = '') => {
  const l = name.toLowerCase();
  for (const [k, v] of Object.entries(STORE_EMOJIS)) if (l.includes(k)) return v;
  return '🏪';
};

const DEFAULT_STORE = {
  vegetables:'Lotte', fruits:'Lotte', dairy:'Walmart',
  meat:'Halal Store', bakery:'Restaurant Depot', shopping:'Walmart',
  dining:'Walmart', other:'Walmart',
};

// ── Reusable photo picker button ──────────────────────────────────────────────
function PhotoPicker({ photo, onPhoto, label = 'Add Photo' }) {
  const ref = useRef(null);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      {photo ? (
        <img
          src={photo} alt="item"
          style={{ width: 64, height: 64, borderRadius: 14, objectFit: 'cover', border: '2px solid rgba(99,102,241,0.4)', flexShrink: 0 }}
        />
      ) : (
        <div style={{
          width: 64, height: 64, borderRadius: 14, flexShrink: 0,
          border: '2px dashed rgba(255,255,255,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(255,255,255,0.03)',
        }}>
          <Image size={22} style={{ color: '#475569' }} />
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="outline-btn"
          style={{ fontSize: '0.78rem', padding: '9px 14px', justifyContent: 'flex-start' }}>
          <Camera size={14} /> {photo ? 'Change photo' : label}
        </button>
        {photo && (
          <button
            type="button"
            onClick={() => onPhoto(null)}
            style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', textAlign: 'left', padding: '0 2px' }}>
            Remove photo
          </button>
        )}
      </div>
      <input
        ref={ref} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => {
          const f = e.target.files?.[0];
          if (!f) return;
          compressPhoto(f, onPhoto);
          e.target.value = '';
        }}
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ShoppingList({
  listItems, onAddItem, onToggleItem, onDeleteItem, onUpdateItem,
  onClearCheckedItems,
  customStores, onAddCustomStore, customSuggestions, showToast,
}) {
  const [mode,      setMode]      = useState('planning');
  const [showBought,setShowBought]= useState(false);
  const [homeSearch,setHomeSearch]= useState('');

  const [showCatalog,    setShowCatalog]    = useState(false);
  const [catalogSection, setCatalogSection] = useState(null);
  const [catalogSearch,  setCatalogSearch]  = useState('');

  const [customName,     setCustomName]     = useState('');
  const [customStore,    setCustomStore]    = useState('Walmart');
  const [customCategory, setCustomCategory] = useState('other');
  const [customPhoto,    setCustomPhoto]    = useState(null);
  const [showCustomForm, setShowCustomForm] = useState(false);

  const [editIdx,           setEditIdx]           = useState(null);
  const [editName,          setEditName]          = useState('');
  const [editStore,         setEditStore]         = useState('');
  const [editCat,           setEditCat]           = useState('');
  const [editPhoto,         setEditPhoto]         = useState(null);
  // Full-screen catalog picker for correcting a scanned item's name
  const [showScanPicker,    setShowScanPicker]    = useState(false);
  const [scanPickerSection, setScanPickerSection] = useState(null);
  const [scanPickerSearch,  setScanPickerSearch]  = useState('');

  const [showScanner,  setShowScanner]  = useState(false);
  const [streamActive, setStreamActive] = useState(false);
  const [scanning,     setScanning]     = useState(false);
  const [cameraError,  setCameraError]  = useState(false);

  const videoRef          = useRef(null);
  const canvasRef         = useRef(null);
  const fileInputRef      = useRef(null);
  const letterRefs        = useRef({});
  const catalogHistoryRef = useRef(false);

  const safe = (Array.isArray(listItems) ? listItems : []).filter(i => i && typeof i.name === 'string');
  const defaultStores = ['Walmart','Costco','Lotte','Halal Store','Home Depot','Restaurant Depot'];
  const allStores = Array.from(new Set([...defaultStores, ...(customStores || [])]));

  const filtered  = homeSearch.trim() ? safe.filter(i => i.name.toLowerCase().includes(homeSearch.toLowerCase())) : safe;
  const unchecked = filtered.filter(i => !i.checked);
  const checked   = filtered.filter(i => i.checked);

  // Celebrate when all bought
  useEffect(() => {
    if (mode === 'shopping' && safe.length > 0 && safe.every(i => i.checked)) {
      try { confetti({ particleCount: 140, spread: 90, origin: { y: 0.55 }, colors: ['#6366f1','#10b981','#fbbf24'] }); } catch (_) {}
    }
  }, [mode, listItems]);

  // History API — phone back button closes catalog
  const openCatalog = () => {
    setShowCatalog(true); setCatalogSection(null); setCatalogSearch('');
    try { window.history.pushState({ ssDrawer: 'catalog' }, ''); catalogHistoryRef.current = true; } catch (_) {}
  };
  const closeCatalog = (fromPop = false) => {
    setShowCatalog(false); setShowCustomForm(false); setCustomName(''); setCustomPhoto(null);
    if (!fromPop && catalogHistoryRef.current) { catalogHistoryRef.current = false; try { window.history.back(); } catch (_) {} }
  };
  useEffect(() => {
    const handlePop = () => {
      setShowCatalog(prev => {
        if (prev) { catalogHistoryRef.current = false; setShowCustomForm(false); setCustomName(''); setCustomPhoto(null); return false; }
        return prev;
      });
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  // Catalog items
  const getCatalogItems = () => {
    const q = catalogSearch.trim().toLowerCase();
    if (q) {
      const results = [];
      Object.entries(CATALOG).forEach(([cat, names]) => {
        names.forEach(name => { if (name.toLowerCase().includes(q)) results.push({ name, cat }); });
      });
      (customSuggestions || []).forEach(s => {
        if (s?.name?.toLowerCase().includes(q)) results.push({ name: s.name, cat: s.category || 'other', store: s.store });
      });
      return results.sort((a, b) => a.name.localeCompare(b.name));
    }
    if (!catalogSection) return [];
    const names = [...(CATALOG[catalogSection] || [])];
    (customSuggestions || []).forEach(s => {
      if (s?.category === catalogSection && s?.name && !names.includes(s.name)) names.push(s.name);
    });
    return names.sort().map(name => ({ name, cat: catalogSection }));
  };

  const catalogItems = getCatalogItems();
  const byLetter = {};
  catalogItems.forEach(item => {
    const l = item.name[0]?.toUpperCase() || '#';
    if (!byLetter[l]) byLetter[l] = [];
    byLetter[l].push(item);
  });
  const letters = Object.keys(byLetter).sort();

  const addCatalogItem = (item) => {
    const alreadyIn = safe.some(i => i.name.toLowerCase() === item.name.toLowerCase() && !i.checked);
    if (alreadyIn) { showToast?.('Already in your list', 'info'); return; }
    const store = item.store || DEFAULT_STORE[item.cat] || 'Walmart';
    onAddItem({ name: item.name, checked: false, store, category: item.cat, photo: null });
    showToast?.(`"${item.name}" added ✓`);
    try { confetti({ particleCount: 18, spread: 28, origin: { y: 0.8 }, colors: ['#6366f1','#10b981'] }); } catch (_) {}
  };

  const addCustomItem = () => {
    if (!customName.trim()) return;
    onAddItem({ name: customName.trim(), checked: false, store: customStore, category: customCategory, photo: customPhoto || null });
    showToast?.(`"${customName.trim()}" added ✓`);
    setCustomName(''); setCustomPhoto(null); setShowCustomForm(false);
    try { confetti({ particleCount: 18, spread: 28, origin: { y: 0.8 }, colors: ['#6366f1','#10b981'] }); } catch (_) {}
  };

  const openEdit = (idx) => {
    const item = safe[idx];
    if (!item) return;
    setEditIdx(idx); setEditName(item.name);
    setEditStore(item.store || 'Walmart'); setEditCat(item.category || 'other');
    setEditPhoto(item.photo || null);
  };
  const saveEdit = () => {
    if (!editName.trim()) return;
    onUpdateItem(editIdx, { name: editName.trim(), store: editStore, category: editCat, photo: editPhoto });
    showToast?.('Item updated ✓'); setEditIdx(null);
  };

  const shareLink = () => {
    if (!safe.length) return '';
    const enc = safe.map(i => `${i.name.replace(/[:|,]/g,' ')}:${i.category||'other'}:${i.store||'Walmart'}`);
    return `${window.location.origin}${window.location.pathname}?importList=${encodeURIComponent(enc.join(','))}`;
  };
  const shareWhatsApp = () => {
    const link = shareLink();
    if (!link) { showToast?.('Add items first','error'); return; }
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent('Hi! Here is our grocery list — open in SmartSpend: '+link)}`, '_blank');
  };
  const copyLink = () => {
    const link = shareLink();
    if (!link) { showToast?.('Add items first','error'); return; }
    navigator.clipboard.writeText(link).then(() => showToast?.('Link copied!')).catch(() => showToast?.('Could not copy','error'));
  };

  const startCamera = async () => {
    try {
      setCameraError(false);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode:'environment' }, audio: false })
        .catch(() => navigator.mediaDevices.getUserMedia({ video: true, audio: false }));
      if (videoRef.current) { videoRef.current.srcObject = stream; setStreamActive(true); }
    } catch { setCameraError(true); }
  };
  const stopCamera = () => { videoRef.current?.srcObject?.getTracks().forEach(t => t.stop()); setStreamActive(false); };
  useEffect(() => { if (showScanner) startCamera(); else stopCamera(); return stopCamera; }, [showScanner]);

  const processImage = async (base64) => {
    stopCamera(); setScanning(true);
    try {
      const r = await fetch('/api/gemini', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64Image: base64, mimeType: 'image/jpeg', prompt: `Identify the main grocery or household item. Return EXACTLY a JSON object (no markdown): {"name":"item name","category":"vegetables/fruits/dairy/meat/bakery/shopping/dining/other","store":"Walmart/Costco/Lotte/Halal Store/Home Depot/Restaurant Depot"}` })
      });
      const res = await r.json();
      setEditIdx('scanned'); setEditName(res.name||'Scanned Item'); setEditStore(res.store||'Walmart'); setEditCat(res.category||'other'); setEditPhoto(null);
    } catch { setEditIdx('scanned'); setEditName('Scanned Item'); setEditStore('Walmart'); setEditCat('other'); setEditPhoto(null); }
    finally { setScanning(false); setShowScanner(false); }
  };

  const scrollToLetter = (l) => letterRefs.current[l]?.scrollIntoView({ behavior:'smooth', block:'start' });

  // Items shown inside the scan picker overlay
  const getScanPickerItems = () => {
    const q = scanPickerSearch.trim().toLowerCase();
    if (q) {
      const results = [];
      Object.entries(CATALOG).forEach(([cat, names]) => {
        names.forEach(name => { if (name.toLowerCase().includes(q)) results.push({ name, cat }); });
      });
      return results.sort((a, b) => a.name.localeCompare(b.name));
    }
    if (!scanPickerSection || scanPickerSection === '__search__') return [];
    return [...(CATALOG[scanPickerSection] || [])].sort().map(name => ({ name, cat: scanPickerSection }));
  };

  // Assign a catalog item to the currently-scanned item being confirmed
  const assignScannedItem = (item) => {
    setEditName(item.name);
    setEditCat(item.cat);
    setEditStore(item.store || DEFAULT_STORE[item.cat] || 'Walmart');
    setShowScanPicker(false); setScanPickerSection(null); setScanPickerSearch('');
    showToast?.(`Assigned "${item.name}" ✓`);
  };

  const closeScanPicker = () => { setShowScanPicker(false); setScanPickerSection(null); setScanPickerSearch(''); };

  // Close edit modal
  const closeEdit = () => { setEditIdx(null); closeScanPicker(); };

  const toggleStyle = (active) => ({
    flex: 1, padding: '10px', borderRadius: '12px', border: 'none',
    background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
    color: active ? '#fff' : '#64748b', fontWeight: 700, fontSize: '0.82rem',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.18s',
  });

  // ── Planning mode item row ────────────────────────────────────────────────
  const ItemRow = ({ item, idx }) => (
    <div onClick={() => onToggleItem(idx)} style={{
      display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
      background: item.checked ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.05)', borderRadius: '14px',
      cursor: 'pointer', opacity: item.checked ? 0.45 : 1, transition: 'opacity 0.2s',
    }}>
      {/* Photo thumbnail OR check state */}
      {item.photo ? (
        <img src={item.photo} alt={item.name}
          style={{ width: 38, height: 38, borderRadius: 10, objectFit: 'cover', flexShrink: 0, border: item.checked ? '2px solid #10b981' : '2px solid rgba(255,255,255,0.1)' }} />
      ) : (
        item.checked
          ? <CheckCircle size={20} style={{ color: '#10b981', flexShrink: 0 }} />
          : <Circle      size={20} style={{ color: '#475569', flexShrink: 0 }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.88rem', fontWeight: 700, textDecoration: item.checked ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.name}
        </div>
        <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '2px' }}>
          {storeEmoji(item.store||'')} {item.store||'Walmart'} &nbsp;·&nbsp; {CATEGORIES[item.category||'other']?.icon} {CATEGORIES[item.category||'other']?.label}
        </div>
      </div>
      <button onClick={e => { e.stopPropagation(); openEdit(idx); }}
        style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: '8px', minWidth: '36px', minHeight: '36px' }}>
        <Edit2 size={14} />
      </button>
      <button onClick={e => { e.stopPropagation(); onDeleteItem(idx); }}
        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '8px', minWidth: '36px', minHeight: '36px' }}>
        <Trash2 size={14} />
      </button>
    </div>
  );

  const boughtCount   = safe.filter(i => i.checked).length;
  const allDone       = safe.length > 0 && boughtCount === safe.length;
  const shoppingItems = (showBought ? safe : unchecked).filter(i =>
    homeSearch.trim() ? i.name.toLowerCase().includes(homeSearch.toLowerCase()) : true
  );

  // Sticky header style for catalog drawer (avoids overflow:hidden iOS scroll bug)
  const stickyTop = {
    position: 'sticky', top: 0, zIndex: 5, background: 'var(--bg-dark)',
    paddingBottom: '12px', marginBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.06)',
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '80px' }}>

      {/* Mode toggle */}
      <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)', gap: '4px' }}>
        <button style={toggleStyle(mode === 'planning')} onClick={() => setMode('planning')}>✏️ Planning</button>
        <button style={toggleStyle(mode === 'shopping')} onClick={() => setMode('shopping')}>🛒 Shopping</button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative' }}>
        <Search size={15} style={{ position:'absolute', left:'13px', top:'50%', transform:'translateY(-50%)', color:'#64748b', pointerEvents:'none' }} />
        <input type="text" placeholder="Search your list..." value={homeSearch}
          onChange={e => setHomeSearch(e.target.value)} className="input-element"
          style={{ paddingLeft:'38px', paddingRight: homeSearch ? '36px' : '14px' }} />
        {homeSearch && (
          <button onClick={() => setHomeSearch('')}
            style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#64748b', cursor:'pointer', padding:'8px' }}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* ══ PLANNING MODE ════════════════════════════════════════════════════ */}
      {mode === 'planning' && (
        <>
          {safe.length === 0 ? (
            <div className="glass-card" style={{ textAlign:'center', padding:'52px 20px' }}>
              <ShoppingBag size={44} style={{ margin:'0 auto 16px', opacity:0.15, display:'block' }} />
              <p style={{ fontWeight:800, fontSize:'1rem', color:'#94a3b8', marginBottom:'6px' }}>Your checklist is empty</p>
              <p style={{ fontSize:'0.78rem', color:'#64748b' }}>Tap <strong>Add Items</strong> below to browse groceries</p>
            </div>
          ) : (
            <>
              {unchecked.length > 0 && (
                <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                  <div style={{ fontSize:'0.68rem', fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.06em', paddingLeft:'2px' }}>
                    To buy · {unchecked.length}
                  </div>
                  {unchecked.map(item => <ItemRow key={safe.indexOf(item)} item={item} idx={safe.indexOf(item)} />)}
                </div>
              )}
              {checked.length > 0 && (
                <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingLeft:'2px' }}>
                    <span style={{ fontSize:'0.68rem', fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.06em' }}>Done · {checked.length}</span>
                    <button onClick={() => { onClearCheckedItems?.(); showToast?.('Cleared done items'); }}
                      style={{ background:'none', border:'none', color:'#ef4444', fontSize:'0.7rem', fontWeight:700, cursor:'pointer', padding:'8px' }}>
                      Clear all
                    </button>
                  </div>
                  {checked.map(item => <ItemRow key={safe.indexOf(item)} item={item} idx={safe.indexOf(item)} />)}
                </div>
              )}
              <div style={{ display:'flex', gap:'10px', marginTop:'4px' }}>
                <button onClick={shareWhatsApp} className="solid-btn" style={{ flex:1, background:'linear-gradient(135deg,#22c55e,#16a34a)' }}>
                  <Send size={15} /> WhatsApp
                </button>
                <button onClick={copyLink} className="outline-btn" style={{ flex:1 }}>
                  <Copy size={15} /> Copy Link
                </button>
              </div>
            </>
          )}
          <button onClick={openCatalog} className="solid-btn"
            style={{ position:'sticky', bottom:'12px', borderRadius:'18px', padding:'15px', fontSize:'0.95rem', fontWeight:800, boxShadow:'0 6px 28px rgba(99,102,241,0.4)', zIndex:10 }}>
            <Plus size={20} /> Add Items
          </button>
        </>
      )}

      {/* ══ SHOPPING MODE ════════════════════════════════════════════════════ */}
      {mode === 'shopping' && (
        <>
          {/* Summary card */}
          <div style={{ background:'linear-gradient(135deg,#0d1f2d,#0f172a)', border:`1px solid ${allDone ? 'rgba(16,185,129,0.45)' : 'rgba(99,102,241,0.3)'}`, borderRadius:'20px', padding:'20px', transition:'border-color 0.4s' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <div style={{ fontSize:'0.68rem', fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:'5px' }}>Shopping Mode</div>
                <div style={{ fontFamily:'var(--font-title)', fontSize:'1.7rem', fontWeight:800, color:'#fff', lineHeight:1.1 }}>
                  {allDone ? '🎉 All Done!' : `${unchecked.length} left`}
                </div>
                <div style={{ fontSize:'0.72rem', color:'#64748b', marginTop:'5px' }}>
                  {allDone ? 'Great shopping trip! 🏆' : 'Tap Bought when you pick up each item'}
                </div>
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ fontFamily:'var(--font-title)', fontSize:'2rem', fontWeight:900, color: allDone ? '#10b981' : '#a5b4fc', lineHeight:1 }}>
                  {boughtCount}/{safe.length}
                </div>
                <div style={{ fontSize:'0.62rem', color:'#64748b', marginTop:'2px' }}>bought</div>
              </div>
            </div>
            {safe.length > 0 && (
              <div style={{ marginTop:'14px', height:'7px', background:'rgba(255,255,255,0.07)', borderRadius:'99px', overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${(boughtCount/safe.length)*100}%`, background: allDone ? 'linear-gradient(90deg,#059669,#10b981)' : 'linear-gradient(90deg,#4f46e5,#6366f1)', borderRadius:'99px', transition:'width 0.4s ease,background 0.4s ease' }} />
              </div>
            )}
          </div>

          {boughtCount > 0 && !allDone && (
            <button onClick={() => setShowBought(v => !v)}
              style={{ background:'none', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'12px', padding:'10px 14px', color:'#64748b', fontSize:'0.78rem', fontWeight:700, cursor:'pointer', textAlign:'left' }}>
              {showBought ? '▼ Hide bought items' : '▶ Show bought items'} ({boughtCount})
            </button>
          )}

          {safe.length === 0 && (
            <div className="glass-card" style={{ textAlign:'center', padding:'40px 20px' }}>
              <ShoppingBag size={36} style={{ margin:'0 auto 12px', opacity:0.15, display:'block' }} />
              <p style={{ fontSize:'0.85rem', color:'#64748b', lineHeight:1.6 }}>
                Your list is empty.<br />Switch to <strong>Planning</strong> to add items first.
              </p>
            </div>
          )}

          {shoppingItems.length > 0 && (
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              {shoppingItems.map(item => {
                const idx = safe.indexOf(item);
                return (
                  <div key={idx} style={{
                    display:'flex', alignItems:'center', gap:'12px', padding:'12px 14px',
                    background: item.checked ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.03)',
                    border:`1px solid ${item.checked ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)'}`,
                    borderRadius:'18px', transition:'all 0.2s', opacity: item.checked ? 0.65 : 1,
                  }}>
                    {/* Photo at shopping view — bigger so you can see it easily at store */}
                    {item.photo ? (
                      <img src={item.photo} alt={item.name}
                        style={{ width:56, height:56, borderRadius:12, objectFit:'cover', flexShrink:0, border:'2px solid rgba(255,255,255,0.12)' }} />
                    ) : (
                      <div style={{ width:46, height:46, borderRadius:12, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.5rem', flexShrink:0 }}>
                        {getItemIcon(item.name, item.category || 'other')}
                      </div>
                    )}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:'0.92rem', fontWeight:700, textDecoration: item.checked ? 'line-through' : 'none', color:'#e2e8f0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize:'0.66rem', color:'#64748b', marginTop:'3px' }}>
                        {storeEmoji(item.store||'')} {item.store||'Walmart'}
                      </div>
                    </div>
                    <button onClick={() => onToggleItem(idx)}
                      style={{ padding:'12px 16px', borderRadius:'14px', border:'none', cursor:'pointer', fontWeight:800, fontSize:'0.8rem', flexShrink:0, minHeight:'44px', background: item.checked ? 'rgba(16,185,129,0.18)' : '#6366f1', color: item.checked ? '#10b981' : '#fff', transition:'all 0.2s' }}>
                      {item.checked ? '✓ Bought' : 'Bought'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {safe.length > 0 && (
            <button onClick={() => setMode('planning')}
              style={{ background:'none', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'14px', padding:'13px', color:'#64748b', fontSize:'0.78rem', fontWeight:700, cursor:'pointer', textAlign:'center' }}>
              + Add more items (switch to Planning)
            </button>
          )}
        </>
      )}

      {/* ══ CATALOG SHEET ════════════════════════════════════════════════════ */}
      {showCatalog && (
        <div className="drawer-overlay" onClick={() => closeCatalog()}>
          <div className="drawer-sheet" style={{ maxHeight:'92vh' }} onClick={e => e.stopPropagation()}>

            {/* Sticky top: drag + header + search — never scrolls away */}
            <div style={stickyTop}>
              <div className="drawer-drag-handle" style={{ marginTop:0 }} />
              <div className="drawer-header" style={{ marginBottom:'16px' }}>
                {catalogSection ? (
                  <button onClick={() => { setCatalogSection(null); setCatalogSearch(''); }}
                    style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'10px', padding:'8px 12px', cursor:'pointer', color:'#fff', display:'flex', alignItems:'center', gap:'6px', fontSize:'0.82rem', fontWeight:700, minHeight:'44px' }}>
                    <ArrowLeft size={16} /> Back
                  </button>
                ) : (
                  <h3 style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                    <ShoppingBag size={18} className="text-primary" /> Add Items
                  </h3>
                )}
                <button onClick={() => closeCatalog()}
                  style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'12px', color:'#94a3b8', cursor:'pointer', width:'44px', height:'44px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <X size={20} />
                </button>
              </div>
              <div style={{ position:'relative' }}>
                <Search size={15} style={{ position:'absolute', left:'13px', top:'50%', transform:'translateY(-50%)', color:'#64748b', pointerEvents:'none' }} />
                <input type="text" placeholder="Search any item..." value={catalogSearch}
                  onChange={e => {
                    setCatalogSearch(e.target.value);
                    if (e.target.value) setCatalogSection('__search__');
                    else if (catalogSection === '__search__') setCatalogSection(null);
                  }}
                  className="input-element" style={{ paddingLeft:'38px', paddingRight: catalogSearch ? '36px' : '14px' }} />
                {catalogSearch && (
                  <button onClick={() => { setCatalogSearch(''); setCatalogSection(null); }}
                    style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#64748b', cursor:'pointer', padding:'8px' }}>
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Section grid */}
            {!catalogSection && !catalogSearch && (
              <div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', paddingBottom:'8px' }}>
                  {Object.entries(CATEGORIES).filter(([key]) => CATALOG[key]?.length > 0).map(([key, cat]) => (
                    <button key={key} onClick={() => setCatalogSection(key)}
                      style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'18px', padding:'20px 14px', cursor:'pointer', textAlign:'left', display:'flex', flexDirection:'column', gap:'6px', minHeight:'90px', transition:'background 0.15s' }}>
                      <span style={{ fontSize:'2rem' }}>{cat.icon}</span>
                      <span style={{ fontSize:'0.88rem', fontWeight:800, color:'#e2e8f0' }}>{cat.label}</span>
                      <span style={{ fontSize:'0.66rem', color:'#64748b' }}>{CATALOG[key]?.length} items</span>
                    </button>
                  ))}
                </div>

                {/* Custom item form */}
                <div style={{ marginTop:'12px', padding:'14px', background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'14px' }}>
                  <div style={{ fontSize:'0.72rem', fontWeight:700, color:'#94a3b8', marginBottom:'10px' }}>CAN'T FIND IT? ADD MANUALLY</div>
                  {!showCustomForm ? (
                    <button onClick={() => setShowCustomForm(true)} className="outline-btn" style={{ width:'100%', justifyContent:'center' }}>
                      <Plus size={15} /> Type a custom item
                    </button>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                      <input type="text" placeholder="Item name..." value={customName} onChange={e => setCustomName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') addCustomItem(); }} className="input-element" autoFocus />

                      {/* Photo picker for custom item */}
                      <PhotoPicker photo={customPhoto} onPhoto={setCustomPhoto} label="Add photo (optional)" />

                      <div className="cat-chips-scroll">
                        {Object.entries(CATEGORIES).map(([key, val]) => (
                          <div key={key} onClick={() => setCustomCategory(key)} className={`cat-chip ${customCategory === key ? 'selected' : ''}`}
                            style={{ padding:'5px 10px', fontSize:'0.7rem', borderColor: customCategory === key ? val.color : 'rgba(255,255,255,0.08)', background: customCategory === key ? `${val.color}20` : 'rgba(255,255,255,0.03)' }}>
                            {val.icon} {val.label}
                          </div>
                        ))}
                      </div>
                      <div className="cat-chips-scroll">
                        {allStores.map(s => (
                          <div key={s} onClick={() => setCustomStore(s)} className={`cat-chip ${customStore === s ? 'selected' : ''}`}
                            style={{ padding:'5px 10px', fontSize:'0.7rem', borderColor: customStore === s ? '#6366f1' : 'rgba(255,255,255,0.08)', background: customStore === s ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)' }}>
                            {storeEmoji(s)} {s}
                          </div>
                        ))}
                      </div>
                      <div style={{ display:'flex', gap:'8px' }}>
                        <button onClick={addCustomItem} className="solid-btn" style={{ flex:1 }}><Plus size={16} /> Add</button>
                        <button onClick={() => { setShowCustomForm(false); setCustomName(''); setCustomPhoto(null); }} className="outline-btn" style={{ width:'auto', padding:'12px' }}><X size={16} /></button>
                      </div>
                    </div>
                  )}
                </div>

                <button onClick={() => { setShowScanner(true); closeCatalog(); }}
                  className="outline-btn" style={{ width:'100%', justifyContent:'center', marginTop:'10px', borderRadius:'14px' }}>
                  <Camera size={16} /> Scan item with camera
                </button>
                <button onClick={() => closeCatalog()} className="solid-btn"
                  style={{ width:'100%', marginTop:'14px', background:'rgba(255,255,255,0.06)', color:'#94a3b8', borderRadius:'16px', fontWeight:700, fontSize:'0.88rem' }}>
                  ✓ Done adding items
                </button>
                <div style={{ height:'8px' }} />
              </div>
            )}

            {/* Items list */}
            {(catalogSection || catalogSearch) && (
              <div>
                {catalogSection && catalogSection !== '__search__' && !catalogSearch && (
                  <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'10px' }}>
                    <span style={{ fontSize:'1.3rem' }}>{CATEGORIES[catalogSection]?.icon}</span>
                    <span style={{ fontFamily:'var(--font-title)', fontSize:'1rem', fontWeight:800 }}>{CATEGORIES[catalogSection]?.label}</span>
                    <span style={{ fontSize:'0.68rem', color:'#64748b', marginLeft:'auto' }}>{catalogItems.length} items</span>
                  </div>
                )}
                {letters.length > 1 && !catalogSearch && (
                  <div style={{ display:'flex', gap:'4px', flexWrap:'wrap', marginBottom:'10px', padding:'8px 10px', background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:'12px' }}>
                    <span style={{ fontSize:'0.62rem', fontWeight:700, color:'#64748b', alignSelf:'center', marginRight:'2px' }}>JUMP:</span>
                    {letters.map(l => (
                      <button key={l} onClick={() => scrollToLetter(l)}
                        style={{ background:'rgba(99,102,241,0.12)', border:'1px solid rgba(99,102,241,0.25)', borderRadius:'6px', padding:'3px 8px', fontSize:'0.72rem', fontWeight:800, color:'#a5b4fc', cursor:'pointer', minWidth:'26px', minHeight:'30px', textAlign:'center' }}>
                        {l}
                      </button>
                    ))}
                  </div>
                )}
                {catalogSearch && catalogItems.length === 0 && (
                  <div style={{ textAlign:'center', padding:'32px', color:'#64748b', fontSize:'0.82rem' }}>No items found for "{catalogSearch}"</div>
                )}
                <div style={{ display:'flex', flexDirection:'column', gap: catalogSearch ? '5px' : '0' }}>
                  {catalogSearch
                    ? catalogItems.map((item, i) => {
                        const inList = safe.some(s => s.name.toLowerCase() === item.name.toLowerCase() && !s.checked);
                        return <CatalogRow key={i} item={item} inList={inList} onAdd={addCatalogItem} />;
                      })
                    : letters.map(letter => (
                        <div key={letter}>
                          <div ref={el => { letterRefs.current[letter] = el; }}
                            style={{ fontSize:'0.7rem', fontWeight:800, color: CATEGORIES[catalogSection]?.color || '#6366f1', padding:'10px 2px 4px', letterSpacing:'0.1em', borderBottom:`1px solid ${CATEGORIES[catalogSection]?.color || '#6366f1'}25` }}>
                            {letter}
                          </div>
                          <div style={{ display:'flex', flexDirection:'column', gap:'4px', marginBottom:'4px' }}>
                            {byLetter[letter].map((item, i) => {
                              const inList = safe.some(s => s.name.toLowerCase() === item.name.toLowerCase() && !s.checked);
                              return <CatalogRow key={i} item={item} inList={inList} onAdd={addCatalogItem} />;
                            })}
                          </div>
                        </div>
                      ))
                  }
                </div>
                <button onClick={() => closeCatalog()} className="solid-btn"
                  style={{ width:'100%', marginTop:'20px', background:'rgba(255,255,255,0.06)', color:'#94a3b8', borderRadius:'16px', fontWeight:700, fontSize:'0.88rem' }}>
                  ✓ Done adding items
                </button>
                <div style={{ height:'16px' }} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── EDIT / SCAN-CONFIRM MODAL ────────────────────────────────────── */}
      {editIdx !== null && (
        <div className="drawer-overlay" onClick={closeEdit}>
          <div className="drawer-sheet" onClick={e => e.stopPropagation()}>
            <div className="drawer-drag-handle" />
            <div className="drawer-header">
              <h3>{editIdx === 'scanned' ? '🔍 Confirm Scanned Item' : '✏️ Edit Item'}</h3>
              <button onClick={closeEdit}
                style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'12px', color:'#94a3b8', cursor:'pointer', width:'44px', height:'44px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>

              {/* ── Name field ── */}
              <div className="input-group">
                <label>Item Name</label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key !== 'Enter') return;
                    if (editIdx === 'scanned') {
                      onAddItem({ name: editName.trim(), checked: false, store: editStore, category: editCat, photo: editPhoto });
                      showToast?.(`"${editName}" added ✓`);
                      closeEdit();
                    } else { saveEdit(); }
                  }}
                  className="input-element" autoFocus />
              </div>

              {/* ── "Pick from catalog" button — scan mode only ── */}
              {editIdx === 'scanned' && (
                <button type="button" onClick={() => setShowScanPicker(true)} className="outline-btn"
                  style={{ justifyContent:'flex-start', gap:'10px', borderColor:'rgba(99,102,241,0.35)', color:'#a5b4fc' }}>
                  <Search size={16} />
                  <span>Pick correct item from catalog</span>
                  <ArrowLeft size={14} style={{ marginLeft:'auto', transform:'rotate(180deg)', opacity:0.5 }} />
                </button>
              )}

              {/* ── Photo ── */}
              <div>
                <label style={{ fontSize:'0.7rem', fontWeight:700, color:'var(--slate-text)', display:'block', marginBottom:'8px' }}>PHOTO (helps identify at the store)</label>
                <PhotoPicker photo={editPhoto} onPhoto={setEditPhoto} label="Add photo" />
              </div>

              {/* ── Category ── */}
              <div>
                <label style={{ fontSize:'0.7rem', fontWeight:700, color:'var(--slate-text)', display:'block', marginBottom:'8px' }}>CATEGORY</label>
                <div className="cat-chips-scroll">
                  {Object.entries(CATEGORIES).map(([key, val]) => (
                    <div key={key} onClick={() => setEditCat(key)} className={`cat-chip ${editCat === key ? 'selected' : ''}`}
                      style={{ padding:'5px 10px', fontSize:'0.7rem', borderColor: editCat === key ? val.color : 'rgba(255,255,255,0.08)', background: editCat === key ? `${val.color}20` : 'rgba(255,255,255,0.03)' }}>
                      {val.icon} {val.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Store ── */}
              <div>
                <label style={{ fontSize:'0.7rem', fontWeight:700, color:'var(--slate-text)', display:'block', marginBottom:'8px' }}>STORE</label>
                <div className="cat-chips-scroll">
                  {allStores.map(s => (
                    <div key={s} onClick={() => setEditStore(s)} className={`cat-chip ${editStore === s ? 'selected' : ''}`}
                      style={{ padding:'5px 10px', fontSize:'0.7rem', borderColor: editStore === s ? '#6366f1' : 'rgba(255,255,255,0.08)', background: editStore === s ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)' }}>
                      {storeEmoji(s)} {s}
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Confirm / Save ── */}
              <button onClick={() => {
                if (editIdx === 'scanned') {
                  onAddItem({ name: editName.trim(), checked: false, store: editStore, category: editCat, photo: editPhoto });
                  showToast?.(`"${editName}" added ✓`);
                  try { confetti({ particleCount: 60, spread: 50, origin: { y: 0.85 }, colors: ['#6366f1','#10b981'] }); } catch (_) {}
                } else { saveEdit(); }
                closeEdit();
              }} className="solid-btn">
                <Check size={18} /> {editIdx === 'scanned' ? 'Confirm & Add' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SCAN ITEM PICKER — full-screen catalog to replace a wrong scanned name ── */}
      {showScanPicker && (
        <div className="drawer-overlay" style={{ zIndex: 200 }} onClick={closeScanPicker}>
          <div className="drawer-sheet" style={{ maxHeight:'92vh' }} onClick={e => e.stopPropagation()}>

            {/* Sticky header */}
            <div style={stickyTop}>
              <div className="drawer-drag-handle" style={{ marginTop:0 }} />
              <div className="drawer-header" style={{ marginBottom:'16px' }}>
                {scanPickerSection ? (
                  <button onClick={() => { setScanPickerSection(null); setScanPickerSearch(''); }}
                    style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'10px', padding:'8px 12px', cursor:'pointer', color:'#fff', display:'flex', alignItems:'center', gap:'6px', fontSize:'0.82rem', fontWeight:700, minHeight:'44px' }}>
                    <ArrowLeft size={16} /> Back
                  </button>
                ) : (
                  <h3 style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                    <Search size={18} className="text-primary" /> Pick Correct Item
                  </h3>
                )}
                <button onClick={closeScanPicker}
                  style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'12px', color:'#94a3b8', cursor:'pointer', width:'44px', height:'44px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <X size={20} />
                </button>
              </div>
              <div style={{ position:'relative' }}>
                <Search size={15} style={{ position:'absolute', left:'13px', top:'50%', transform:'translateY(-50%)', color:'#64748b', pointerEvents:'none' }} />
                <input type="text" placeholder="Search any item…" value={scanPickerSearch}
                  onChange={e => {
                    setScanPickerSearch(e.target.value);
                    if (e.target.value) setScanPickerSection('__search__');
                    else if (scanPickerSection === '__search__') setScanPickerSection(null);
                  }}
                  className="input-element" style={{ paddingLeft:'38px', paddingRight: scanPickerSearch ? '36px' : '14px' }} autoFocus />
                {scanPickerSearch && (
                  <button onClick={() => { setScanPickerSearch(''); setScanPickerSection(null); }}
                    style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#64748b', cursor:'pointer', padding:'8px' }}>
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Category grid — shown when nothing selected/searched */}
            {!scanPickerSection && !scanPickerSearch && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', paddingBottom:'8px' }}>
                {Object.entries(CATEGORIES).filter(([key]) => CATALOG[key]?.length > 0).map(([key, cat]) => (
                  <button key={key} onClick={() => setScanPickerSection(key)}
                    style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'18px', padding:'20px 14px', cursor:'pointer', textAlign:'left', display:'flex', flexDirection:'column', gap:'6px', minHeight:'90px' }}>
                    <span style={{ fontSize:'2rem' }}>{cat.icon}</span>
                    <span style={{ fontSize:'0.88rem', fontWeight:800, color:'#e2e8f0' }}>{cat.label}</span>
                    <span style={{ fontSize:'0.66rem', color:'#64748b' }}>{CATALOG[key]?.length} items</span>
                  </button>
                ))}
              </div>
            )}

            {/* Items list — search results or category drill-down */}
            {(scanPickerSection || scanPickerSearch) && (() => {
              const items = getScanPickerItems();
              if (scanPickerSection && scanPickerSection !== '__search__' && !scanPickerSearch) {
                return (
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'12px' }}>
                      <span style={{ fontSize:'1.3rem' }}>{CATEGORIES[scanPickerSection]?.icon}</span>
                      <span style={{ fontFamily:'var(--font-title)', fontSize:'1rem', fontWeight:800 }}>{CATEGORIES[scanPickerSection]?.label}</span>
                      <span style={{ fontSize:'0.68rem', color:'#64748b', marginLeft:'auto' }}>{items.length} items</span>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
                      {items.map((item, i) => (
                        <button key={i} type="button"
                          onClick={() => assignScannedItem(item)}
                          style={{ display:'flex', alignItems:'center', gap:'12px', padding:'13px 14px', background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:'13px', cursor:'pointer', textAlign:'left', width:'100%', minHeight:'52px' }}>
                          <span style={{ fontSize:'1.3rem', flexShrink:0, width:'30px', textAlign:'center' }}>{getItemIcon(item.name, item.cat)}</span>
                          <span style={{ flex:1, fontSize:'0.9rem', fontWeight:700, color:'#e2e8f0' }}>{item.name}</span>
                          <Check size={15} style={{ color:'#6366f1', flexShrink:0, opacity:0.6 }} />
                        </button>
                      ))}
                    </div>
                  </div>
                );
              }
              // search results
              return items.length > 0 ? (
                <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
                  {items.map((item, i) => (
                    <button key={i} type="button"
                      onClick={() => assignScannedItem(item)}
                      style={{ display:'flex', alignItems:'center', gap:'12px', padding:'13px 14px', background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:'13px', cursor:'pointer', textAlign:'left', width:'100%', minHeight:'52px' }}>
                      <span style={{ fontSize:'1.3rem', flexShrink:0, width:'30px', textAlign:'center' }}>{getItemIcon(item.name, item.cat)}</span>
                      <span style={{ flex:1, fontSize:'0.9rem', fontWeight:700, color:'#e2e8f0' }}>{item.name}</span>
                      <span style={{ fontSize:'0.62rem', color:'#818cf8', fontWeight:800, background:'rgba(99,102,241,0.15)', padding:'3px 8px', borderRadius:'6px', flexShrink:0 }}>
                        {CATEGORIES[item.cat]?.label}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign:'center', padding:'32px', color:'#64748b', fontSize:'0.82rem' }}>
                  No items match "{scanPickerSearch}"
                </div>
              );
            })()}

            <div style={{ height:'16px' }} />
          </div>
        </div>
      )}

      {/* ── CAMERA SCANNER ──────────────────────────────────────────────── */}
      {showScanner && (
        <div className="drawer-overlay" onClick={() => { stopCamera(); setShowScanner(false); }}>
          <div className="drawer-sheet" onClick={e => e.stopPropagation()}>
            <div className="drawer-drag-handle" />
            <div className="drawer-header">
              <h3 style={{ display:'flex', alignItems:'center', gap:'6px' }}><Camera size={18} className="text-primary" /> Scan Item</h3>
              <button onClick={() => { stopCamera(); setShowScanner(false); }}
                style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'12px', color:'#94a3b8', cursor:'pointer', width:'44px', height:'44px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <X size={20} />
              </button>
            </div>
            {!scanning ? (
              <div>
                {!cameraError ? (
                  <div className="scanner-viewport">
                    <video ref={videoRef} autoPlay playsInline muted className="scanner-video" />
                    <div className="scanner-grid-box" /><div className="scanner-laser-line" />
                  </div>
                ) : (
                  <div className="scanner-viewport" style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'10px', borderRadius:'12px', padding:'24px' }}>
                    <Camera size={32} className="text-primary" /><p style={{ fontSize:'0.8rem', fontWeight:700 }}>Camera Blocked</p>
                  </div>
                )}
                <div style={{ display:'flex', gap:'10px', marginBottom:'12px' }}>
                  {streamActive && (
                    <button onClick={() => {
                      if (!videoRef.current || !canvasRef.current) return;
                      const v = videoRef.current, c = canvasRef.current;
                      c.width = v.videoWidth; c.height = v.videoHeight;
                      c.getContext('2d').drawImage(v, 0, 0);
                      processImage(c.toDataURL('image/jpeg').split(',')[1]);
                    }} className="solid-btn" style={{ flex:2 }}><Camera size={18} /> Capture</button>
                  )}
                  <button onClick={() => fileInputRef.current?.click()} className="outline-btn" style={{ flex:1 }}>Upload</button>
                  <input ref={fileInputRef} type="file" accept="image/*"
                    onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => processImage(r.result.split(',')[1]); r.readAsDataURL(f); e.target.value = ''; }}
                    style={{ display:'none' }} />
                  <canvas ref={canvasRef} style={{ display:'none' }} />
                </div>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'40px 0', gap:'14px' }}>
                <div className="loading-ring" style={{ width:'36px', height:'36px', borderTopColor:'#6366f1' }} />
                <p style={{ fontSize:'0.82rem', fontWeight:700 }}>AI scanning item...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Catalog row — unique per-item emoji ───────────────────────────────────────
function CatalogRow({ item, inList, onAdd }) {
  const icon = getItemIcon(item.name, item.cat);
  return (
    <div
      onClick={() => !inList && onAdd(item)}
      style={{
        display:'flex', alignItems:'center', gap:'10px', padding:'12px 13px',
        background: inList ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.025)',
        border:`1px solid ${inList ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)'}`,
        borderRadius:'12px', cursor: inList ? 'default' : 'pointer',
        transition:'background 0.15s', minHeight:'48px',
      }}
    >
      <span style={{ fontSize:'1.2rem', flexShrink:0, width:'28px', textAlign:'center' }}>{icon}</span>
      <span style={{ flex:1, fontSize:'0.88rem', fontWeight:600 }}>{item.name}</span>
      {inList
        ? <Check size={16} style={{ color:'#10b981', flexShrink:0 }} />
        : <Plus  size={16} style={{ color:'#6366f1', flexShrink:0 }} />
      }
    </div>
  );
}
