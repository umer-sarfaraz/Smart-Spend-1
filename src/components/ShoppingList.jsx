import React, { useState, useRef } from 'react';
import { CATEGORIES } from '../utils/parser';
import {
  ShoppingBag, Plus, Edit2, CheckCircle, Circle, Trash2, Copy, Send,
  Camera, X, Check, Search, ArrowLeft, ChevronRight
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
  { name: 'Olive Oil', category: 'bakery', store: 'Costco' },
  { name: 'Greek Yogurt', category: 'dairy', store: 'Walmart' },
  { name: 'Frozen Berries', category: 'fruits', store: 'Costco' },
  { name: 'Pasta', category: 'bakery', store: 'Walmart' },
  { name: 'Canned Tomatoes', category: 'vegetables', store: 'Walmart' },
  { name: 'Detergent', category: 'shopping', store: 'Walmart' },
  { name: 'Toothpaste', category: 'shopping', store: 'Walmart' },
  { name: 'Ground Beef', category: 'meat', store: 'Halal Store' },
  { name: 'Onions 5lb', category: 'vegetables', store: 'Restaurant Depot' },
  { name: 'Garlic Loose', category: 'vegetables', store: 'Restaurant Depot' },
  { name: 'Canola Oil Gallon', category: 'bakery', store: 'Restaurant Depot' },
  { name: 'Mozzarella Cheese', category: 'dairy', store: 'Restaurant Depot' },
  { name: 'Atta Flour 20lb', category: 'bakery', store: 'Restaurant Depot' },
];

const STORE_EMOJIS = {
  walmart: '🛒', costco: '📦', lotte: '🏮', halal: '🥩',
  'home depot': '🏗️', restaurant: '🍽️',
};
const getStoreEmoji = (name = '') => {
  const l = name.toLowerCase();
  for (const [k, v] of Object.entries(STORE_EMOJIS)) if (l.includes(k)) return v;
  return '🏪';
};

export default function ShoppingList({
  listItems, onAddItem, onToggleItem, onDeleteItem, onClearList, onUpdateItem,
  customStores, onAddCustomStore, customSuggestions, showToast
}) {
  // ── view: 'home' | category key like 'vegetables' ─────────────────────────
  const [view, setView] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');

  // Add sheet
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [newItem, setNewItem] = useState('');
  const [selectedStore, setSelectedStore] = useState('Walmart');
  const [selectedCategory, setSelectedCategory] = useState('other');
  const [showNewStore, setShowNewStore] = useState(false);
  const [newStoreVal, setNewStoreVal] = useState('');

  // Edit modal
  const [editingIndex, setEditingIndex] = useState(null);
  const [editName, setEditName] = useState('');
  const [editStore, setEditStore] = useState('');
  const [editCategory, setEditCategory] = useState('');

  // Camera scanner
  const [showScanner, setShowScanner] = useState(false);
  const [streamActive, setStreamActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [cameraError, setCameraError] = useState(false);

  // Alphabet refs for category detail view
  const letterRefs = useRef({});

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const safe = (Array.isArray(listItems) ? listItems : [])
    .filter(i => i && typeof i.name === 'string');
  const safeSuggestions = (Array.isArray(customSuggestions) ? customSuggestions : [])
    .filter(s => s && typeof s.name === 'string');

  const defaultStores = ['Walmart', 'Costco', 'Lotte', 'Halal Store', 'Home Depot', 'Restaurant Depot'];
  const allStores = Array.from(new Set([...defaultStores, ...(customStores || [])]));

  // ── Items grouped by category ─────────────────────────────────────────────
  const byCategory = {};
  safe.forEach((item, idx) => {
    const cat = item.category || 'other';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push({ ...item, originalIndex: idx });
  });

  // Categories that have items, sorted by item count desc
  const activeCategories = Object.keys(byCategory).sort((a, b) => byCategory[b].length - byCategory[a].length);

  // ── Items for the current category view, sorted A-Z ─────────────────────
  const categoryItems = view !== 'home'
    ? [...(byCategory[view] || [])].sort((a, b) => a.name.localeCompare(b.name))
    : [];

  // Group category items by first letter
  const byLetter = {};
  categoryItems.forEach(item => {
    const letter = item.name[0]?.toUpperCase() || '#';
    if (!byLetter[letter]) byLetter[letter] = [];
    byLetter[letter].push(item);
  });
  const letters = Object.keys(byLetter).sort();

  // ── Search results (across all items) ───────────────────────────────────
  const searchResults = searchQuery.trim()
    ? safe.map((item, idx) => ({ ...item, originalIndex: idx }))
        .filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase().trim()))
    : [];

  // ── Autocomplete suggestions for add form ────────────────────────────────
  const getSuggestions = () => {
    if (!newItem.trim()) return [];
    const q = newItem.toLowerCase();
    return [...GROCERY_SUGGESTIONS, ...safeSuggestions]
      .filter(s => s.name.toLowerCase().includes(q) &&
        !safe.some(e => e.name.toLowerCase() === s.name.toLowerCase()))
      .slice(0, 5);
  };

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleAdd = () => {
    if (!newItem.trim()) return;
    const cat = view !== 'home' ? view : selectedCategory;
    onAddItem({ name: newItem.trim(), checked: false, store: selectedStore, category: cat });
    if (showToast) showToast(`"${newItem.trim()}" added ✓`);
    setNewItem('');
    try { confetti({ particleCount: 20, spread: 30, origin: { y: 0.8 }, colors: ['#6366f1', '#10b981'] }); } catch (_) {}
  };

  const openEditor = (idx) => {
    const item = safe[idx];
    if (!item) return;
    setEditingIndex(idx);
    setEditName(item.name);
    setEditStore(item.store || 'Walmart');
    setEditCategory(item.category || 'other');
  };

  const saveEdit = () => {
    if (!editName.trim()) return;
    onUpdateItem(editingIndex, { name: editName.trim(), store: editStore, category: editCategory });
    if (showToast) showToast('Item updated ✓');
    setEditingIndex(null);
  };

  const generateShareLink = () => {
    if (!safe.length) return '';
    const encoded = safe.map(i => `${i.name.replace(/[:|,]/g, ' ')}:${i.category || 'other'}:${i.store || 'Walmart'}`);
    return `${window.location.origin}${window.location.pathname}?importList=${encodeURIComponent(encoded.join(','))}`;
  };

  const handleShareWhatsApp = () => {
    const link = generateShareLink();
    if (!link) { showToast?.('Add items first', 'error'); return; }
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent('Hi! Here is our grocery checklist. Open in SmartSpend: ' + link)}`, '_blank');
  };

  const handleCopyLink = () => {
    const link = generateShareLink();
    if (!link) { showToast?.('Add items first', 'error'); return; }
    navigator.clipboard.writeText(link).then(() => showToast?.('Link copied!')).catch(() => showToast?.('Could not copy', 'error'));
  };

  // ── Camera helpers ────────────────────────────────────────────────────────
  const startCamera = async () => {
    try {
      setCameraError(false);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
        .catch(() => navigator.mediaDevices.getUserMedia({ video: true, audio: false }));
      if (videoRef.current) { videoRef.current.srcObject = stream; setStreamActive(true); }
    } catch { setCameraError(true); }
  };
  const stopCamera = () => {
    videoRef.current?.srcObject?.getTracks().forEach(t => t.stop());
    setStreamActive(false);
  };

  const handleScanCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current, c = canvasRef.current;
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);
    processObjectImage(c.toDataURL('image/jpeg').split(',')[1]);
  };

  const processObjectImage = async (base64) => {
    stopCamera(); setIsProcessing(true); setStatusMessage('Running AI vision...');
    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64Image: base64, mimeType: 'image/jpeg',
          prompt: `Identify the main grocery or household item in this photo. Return EXACTLY a JSON object (no markdown):
{"name":"item name","category":"one of: vegetables/fruits/dairy/meat/bakery/shopping/dining/other","store":"one of: Walmart/Costco/Lotte/Halal Store/Home Depot/Restaurant Depot"}`
        })
      });
      const res = await response.json();
      setEditName(res.name || 'Scanned Item');
      setEditStore(res.store || 'Walmart');
      setEditCategory(res.category || 'other');
      setEditingIndex('scanned');
    } catch {
      setEditName('Scanned Item'); setEditStore('Walmart'); setEditCategory('other');
      setEditingIndex('scanned');
    } finally { setIsProcessing(false); setShowScanner(false); }
  };

  // ── SCROLL to letter ──────────────────────────────────────────────────────
  const scrollToLetter = (letter) => {
    letterRefs.current[letter]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // ─────────────────────────────────────────────────────────────────────────
  // ── HOME VIEW ─────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────
  const renderHome = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Search bar */}
      <div style={{ position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
        <input
          type="text"
          placeholder="Search all items..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="input-element"
          style={{ paddingLeft: '40px', paddingRight: searchQuery ? '40px' : '14px' }}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Search results */}
      {searchQuery.trim() && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"
          </div>
          {searchResults.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#64748b', fontSize: '0.82rem' }}>No items found</div>
          ) : (
            searchResults.map(item => renderItemRow(item, item.originalIndex))
          )}
        </div>
      )}

      {/* Category cards grid */}
      {!searchQuery && (
        <>
          {safe.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '48px 20px' }}>
              <ShoppingBag size={40} style={{ margin: '0 auto 14px', opacity: 0.2, display: 'block' }} />
              <p style={{ fontWeight: 700, color: '#94a3b8', marginBottom: '6px' }}>Your checklist is empty</p>
              <p style={{ fontSize: '0.78rem', color: '#64748b' }}>Tap the button below to add your first item</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {safe.length} item{safe.length !== 1 ? 's' : ''} · {safe.filter(i => i.checked).length} checked
                </span>
                {safe.some(i => i.checked) && (
                  <button
                    onClick={() => { safe.forEach((item, idx) => { if (item.checked) onDeleteItem(idx); }); showToast?.('Checked items cleared'); }}
                    style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Clear checked
                  </button>
                )}
              </div>

              {/* 2-column category grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {activeCategories.map(catKey => {
                  const cat = CATEGORIES[catKey] || CATEGORIES.other;
                  const items = byCategory[catKey];
                  const checkedCount = items.filter(i => i.checked).length;
                  const allDone = checkedCount === items.length;
                  return (
                    <button
                      key={catKey}
                      onClick={() => setView(catKey)}
                      style={{
                        background: allDone ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${allDone ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.07)'}`,
                        borderRadius: '16px', padding: '16px 14px',
                        cursor: 'pointer', textAlign: 'left',
                        display: 'flex', flexDirection: 'column', gap: '8px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ fontSize: '1.6rem' }}>{cat.icon}</div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: allDone ? '#34d399' : '#e2e8f0' }}>
                        {cat.label}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                          {checkedCount}/{items.length} done
                        </span>
                        <ChevronRight size={14} color="#64748b" />
                      </div>
                      {/* Mini progress bar */}
                      <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(checkedCount / items.length) * 100}%`, background: allDone ? '#10b981' : cat.color, borderRadius: '99px', transition: 'width 0.3s ease' }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Share buttons */}
          {safe.length > 0 && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleShareWhatsApp} className="solid-btn" style={{ flex: 1, background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                <Send size={16} /> WhatsApp
              </button>
              <button onClick={handleCopyLink} className="outline-btn" style={{ flex: 1 }}>
                <Copy size={16} /> Copy Link
              </button>
            </div>
          )}
        </>
      )}

      {/* Floating Add button */}
      <button
        onClick={() => { setSelectedCategory('other'); setShowAddSheet(true); }}
        className="solid-btn"
        style={{ position: 'sticky', bottom: '12px', borderRadius: '16px', padding: '14px', fontSize: '0.92rem', fontWeight: 800, boxShadow: '0 4px 24px rgba(99,102,241,0.35)' }}
      >
        <Plus size={20} /> Add Item
      </button>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // ── CATEGORY DETAIL VIEW ──────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────
  const renderCategory = () => {
    const cat = CATEGORIES[view] || CATEGORIES.other;
    const [catSearch, setCatSearch] = useState('');

    const filteredItems = catSearch.trim()
      ? categoryItems.filter(i => i.name.toLowerCase().includes(catSearch.toLowerCase()))
      : categoryItems;

    // Regroup after filter
    const filteredByLetter = {};
    filteredItems.forEach(item => {
      const letter = item.name[0]?.toUpperCase() || '#';
      if (!filteredByLetter[letter]) filteredByLetter[letter] = [];
      filteredByLetter[letter].push(item);
    });
    const filteredLetters = Object.keys(filteredByLetter).sort();

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setView('home')}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '8px', cursor: 'pointer', color: '#fff', display: 'flex' }}
          >
            <ArrowLeft size={18} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
            <span style={{ fontSize: '1.4rem' }}>{cat.icon}</span>
            <div>
              <div style={{ fontFamily: 'var(--font-title)', fontSize: '1.05rem', fontWeight: 800 }}>{cat.label}</div>
              <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{categoryItems.length} item{categoryItems.length !== 1 ? 's' : ''}</div>
            </div>
          </div>
          <button
            onClick={() => { setSelectedCategory(view); setShowAddSheet(true); }}
            className="solid-btn"
            style={{ width: 'auto', padding: '8px 14px', borderRadius: '12px', fontSize: '0.8rem' }}
          >
            <Plus size={15} /> Add
          </button>
        </div>

        {/* Search within category */}
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder={`Search in ${cat.label}...`}
            value={catSearch}
            onChange={e => setCatSearch(e.target.value)}
            className="input-element"
            style={{ paddingLeft: '36px', paddingRight: catSearch ? '36px' : '12px', padding: '10px 12px 10px 36px' }}
          />
          {catSearch && (
            <button onClick={() => setCatSearch('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
              <X size={13} />
            </button>
          )}
        </div>

        {/* Alphabet index strip */}
        {!catSearch && letters.length > 1 && (
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', marginRight: '4px', alignSelf: 'center' }}>JUMP:</span>
            {letters.map(l => (
              <button
                key={l}
                onClick={() => scrollToLetter(l)}
                style={{
                  background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
                  borderRadius: '6px', padding: '3px 8px', fontSize: '0.72rem', fontWeight: 800,
                  color: '#a5b4fc', cursor: 'pointer', minWidth: '28px', textAlign: 'center'
                }}
              >
                {l}
              </button>
            ))}
          </div>
        )}

        {/* Empty state */}
        {filteredItems.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 20px', color: '#64748b', fontSize: '0.82rem' }}>
            {catSearch ? `No items match "${catSearch}"` : 'No items in this category yet'}
          </div>
        )}

        {/* Alphabetical item list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {filteredLetters.map(letter => (
            <div key={letter}>
              {/* Letter header */}
              <div
                ref={el => { letterRefs.current[letter] = el; }}
                style={{
                  fontSize: '0.68rem', fontWeight: 800, color: cat.color || '#6366f1',
                  padding: '10px 4px 4px', letterSpacing: '0.08em',
                  borderBottom: `1px solid ${cat.color || '#6366f1'}22`
                }}
              >
                {letter}
              </div>
              {filteredByLetter[letter].map(item => renderItemRow(item, item.originalIndex))}
            </div>
          ))}
        </div>

        {/* Bottom padding for FAB */}
        <div style={{ height: '16px' }} />
      </div>
    );
  };

  // ── Shared item row renderer ───────────────────────────────────────────────
  const renderItemRow = (item, idx) => (
    <div
      key={idx}
      onClick={() => onToggleItem(idx)}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '11px 12px',
        background: item.checked ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: '12px', cursor: 'pointer',
        opacity: item.checked ? 0.5 : 1,
        transition: 'opacity 0.2s', marginTop: '4px'
      }}
    >
      {item.checked
        ? <CheckCircle size={18} style={{ color: '#10b981', flexShrink: 0 }} />
        : <Circle size={18} style={{ color: '#475569', flexShrink: 0 }} />}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.88rem', fontWeight: 700, textDecoration: item.checked ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.name}
        </div>
        <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>
          {getStoreEmoji(item.store || '')} {item.store || 'Walmart'}
          {view === 'home' && (
            <span style={{ marginLeft: '6px', color: CATEGORIES[item.category]?.color || '#9ca3af' }}>
              · {CATEGORIES[item.category || 'other']?.icon} {CATEGORIES[item.category || 'other']?.label}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
        <button onClick={e => { e.stopPropagation(); openEditor(idx); }}
          style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: '4px' }}>
          <Edit2 size={13} />
        </button>
        <button onClick={e => { e.stopPropagation(); onDeleteItem(idx); }}
          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}>
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ paddingBottom: '16px' }}>
      {view === 'home' ? renderHome() : renderCategory()}

      {/* ── ADD ITEM BOTTOM SHEET ───────────────────────────────────────── */}
      {showAddSheet && (
        <div className="drawer-overlay" onClick={() => setShowAddSheet(false)}>
          <div className="drawer-sheet" onClick={e => e.stopPropagation()}>
            <div className="drawer-drag-handle" />
            <div className="drawer-header">
              <h3><Plus size={16} className="text-primary" /> Add Item</h3>
              <button onClick={() => setShowAddSheet(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Autocomplete */}
              {getSuggestions().length > 0 && (
                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '6px' }}>⚡ QUICK ADD</div>
                  <div className="cat-chips-scroll">
                    {getSuggestions().map((sug, i) => (
                      <div key={i} onClick={() => {
                        onAddItem({ name: sug.name, checked: false, store: sug.store, category: sug.category });
                        showToast?.(`"${sug.name}" added ✓`);
                        setNewItem('');
                        try { confetti({ particleCount: 15, spread: 25, origin: { y: 0.8 }, colors: ['#6366f1', '#10b981'] }); } catch (_) {}
                      }} className="cat-chip" style={{ background: 'rgba(99,102,241,0.08)', borderColor: 'rgba(99,102,241,0.25)', fontSize: '0.78rem', padding: '8px 12px' }}>
                        <span>{CATEGORIES[sug.category]?.icon}</span>
                        <span>{sug.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Input */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text" placeholder="Item name..."
                  value={newItem} onChange={e => setNewItem(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { handleAdd(); } }}
                  className="input-element" style={{ flex: 1 }} autoFocus
                />
                <button onClick={() => { setShowScanner(true); setShowAddSheet(false); startCamera(); }} className="outline-btn" style={{ width: 'auto', padding: '12px' }}>
                  <Camera size={18} />
                </button>
              </div>

              {/* Category selector */}
              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--slate-text)', display: 'block', marginBottom: '6px' }}>CATEGORY</label>
                <div className="cat-chips-scroll" style={{ paddingBottom: '4px' }}>
                  {Object.entries(CATEGORIES).map(([key, val]) => (
                    <div
                      key={key}
                      onClick={() => setSelectedCategory(key)}
                      className={`cat-chip ${selectedCategory === key ? 'selected' : ''}`}
                      style={{ padding: '6px 12px', fontSize: '0.72rem', borderColor: selectedCategory === key ? val.color : 'rgba(255,255,255,0.08)', background: selectedCategory === key ? `${val.color}20` : 'rgba(255,255,255,0.03)' }}
                    >
                      <span>{val.icon}</span><span>{val.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Store selector */}
              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--slate-text)', display: 'block', marginBottom: '6px' }}>STORE</label>
                {!showNewStore ? (
                  <div className="cat-chips-scroll" style={{ paddingBottom: '4px' }}>
                    {allStores.map(store => (
                      <div key={store} onClick={() => setSelectedStore(store)} className={`cat-chip ${selectedStore === store ? 'selected' : ''}`}
                        style={{ padding: '6px 12px', fontSize: '0.72rem', borderColor: selectedStore === store ? '#6366f1' : 'rgba(255,255,255,0.08)', background: selectedStore === store ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)' }}>
                        {getStoreEmoji(store)} {store}
                      </div>
                    ))}
                    <div onClick={() => setShowNewStore(true)} className="cat-chip" style={{ padding: '6px 12px', fontSize: '0.72rem', borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: '#a5b4fc' }}>
                      ➕ New store
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="text" placeholder="Store name..." value={newStoreVal} onChange={e => setNewStoreVal(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { if (newStoreVal.trim()) { onAddCustomStore(newStoreVal.trim()); setSelectedStore(newStoreVal.trim()); } setShowNewStore(false); setNewStoreVal(''); }}}
                      className="input-element" style={{ flex: 1, padding: '8px' }} autoFocus />
                    <button onClick={() => { if (newStoreVal.trim()) { onAddCustomStore(newStoreVal.trim()); setSelectedStore(newStoreVal.trim()); } setShowNewStore(false); setNewStoreVal(''); }}
                      className="solid-btn" style={{ width: 'auto', padding: '8px 12px' }}><Check size={14} /></button>
                    <button onClick={() => { setShowNewStore(false); setNewStoreVal(''); }} className="outline-btn" style={{ width: 'auto', padding: '8px' }}><X size={14} /></button>
                  </div>
                )}
              </div>

              <button onClick={() => { handleAdd(); if (newItem.trim()) setShowAddSheet(false); }} className="solid-btn" style={{ marginTop: '4px' }}>
                <Plus size={18} /> Add to List
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT MODAL ─────────────────────────────────────────────────────── */}
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
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveEdit(); }}
                  className="input-element" autoFocus />
              </div>
              <div className="input-group">
                <label>Category</label>
                <div className="cat-chips-scroll" style={{ paddingBottom: '4px' }}>
                  {Object.entries(CATEGORIES).map(([key, val]) => (
                    <div key={key} onClick={() => setEditCategory(key)} className={`cat-chip ${editCategory === key ? 'selected' : ''}`}
                      style={{ padding: '6px 10px', fontSize: '0.7rem', borderColor: editCategory === key ? val.color : 'rgba(255,255,255,0.08)', background: editCategory === key ? `${val.color}20` : 'rgba(255,255,255,0.03)' }}>
                      {val.icon} {val.label}
                    </div>
                  ))}
                </div>
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label>Store</label>
                <div className="cat-chips-scroll" style={{ paddingBottom: '4px' }}>
                  {allStores.map(store => (
                    <div key={store} onClick={() => setEditStore(store)} className={`cat-chip ${editStore === store ? 'selected' : ''}`}
                      style={{ padding: '6px 10px', fontSize: '0.7rem', borderColor: editStore === store ? '#6366f1' : 'rgba(255,255,255,0.08)', background: editStore === store ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)' }}>
                      {getStoreEmoji(store)} {store}
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={() => {
                if (editingIndex === 'scanned') {
                  onAddItem({ name: editName.trim(), checked: false, store: editStore, category: editCategory });
                  showToast?.(`"${editName}" added ✓`);
                  try { confetti({ particleCount: 60, spread: 50, origin: { y: 0.85 }, colors: ['#6366f1', '#10b981'] }); } catch (_) {}
                } else { saveEdit(); }
                setEditingIndex(null);
              }} className="solid-btn" style={{ marginTop: '4px' }}>
                <Check size={18} /> {editingIndex === 'scanned' ? 'Confirm & Add' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CAMERA SCANNER MODAL ───────────────────────────────────────────── */}
      {showScanner && (
        <div className="drawer-overlay" onClick={() => { stopCamera(); setShowScanner(false); }}>
          <div className="drawer-sheet" onClick={e => e.stopPropagation()}>
            <div className="drawer-drag-handle" />
            <div className="drawer-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Camera size={18} className="text-primary" /> Scan Item</h3>
              <button onClick={() => { stopCamera(); setShowScanner(false); }} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            {!isProcessing ? (
              <div>
                {!cameraError ? (
                  <div className="scanner-viewport">
                    <video ref={videoRef} autoPlay playsInline muted className="scanner-video" />
                    <div className="scanner-grid-box" /><div className="scanner-laser-line" />
                  </div>
                ) : (
                  <div className="scanner-viewport" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', borderRadius: '12px', padding: '24px' }}>
                    <Camera size={32} className="text-primary" />
                    <p style={{ fontSize: '0.8rem', fontWeight: 700 }}>Camera Blocked</p>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                  {streamActive && <button onClick={handleScanCapture} className="solid-btn" style={{ flex: 2 }}><Camera size={18} /> Capture</button>}
                  <button onClick={() => fileInputRef.current?.click()} className="outline-btn" style={{ flex: 1 }}>Upload</button>
                  <input ref={fileInputRef} type="file" accept="image/*"
                    onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => processObjectImage(r.result.split(',')[1]); r.readAsDataURL(f); e.target.value = ''; }}
                    style={{ display: 'none' }} />
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', gap: '14px' }}>
                <div className="loading-ring" style={{ width: '36px', height: '36px', borderTopColor: '#6366f1' }} />
                <p style={{ fontSize: '0.82rem', fontWeight: 700 }}>{statusMessage}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
