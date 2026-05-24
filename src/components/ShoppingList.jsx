import React, { useState, useRef, useEffect } from 'react';
import { CATEGORIES } from '../utils/parser';
import {
  ShoppingBag, Plus, Edit2, CheckCircle, Circle, Trash2, Copy, Send,
  Camera, X, Info, Check, BookOpen, ChevronDown, ChevronUp
} from 'lucide-react';
import confetti from 'canvas-confetti';

const GROCERY_SUGGESTIONS = [
  { name: 'Eggs', category: 'dairy', store: 'Walmart' },
  { name: 'Milk 1 Gallon', category: 'dairy', store: 'Walmart' },
  { name: 'Lays Chips', category: 'shopping', store: 'Walmart' },
  { name: 'Organic Roma Tomatoes', category: 'vegetables', store: 'Lotte' },
  { name: 'Fresh Gala Apples', category: 'fruits', store: 'Lotte' },
  { name: 'Organic Bananas', category: 'fruits', store: 'Lotte' },
  { name: 'Honey Wheat Bread', category: 'bakery', store: 'Walmart' },
  { name: 'Premium Wheat Container', category: 'bakery', store: 'Costco' },
  { name: 'Halal Chicken', category: 'meat', store: 'Halal Store' },
  { name: 'Fresh Atlantic Salmon', category: 'meat', store: 'Costco' },
  { name: 'Cheddar Cheese', category: 'dairy', store: 'Restaurant Depot' },
  { name: 'Butter', category: 'dairy', store: 'Walmart' },
  { name: 'Rice Bag', category: 'bakery', store: 'Costco' },
  { name: 'Shampoo', category: 'shopping', store: 'Walmart' },
  { name: 'Soap Bar', category: 'shopping', store: 'Walmart' },
  { name: 'Toilet Paper 24-pack', category: 'shopping', store: 'Costco' },
  { name: 'Coffee Beans', category: 'dining', store: 'Walmart' },
  { name: 'Lipton Tea Bags', category: 'dining', store: 'Walmart' },
  { name: 'Mineral Water Case', category: 'shopping', store: 'Costco' },
  { name: 'Soda Cans 12-pack', category: 'shopping', store: 'Walmart' },
  { name: 'Gym Membership', category: 'fitness', store: 'Walmart' },
  { name: 'Monthly Home Rent', category: 'rent', store: 'Walmart' },
  { name: 'School Tuition Fees', category: 'education', store: 'Walmart' },
  { name: 'Olive Oil', category: 'bakery', store: 'Costco' },
  { name: 'Greek Yogurt', category: 'dairy', store: 'Walmart' },
  { name: 'Frozen Berries', category: 'fruits', store: 'Costco' },
  { name: 'Pasta', category: 'bakery', store: 'Walmart' },
  { name: 'Canned Tomatoes', category: 'vegetables', store: 'Walmart' },
  { name: 'Detergent', category: 'shopping', store: 'Walmart' },
  { name: 'Toothpaste', category: 'shopping', store: 'Walmart' },
];

export default function ShoppingList({
  listItems, onAddItem, onToggleItem, onDeleteItem, onClearList, onUpdateItem,
  customStores, onAddCustomStore, customSuggestions, showToast
}) {
  const [newItem, setNewItem] = useState('');
  const [selectedStore, setSelectedStore] = useState('Walmart');
  const [selectedCategory, setSelectedCategory] = useState('other');

  // Inline "Add New Store" state for the main form
  const [showMainStoreInput, setShowMainStoreInput] = useState(false);
  const [mainStoreNewVal, setMainStoreNewVal] = useState('');

  // Edit modal states
  const [editingIndex, setEditingIndex] = useState(null);
  const [editName, setEditName] = useState('');
  const [editStore, setEditStore] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [showEditStoreInput, setShowEditStoreInput] = useState(false);
  const [editStoreNewVal, setEditStoreNewVal] = useState('');

  // Camera scanner states
  const [showScanner, setShowScanner] = useState(false);
  const [streamActive, setStreamActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [cameraError, setCameraError] = useState(false);

  // Catalog panel state
  const [showCatalog, setShowCatalog] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const safeListItems = (Array.isArray(listItems) ? listItems : []).filter(
    item => item && typeof item === 'object' && typeof item.name === 'string'
  );
  const safeCustomSuggestions = (Array.isArray(customSuggestions) ? customSuggestions : []).filter(
    sug => sug && typeof sug === 'object' && typeof sug.name === 'string'
  );

  const defaultStores = ['Walmart', 'Costco', 'Lotte', 'Halal Store', 'Home Depot', 'Restaurant Depot'];
  const allStores = Array.from(new Set([...defaultStores, ...(customStores || [])]));

  const getStoreEmoji = (storeName) => {
    const clean = storeName.toLowerCase();
    if (clean.includes('walmart')) return '🛒';
    if (clean.includes('costco')) return '📦';
    if (clean.includes('lotte')) return '🏮';
    if (clean.includes('halal')) return '🥩';
    if (clean.includes('home depot')) return '🏗️';
    if (clean.includes('restaurant')) return '🍽️';
    return '🏪';
  };

  // ── ADD ITEM ──────────────────────────────────────────────────────────────
  const handleAdd = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newItem.trim()) return;
    const targetStore = selectedStore === 'ADD_NEW_STORE_TRIGGER' ? 'Walmart' : selectedStore;
    onAddItem({ name: newItem.trim(), checked: false, store: targetStore, category: selectedCategory });
    if (showToast) showToast(`"${newItem.trim()}" added ✓`);
    setNewItem('');
    try { confetti({ particleCount: 20, spread: 30, origin: { y: 0.8 }, colors: ['#6366f1', '#10b981'] }); } catch (_) {}
  };

  // ── AUTOCOMPLETE SUGGESTIONS ──────────────────────────────────────────────
  const getSuggestions = () => {
    if (!newItem.trim()) return [];
    const query = newItem.toLowerCase();
    const combined = [...GROCERY_SUGGESTIONS, ...safeCustomSuggestions];
    return combined.filter(item =>
      item?.name && item.name.toLowerCase().includes(query) &&
      !safeListItems.some(existing => existing?.name?.toLowerCase() === item.name.toLowerCase())
    ).slice(0, 6);
  };
  const suggestions = getSuggestions();

  // ── STORE HELPERS ─────────────────────────────────────────────────────────
  const confirmMainStore = () => {
    const clean = mainStoreNewVal.trim();
    if (clean) { onAddCustomStore(clean); setSelectedStore(clean); }
    setShowMainStoreInput(false);
    setMainStoreNewVal('');
  };
  const confirmEditStore = () => {
    const clean = editStoreNewVal.trim();
    if (clean) { onAddCustomStore(clean); setEditStore(clean); }
    setShowEditStoreInput(false);
    setEditStoreNewVal('');
  };

  // ── EDIT MODAL ────────────────────────────────────────────────────────────
  const openEditor = (index) => {
    const item = safeListItems[index];
    setEditingIndex(index);
    if (item) { setEditName(item.name); setEditStore(item.store || 'Walmart'); setEditCategory(item.category || 'other'); }
    setShowEditStoreInput(false);
  };

  const handleCapturedObject = (name, cat, store) => {
    setEditName(name); setEditStore(store); setEditCategory(cat);
    setEditingIndex('scanned');
  };

  const saveEdit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!editName.trim()) return;
    if (editingIndex === 'scanned') {
      onAddItem({ name: editName.trim(), checked: false, store: editStore, category: editCategory });
      if (showToast) showToast(`"${editName.trim()}" added ✓`);
      try { confetti({ particleCount: 80, spread: 60, origin: { y: 0.85 }, colors: ['#6366f1', '#10b981'] }); } catch (_) {}
    } else {
      onUpdateItem(editingIndex, { name: editName.trim(), store: editStore, category: editCategory });
      if (showToast) showToast('Item updated ✓');
    }
    setEditingIndex(null);
  };

  // ── SHARING ───────────────────────────────────────────────────────────────
  const generateShareLink = () => {
    if (safeListItems.length === 0) return '';
    const encodedItems = safeListItems.map(item => {
      const cleanName = item.name.replace(/[:|,]/g, ' ');
      return `${cleanName}:${item.category || 'other'}:${item.store || 'Walmart'}`;
    });
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?importList=${encodeURIComponent(encodedItems.join(','))}`;
  };

  const handleShareWhatsApp = () => {
    const link = generateShareLink();
    if (!link) { if (showToast) showToast('Add items first before sharing', 'error'); return; }
    const message = `Hi! Here is our grocery checklist. Click to import it into SmartSpend: ${link}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleCopyLink = () => {
    const link = generateShareLink();
    if (!link) { if (showToast) showToast('Add items first before copying', 'error'); return; }
    navigator.clipboard.writeText(link)
      .then(() => {
        if (showToast) showToast('Shopping list link copied!');
        try { confetti({ particleCount: 50, spread: 40, origin: { y: 0.8 }, colors: ['#6366f1', '#10b981'] }); } catch (_) {}
      })
      .catch(() => { if (showToast) showToast('Could not copy link', 'error'); });
  };

  // ── GROUPING ──────────────────────────────────────────────────────────────
  const groupItemsByStore = () => {
    const groups = {};
    safeListItems.forEach((item, idx) => {
      const store = item.store || 'Walmart';
      if (!groups[store]) groups[store] = [];
      groups[store].push({ ...item, originalIndex: idx });
    });
    return groups;
  };
  const storeGroups = groupItemsByStore();

  // ── CATALOG ───────────────────────────────────────────────────────────────
  // Build a categorized catalog: built-in + custom suggestions
  const buildCatalog = () => {
    const combined = [
      ...GROCERY_SUGGESTIONS.map(s => ({ ...s, isCustom: false })),
      ...safeCustomSuggestions.map(s => ({ ...s, isCustom: true }))
    ];
    // Deduplicate by name
    const seen = new Set();
    const deduped = combined.filter(s => {
      const key = s.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    // Group by category
    const grouped = {};
    deduped.forEach(item => {
      const cat = item.category || 'other';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    });
    return grouped;
  };
  const catalog = buildCatalog();

  const addFromCatalog = (item) => {
    const alreadyInList = safeListItems.some(i => i.name.toLowerCase() === item.name.toLowerCase() && !i.checked);
    if (alreadyInList) { if (showToast) showToast(`"${item.name}" already in list`, 'info'); return; }
    onAddItem({ name: item.name, checked: false, store: item.store || 'Walmart', category: item.category || 'other' });
    if (showToast) showToast(`"${item.name}" added ✓`);
    try { confetti({ particleCount: 15, spread: 25, origin: { y: 0.8 }, colors: ['#6366f1', '#10b981'] }); } catch (_) {}
  };

  // ── CAMERA ────────────────────────────────────────────────────────────────
  const startScanner = async () => {
    try {
      setCameraError(false);
      let stream;
      try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }); }
      catch (_) { stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false }); }
      if (videoRef.current) { videoRef.current.srcObject = stream; setStreamActive(true); }
      else {
        let retries = 0;
        const interval = setInterval(() => {
          if (videoRef.current) { videoRef.current.srcObject = stream; setStreamActive(true); clearInterval(interval); }
          if (++retries > 10) clearInterval(interval);
        }, 100);
      }
    } catch (_) { setCameraError(true); setStreamActive(false); }
  };

  const stopScanner = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setStreamActive(false);
  };

  useEffect(() => {
    if (showScanner) startScanner();
    else stopScanner();
    return () => stopScanner();
  }, [showScanner]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    processObjectImage(canvas.toDataURL('image/jpeg').split(',')[1]);
  };

  const handleSimulateObject = (objType) => {
    stopScanner(); setIsProcessing(true); setStatusMessage('Analyzing object...');
    setTimeout(() => {
      setStatusMessage('Extracting details...');
      setTimeout(() => {
        const map = {
          tomato: { name: 'Organic Roma Tomatoes', cat: 'vegetables', store: 'Lotte' },
          wheat: { name: 'Premium Wheat Container', cat: 'bakery', store: 'Costco' },
          milk: { name: 'Whole Milk 1 Gallon', cat: 'dairy', store: 'Walmart' },
          lays: { name: 'Lays Classic Chips', cat: 'shopping', store: 'Walmart' },
        };
        const r = map[objType] || { name: 'Unknown Item', cat: 'other', store: 'Walmart' };
        setIsProcessing(false); setShowScanner(false);
        handleCapturedObject(r.name, r.cat, r.store);
      }, 700);
    }, 500);
  };

  const processObjectImage = async (base64) => {
    stopScanner(); setIsProcessing(true); setStatusMessage('Running AI vision...');
    const apiKey = localStorage.getItem('smartspend_gemini_key');
    try {
      if (apiKey) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        const prompt = `Identify the main grocery or household item. Return EXACTLY a JSON block:
{"name":"item name","category":"one of vegetables/fruits/dairy/meat/bakery/shopping/dining/other","store":"one of Walmart/Costco/Lotte/Halal Store/Home Depot/Restaurant Depot"}`;
        const response = await fetch(url, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: 'image/jpeg', data: base64 } }] }], generationConfig: { responseMimeType: 'application/json' } })
        });
        if (!response.ok) throw new Error('API failed');
        const data = await response.json();
        const res = JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text.trim());
        setIsProcessing(false); setShowScanner(false);
        handleCapturedObject(res.name, res.category || 'other', res.store || 'Walmart');
      } else {
        setStatusMessage('No AI key — using demo...');
        await new Promise(r => setTimeout(r, 800));
        handleSimulateObject('tomato');
      }
    } catch (err) {
      console.error(err);
      handleCapturedObject('Scanned Item', 'other', 'Walmart');
    } finally { setIsProcessing(false); setShowScanner(false); }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="shopping-list-view" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Header banner */}
      <div className="tip-banner">
        <ShoppingBag size={18} className="text-primary" style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          <strong>Store-Grouped Lists:</strong> Add items, assign them to specific shops, and share with family via <strong>WhatsApp</strong> in one tap!
        </div>
      </div>

      {/* ── ADD ITEM FORM ── */}
      <div className="glass-card" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* Autocomplete suggestions */}
          {suggestions.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', animation: 'fadeIn 0.2s ease-in' }}>
              <label style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--primary)' }}>⚡ QUICK ADD</label>
              <div className="cat-chips-scroll" style={{ paddingBottom: 6 }}>
                {suggestions.map((sug, idx) => (
                  <div
                    key={idx}
                    onClick={() => { onAddItem({ name: sug.name, checked: false, store: sug.store, category: sug.category }); setNewItem(''); if (showToast) showToast(`"${sug.name}" added ✓`); try { confetti({ particleCount: 15, spread: 25, origin: { y: 0.8 }, colors: ['#6366f1', '#10b981'] }); } catch (_) {} }}
                    className="cat-chip"
                    style={{ background: 'rgba(99,102,241,0.08)', borderColor: 'rgba(99,102,241,0.25)', color: '#fff', fontSize: '0.78rem', padding: '8px 12px' }}
                  >
                    <span>{CATEGORIES[sug.category]?.icon}</span>
                    <span>{sug.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Input row */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Wheat, tomatoes, eggs..."
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(e); } }}
              className="input-element"
              style={{ flex: 1, padding: '12px 14px' }}
            />
            <button type="button" onClick={() => setShowScanner(true)} className="outline-btn"
              style={{ width: 'auto', padding: '12px', borderRadius: '14px', borderColor: 'var(--primary)' }}>
              <Camera className="text-primary" size={18} />
            </button>
            <button type="button" onClick={handleAdd} className="solid-btn"
              style={{ width: 'auto', padding: '12px 16px', borderRadius: '14px' }}>
              <Plus size={18} /> Add
            </button>
          </div>

          {/* Store + Category selectors */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--slate-text)' }}>TARGET SHOP</label>
              <select
                value={showMainStoreInput ? 'ADD_NEW_STORE_TRIGGER' : selectedStore}
                onChange={(e) => {
                  if (e.target.value === 'ADD_NEW_STORE_TRIGGER') { setShowMainStoreInput(true); setMainStoreNewVal(''); }
                  else { setSelectedStore(e.target.value); setShowMainStoreInput(false); }
                }}
                className="input-element"
                style={{ padding: '8px', fontSize: '0.78rem', background: '#0f172a' }}
              >
                {allStores.map(store => <option key={store} value={store}>{getStoreEmoji(store)} {store}</option>)}
                <option value="ADD_NEW_STORE_TRIGGER">➕ Add New Store…</option>
              </select>
              {showMainStoreInput && (
                <div className="inline-store-row">
                  <input
                    type="text" placeholder="e.g. Trader Joe's"
                    value={mainStoreNewVal} onChange={e => setMainStoreNewVal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') confirmMainStore(); }}
                    className="input-element" style={{ flex: 1, padding: '8px 10px', fontSize: '0.78rem' }} autoFocus
                  />
                  <button type="button" onClick={confirmMainStore} className="solid-btn"
                    style={{ width: 'auto', padding: '8px 12px', borderRadius: '10px', fontSize: '0.78rem' }}>
                    <Check size={14} />
                  </button>
                  <button type="button" onClick={() => { setShowMainStoreInput(false); setSelectedStore('Walmart'); }} className="outline-btn"
                    style={{ width: 'auto', padding: '8px', borderRadius: '10px' }}>
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--slate-text)' }}>CATEGORY</label>
              <select
                value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}
                className="input-element" style={{ padding: '8px', fontSize: '0.78rem', background: '#0f172a' }}
              >
                {Object.entries(CATEGORIES).map(([key, val]) => (
                  <option key={key} value={key}>{val.icon} {val.label}</option>
                ))}
              </select>
            </div>
          </div>

        </div>
      </div>

      {/* ── CHECKLIST GROUPED BY STORE ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {safeListItems.length > 0 ? (
          Object.entries(storeGroups).map(([storeName, items]) => (
            <div key={storeName} className="glass-card" style={{ padding: '16px', marginBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px', marginBottom: '12px' }}>
                <span style={{ fontSize: '1.25rem' }}>{getStoreEmoji(storeName)}</span>
                <span style={{ fontFamily: 'var(--font-title)', fontSize: '1rem', fontWeight: 800 }}>{storeName}</span>
                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, background: 'rgba(255,255,255,0.03)', padding: '2px 8px', borderRadius: '10px', marginLeft: 'auto' }}>
                  {items.filter(i => i.checked).length}/{items.length}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {items.map((item) => (
                  <div key={item.originalIndex}
                    onClick={() => onToggleItem(item.originalIndex)}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 12px', background: item.checked ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.04)', borderRadius: '10px',
                      cursor: 'pointer', opacity: item.checked ? 0.55 : 1, transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {item.checked ? <CheckCircle className="text-emerald" size={16} /> : <Circle className="text-slate-text" size={16} />}
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, textDecoration: item.checked ? 'line-through' : 'none' }}>{item.name}</span>
                        <span style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 600 }}>
                          {CATEGORIES[item.category || 'other']?.icon} {CATEGORIES[item.category || 'other']?.label}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button onClick={e => { e.stopPropagation(); openEditor(item.originalIndex); }}
                        style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}>
                        <Edit2 size={12} />
                      </button>
                      <button onClick={e => { e.stopPropagation(); onDeleteItem(item.originalIndex); }}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="glass-card" style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b', fontSize: '0.85rem' }}>
            <ShoppingBag size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p style={{ fontWeight: 700, marginBottom: '6px', color: '#94a3b8' }}>Your checklist is empty</p>
            <p>Type an item above and tap <strong>Add</strong>, or browse the catalog below!</p>
          </div>
        )}
      </div>

      {/* ── SHARE BUTTONS ── */}
      {safeListItems.length > 0 && (
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px' }}>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', textAlign: 'center', fontWeight: 700 }}>SHARE WITH PARTNER</div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleShareWhatsApp} className="solid-btn"
              style={{ flex: 1, padding: '12px 14px', borderRadius: '12px', background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
              <Send size={16} /> WhatsApp
            </button>
            <button onClick={handleCopyLink} className="outline-btn" style={{ flex: 1, padding: '12px 14px', borderRadius: '12px' }}>
              <Copy size={16} /> Copy Link
            </button>
          </div>
        </div>
      )}

      {/* ── MASTER GROCERY CATALOG ── */}
      <div className="glass-card" style={{ padding: '16px' }}>
        <button
          type="button"
          onClick={() => setShowCatalog(!showCatalog)}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <h2 className="section-title" style={{ marginBottom: 0, fontSize: '0.92rem', color: 'var(--primary)' }}>
            <BookOpen size={16} /> Browse Item Catalog
          </h2>
          {showCatalog ? <ChevronUp size={18} color="#64748b" /> : <ChevronDown size={18} color="#64748b" />}
        </button>

        {!showCatalog && (
          <p style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '6px' }}>
            Tap to browse {GROCERY_SUGGESTIONS.length + safeCustomSuggestions.length}+ items by category and add them instantly
          </p>
        )}

        {showCatalog && (
          <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '4px', animation: 'fadeIn 0.2s ease' }}>
            <p style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '10px' }}>
              Tap any item to add it to your list. <span style={{ color: '#10b981' }}>Green border</span> = items you taught the app.
            </p>
            {Object.entries(catalog).map(([catKey, items]) => {
              const catInfo = CATEGORIES[catKey] || CATEGORIES.other;
              return (
                <div key={catKey} style={{ marginBottom: '10px' }}>
                  <div className="catalog-category-label">
                    {catInfo.icon} {catInfo.label}
                  </div>
                  <div className="catalog-items-wrap">
                    {items.map((item, idx) => (
                      <div
                        key={idx}
                        className={`catalog-chip ${item.isCustom ? 'custom-item' : ''}`}
                        onClick={() => addFromCatalog(item)}
                        title={`Tap to add • ${item.store}`}
                      >
                        <Plus size={10} />
                        <span>{item.name}</span>
                        {item.isCustom && <span style={{ fontSize: '0.6rem', color: '#10b981', fontWeight: 800 }}>★</span>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── EDIT MODAL ── */}
      {editingIndex !== null && (
        <div className="drawer-overlay" onClick={() => setEditingIndex(null)}>
          <div className="drawer-sheet" onClick={e => e.stopPropagation()}>
            <div className="drawer-drag-handle" />
            <div className="drawer-header">
              <h3>{editingIndex === 'scanned' ? '🔍 Verify Scanned Item' : '✏️ Edit Item'}</h3>
              <button onClick={() => setEditingIndex(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="input-group">
                <label>Item Name</label>
                <input type="text" required value={editName} onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveEdit(e); } }}
                  className="input-element" />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label>Assigned Store</label>
                <select
                  value={showEditStoreInput ? 'ADD_NEW_STORE_TRIGGER' : editStore}
                  onChange={e => {
                    if (e.target.value === 'ADD_NEW_STORE_TRIGGER') { setShowEditStoreInput(true); setEditStoreNewVal(''); }
                    else { setEditStore(e.target.value); setShowEditStoreInput(false); }
                  }}
                  className="input-element" style={{ background: '#0f172a' }}
                >
                  {allStores.map(store => <option key={store} value={store}>{getStoreEmoji(store)} {store}</option>)}
                  <option value="ADD_NEW_STORE_TRIGGER">➕ Add New Store…</option>
                </select>
                {showEditStoreInput && (
                  <div className="inline-store-row">
                    <input type="text" placeholder="e.g. Trader Joe's"
                      value={editStoreNewVal} onChange={e => setEditStoreNewVal(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') confirmEditStore(); }}
                      className="input-element" style={{ flex: 1, padding: '8px 10px', fontSize: '0.78rem' }} autoFocus />
                    <button type="button" onClick={confirmEditStore} className="solid-btn"
                      style={{ width: 'auto', padding: '8px 12px', borderRadius: '10px' }}><Check size={14} /></button>
                    <button type="button" onClick={() => { setShowEditStoreInput(false); setEditStore('Walmart'); }} className="outline-btn"
                      style={{ width: 'auto', padding: '8px', borderRadius: '10px' }}><X size={14} /></button>
                  </div>
                )}
              </div>
              <div className="input-group">
                <label>Category</label>
                <select value={editCategory} onChange={e => setEditCategory(e.target.value)}
                  className="input-element" style={{ background: '#0f172a' }}>
                  {Object.entries(CATEGORIES).map(([key, val]) => <option key={key} value={key}>{val.icon} {val.label}</option>)}
                </select>
              </div>
              <button type="button" onClick={saveEdit} className="solid-btn" style={{ marginTop: '6px' }}>
                <Check size={18} /> {editingIndex === 'scanned' ? 'Confirm & Add to List' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CAMERA SCANNER MODAL ── */}
      {showScanner && (
        <div className="drawer-overlay" onClick={() => { stopScanner(); setShowScanner(false); }}>
          <div className="drawer-sheet" onClick={e => e.stopPropagation()}>
            <div className="drawer-drag-handle" />
            <div className="drawer-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Camera size={18} className="text-primary" /> Visual AI Scanner
              </h3>
              <button onClick={() => { stopScanner(); setShowScanner(false); }} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {!isProcessing && (
              <div>
                {!cameraError ? (
                  <div className="scanner-viewport">
                    <video ref={videoRef} autoPlay playsInline muted className="scanner-video" />
                    <div className="scanner-grid-box" />
                    <div className="scanner-laser-line" />
                  </div>
                ) : (
                  <div className="scanner-viewport" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px', gap: '10px' }}>
                    <Camera size={36} className="text-primary" />
                    <p style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 700 }}>Camera Blocked</p>
                    <p style={{ fontSize: '0.7rem', color: '#94a3b8', textAlign: 'center', maxWidth: '240px' }}>
                      Allow camera access in browser settings, or upload an image below.
                    </p>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                  {streamActive && (
                    <button onClick={handleCapture} className="solid-btn" style={{ flex: 2 }}>
                      <Camera size={18} /> Take Photo
                    </button>
                  )}
                  <button onClick={() => fileInputRef.current?.click()} className="outline-btn" style={{ flex: 1 }}>Upload Image</button>
                  <input ref={fileInputRef} type="file" accept="image/*"
                    onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => processObjectImage(r.result.split(',')[1]); r.readAsDataURL(f); }}
                    style={{ display: 'none' }} />
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                </div>

                <div className="glass-card" style={{ background: 'rgba(99,102,241,0.04)', borderColor: 'rgba(99,102,241,0.15)', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontSize: '0.82rem', fontWeight: 700, color: '#a5b4fc' }}>
                    <Info size={16} /> Demo Simulator
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                      { key: 'tomato', label: '🥬 Tomato → Lotte' },
                      { key: 'wheat', label: '🌾 Wheat Container → Costco' },
                      { key: 'milk', label: '🥛 Milk Carton → Walmart' },
                      { key: 'lays', label: '🥔 Lays Chips → Walmart' },
                    ].map(({ key, label }) => (
                      <button key={key} onClick={() => handleSimulateObject(key)} className="outline-btn"
                        style={{ justifyContent: 'flex-start', padding: '10px 14px', fontSize: '0.78rem', borderRadius: '12px' }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {isProcessing && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: '16px' }}>
                <div className="loading-ring" style={{ width: '36px', height: '36px', borderTopColor: '#6366f1' }} />
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontWeight: 700 }}>AI Object Extraction</p>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>{statusMessage}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
