import React, { useState } from 'react';
import { CATEGORIES } from '../utils/parser';
import { X, Plus, Trash2, Check } from 'lucide-react';
import confetti from 'canvas-confetti';

// Preset grocery suggestions to help autocompletion
const GROCERY_SUGGESTIONS = [
  { name: 'Eggs', category: 'dairy' },
  { name: 'Milk 1 Gallon', category: 'dairy' },
  { name: 'Lays Chips', category: 'shopping' },
  { name: 'Organic Roma Tomatoes', category: 'vegetables' },
  { name: 'Fresh Gala Apples', category: 'fruits' },
  { name: 'Organic Bananas', category: 'fruits' },
  { name: 'Honey Wheat Bread', category: 'bakery' },
  { name: 'Premium Wheat Container', category: 'bakery' },
  { name: 'Halal Chicken', category: 'meat' },
  { name: 'Fresh Atlantic Salmon', category: 'meat' },
  { name: 'Cheddar Cheese', category: 'dairy' },
  { name: 'Butter', category: 'dairy' },
  { name: 'Rice Bag', category: 'bakery' },
  { name: 'Shampoo', category: 'shopping' },
  { name: 'Soap Bar', category: 'shopping' },
  { name: 'Toilet Paper 24-pack', category: 'shopping' },
  { name: 'Coffee Beans', category: 'dining' },
  { name: 'Lipton Tea Bags', category: 'dining' },
  { name: 'Mineral Water Case', category: 'shopping' },
  { name: 'Soda Cans 12-pack', category: 'shopping' }
];

export default function ManualForm({ onClose, onSave, customStores = [], onAddCustomStore, customSuggestions = [], showToast }) {
  const [merchant, setMerchant] = useState('Walmart');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [focusedRowIndex, setFocusedRowIndex] = useState(null);
  const [showStoreInput, setShowStoreInput] = useState(false);
  const [newStoreVal, setNewStoreVal] = useState('');

  const confirmNewStore = () => {
    const clean = newStoreVal.trim();
    if (clean) {
      onAddCustomStore(clean);
      setMerchant(clean);
      if (showToast) showToast(`"${clean}" added as a store ✓`);
    }
    setShowStoreInput(false);
    setNewStoreVal('');
  };

  const getRowSuggestions = (typedText) => {
    if (!typedText || !typedText.trim()) return [];
    const query = typedText.toLowerCase().trim();
    
    const seen = new Set();
    const combined = [...GROCERY_SUGGESTIONS, ...customSuggestions];
    
    return combined.filter(sug => {
      if (!sug || !sug.name || typeof sug.name !== 'string') return false;
      const cleanName = sug.name.toLowerCase().trim();
      if (seen.has(cleanName)) return false;
      seen.add(cleanName);
      return cleanName.includes(query);
    }).slice(0, 5); // show top 5 matches
  };
  
  // Modes: 'simple' (total bill) or 'itemized' (line items)
  const [entryMode, setEntryMode] = useState('simple');
  
  // Simple Mode States
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('other');

  // Itemized Mode States
  const [items, setItems] = useState([
    { name: '', amount: '', category: 'vegetables' }
  ]);

  // Handle Quick Helpers
  const addQuickAmount = (val) => {
    if (entryMode === 'simple') {
      const current = parseFloat(amount) || 0;
      setAmount((current + val).toString());
    }
  };

  const handleAddItemRow = () => {
    setItems([...items, { name: '', amount: '', category: 'vegetables' }]);
  };

  const handleRemoveItemRow = (index) => {
    const updated = items.filter((_, idx) => idx !== index);
    setItems(updated.length > 0 ? updated : [{ name: '', amount: '', category: 'vegetables' }]);
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    let finalItems = [];
    const cleanMerchant = merchant.trim() || 'Manual Purchase';

    if (entryMode === 'simple') {
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) return;

      finalItems.push({
        name: cleanMerchant,
        amount: numAmount,
        category: selectedCategory
      });
    } else {
      // Filter out empty rows
      const validItems = items.filter(i => i.name.trim() && parseFloat(i.amount) > 0);
      if (validItems.length === 0) return;

      finalItems = validItems.map(i => ({
        name: i.name.trim(),
        amount: parseFloat(i.amount),
        category: i.category
      }));
    }

    // Save expense
    const totalAmount = finalItems.reduce((sum, item) => sum + item.amount, 0);
    
    onSave({
      id: Date.now().toString(),
      merchant: cleanMerchant,
      date: date,
      isGasMeter: false,
      amount: totalAmount,
      items: finalItems
    });

    if (showToast) showToast(`Expense saved — $${totalAmount.toFixed(2)} logged ✓`);

    // Celebration splash
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#6366f1', '#10b981', '#fbbf24', '#f43f5e']
      });
    } catch (err) {
      console.warn('Confetti blocked or failed:', err);
    }

    onClose();
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-drag-handle" />
        
        <div className="drawer-header">
          <h3>💰 Add Expense Manually</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Store Selection Dropdown */}
          <div className="input-group">
            <label>Store Name / Merchant</label>
            <select
              value={merchant}
              onChange={(e) => {
                if (e.target.value === 'ADD_NEW_STORE_TRIGGER') {
                  setShowStoreInput(true);
                  setNewStoreVal('');
                } else {
                  setMerchant(e.target.value);
                }
              }}
              className="input-element"
              style={{ background: '#0f172a' }}
            >
              {Array.from(new Set([...['Walmart', 'Costco', 'Lotte', 'Halal Store', 'Home Depot', 'Restaurant Depot'], ...customStores])).map(store => (
                <option key={store} value={store}>{store}</option>
              ))}
              <option value="ADD_NEW_STORE_TRIGGER">➕ Add New Store...</option>
            </select>

            {showStoreInput && (
              <div className="inline-store-row">
                <input
                  type="text"
                  placeholder="e.g. Trader Joe's, Whole Foods..."
                  value={newStoreVal}
                  onChange={e => setNewStoreVal(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); confirmNewStore(); }
                    if (e.key === 'Escape') { setShowStoreInput(false); }
                  }}
                  className="input-element"
                  style={{ flex: 1, padding: '8px 12px', fontSize: '0.78rem' }}
                  autoFocus
                />
                <button type="button" onClick={confirmNewStore} className="solid-btn"
                  style={{ width: 'auto', padding: '8px 12px', fontSize: '0.78rem', borderRadius: '10px' }}>
                  <Check size={14} />
                </button>
                <button type="button" onClick={() => setShowStoreInput(false)} className="outline-btn"
                  style={{ width: 'auto', padding: '8px 10px', fontSize: '0.78rem', borderRadius: '10px' }}>
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Date Picker */}
          <div className="input-group">
            <label>Transaction Date</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input-element"
            />
          </div>

          {/* Mode Switcher */}
          <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <button
              type="button"
              onClick={() => setEntryMode('simple')}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '10px',
                border: 'none',
                background: entryMode === 'simple' ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: entryMode === 'simple' ? '#fff' : '#64748b',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              Simple Total
            </button>
            <button
              type="button"
              onClick={() => setEntryMode('itemized')}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '10px',
                border: 'none',
                background: entryMode === 'itemized' ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: entryMode === 'itemized' ? '#fff' : '#64748b',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              Item Splits (Tomatoes, Milk, etc.)
            </button>
          </div>

          {/* MODE 1: SIMPLE AMOUNT & BROAD SECTOR */}
          {entryMode === 'simple' && (
            <>
              <div className="input-group">
                <label>Total Amount ($)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="input-element"
                  style={{ fontSize: '1.25rem', fontFamily: 'var(--font-title)', fontWeight: 800 }}
                />
              </div>

              {/* Quick Amount Helper Chips */}
              <div className="amount-helpers">
                <div className="helper-chip" onClick={() => addQuickAmount(5)}>+$5</div>
                <div className="helper-chip" onClick={() => addQuickAmount(10)}>+$10</div>
                <div className="helper-chip" onClick={() => addQuickAmount(20)}>+$20</div>
                <div className="helper-chip" onClick={() => addQuickAmount(50)}>+$50</div>
              </div>

              {/* Category Scroll Select */}
              <div className="input-group">
                <label>Select Sector</label>
                <div className="cat-chips-scroll">
                  {Object.entries(CATEGORIES).map(([key, value]) => (
                    <div
                      key={key}
                      onClick={() => setSelectedCategory(key)}
                      className={`cat-chip ${selectedCategory === key ? 'selected' : ''}`}
                      style={{
                        borderColor: selectedCategory === key ? value.color : 'rgba(255, 255, 255, 0.08)',
                        background: selectedCategory === key ? `${value.color}20` : 'rgba(255, 255, 255, 0.04)'
                      }}
                    >
                      <span>{value.icon}</span>
                      <span>{value.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* MODE 2: ITEMIZED SPLIT EXPENSES */}
          {entryMode === 'itemized' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--slate-text)' }}>Receipt Item Splitting</label>
              
              {items.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '18px' }}>
                  
                  {/* Card Header Row with sleek Remove Button */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Split #{idx + 1}</span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          handleRemoveItemRow(idx);
                          setFocusedRowIndex(null);
                        }}
                        style={{ 
                          background: 'rgba(239, 68, 68, 0.08)',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          color: '#f87171',
                          padding: '6px 10px',
                          borderRadius: '8px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={12} /> Remove
                      </button>
                    )}
                  </div>

                  {/* Row 1: Item Name */}
                  <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                    <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--slate-text)', letterSpacing: '0.05em' }}>ITEM NAME</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Tomatoes, Milk, Shampoo..."
                      value={item.name}
                      onChange={(e) => {
                        handleItemChange(idx, 'name', e.target.value);
                        setFocusedRowIndex(idx);
                      }}
                      onFocus={() => setFocusedRowIndex(idx)}
                      className="input-element"
                      style={{ width: '100%', padding: '10px', fontSize: '0.85rem' }}
                    />
                  </div>

                  {/* Suggestions Dropdown for this specific row */}
                  {focusedRowIndex === idx && getRowSuggestions(item.name).length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '6px 10px', background: 'rgba(99, 102, 241, 0.04)', border: '1px solid rgba(99, 102, 241, 0.15)', borderRadius: '10px', animation: 'fadeIn 0.2s ease-in' }}>
                      {getRowSuggestions(item.name).map((sug, sugIdx) => (
                        <div
                          key={sugIdx}
                          onClick={() => {
                            handleItemChange(idx, 'name', sug.name);
                            handleItemChange(idx, 'category', sug.category || 'other');
                            setFocusedRowIndex(null);
                          }}
                          className="cat-chip"
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            borderColor: 'rgba(255, 255, 255, 0.12)',
                            color: '#fff',
                            fontSize: '0.72rem',
                            padding: '4px 10px',
                            cursor: 'pointer'
                          }}
                        >
                          <span>{sug.name}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Row 2: Price (Full Width!) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                    <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--slate-text)', letterSpacing: '0.05em' }}>AMOUNT ($)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="any"
                      required
                      placeholder="0.00"
                      value={item.amount}
                      onChange={(e) => handleItemChange(idx, 'amount', e.target.value)}
                      className="input-element"
                      style={{ width: '100%', padding: '10px', fontSize: '0.85rem', fontFamily: 'var(--font-title)', fontWeight: 700 }}
                    />
                  </div>

                  {/* Horizontal small category selection chips for this item */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                    <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--slate-text)', letterSpacing: '0.05em' }}>SECTOR</label>
                    <div className="cat-chips-scroll" style={{ paddingBottom: 0 }}>
                      {Object.entries(CATEGORIES).map(([key, value]) => (
                        <div
                          key={key}
                          onClick={() => handleItemChange(idx, 'category', key)}
                          className={`cat-chip ${item.category === key ? 'selected' : ''}`}
                          style={{
                            padding: '6px 12px',
                            fontSize: '0.75rem',
                            borderColor: item.category === key ? value.color : 'rgba(255, 255, 255, 0.08)',
                            background: item.category === key ? `${value.color}20` : 'rgba(255, 255, 255, 0.04)'
                          }}
                        >
                          <span>{value.icon}</span>
                          <span>{value.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              ))}

              <button
                type="button"
                onClick={handleAddItemRow}
                className="outline-btn"
                style={{ padding: '8px', fontSize: '0.8rem', borderRadius: '12px', marginTop: '4px' }}
              >
                <Plus size={14} /> Add Another Item
              </button>
            </div>
          )}

          {/* Save trigger button */}
          <button 
            type="submit" 
            onClick={handleSubmit} 
            className="solid-btn" 
            style={{ marginTop: '10px' }}
          >
            <Check size={18} /> Save Transaction
          </button>
        </form>
      </div>
    </div>
  );
}
