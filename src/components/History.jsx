import React, { useState } from 'react';
import { CATEGORIES } from '../utils/parser';
import { Search, Calendar, ChevronDown, ChevronUp, Trash2, Tag, ShoppingCart } from 'lucide-react';

export default function History({ 
  expenses, onDelete, viewMode, setViewMode, activeCategoryFilter, setActiveCategoryFilter 
}) {
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [dateFilter, setDateFilter] = useState('all'); // 'all', 'week', 'month'

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Helper to determine if date matches the selected range
  const matchesDateFilter = (dateStr) => {
    if (dateFilter === 'all') return true;
    
    const purchaseDate = new Date(dateStr);
    const now = new Date();
    
    if (dateFilter === 'week') {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return purchaseDate >= sevenDaysAgo;
    }
    
    if (dateFilter === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return purchaseDate >= startOfMonth;
    }
    
    return true;
  };

  // 1. FILTER RECEIPTS LOGIC (Overall bills view)
  const filteredExpenses = expenses.filter(exp => {
    const matchesSearch = 
      exp.merchant.toLowerCase().includes(search.toLowerCase()) ||
      exp.items.some(item => item.name.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory = 
      activeCategoryFilter === 'all' ||
      exp.items.some(item => item.category === activeCategoryFilter);

    const dateMatch = matchesDateFilter(exp.date);

    return matchesSearch && matchesCategory && dateMatch;
  });

  // 2. TIMELINE DRILL-DOWN LOGIC (Individual category items view across all history!)
  const getAllCategoryItems = () => {
    let itemsList = [];
    expenses.forEach(exp => {
      exp.items.forEach(item => {
        const matchesSearch = 
          item.name.toLowerCase().includes(search.toLowerCase()) ||
          exp.merchant.toLowerCase().includes(search.toLowerCase());

        const matchesCategory = item.category === activeCategoryFilter;

        const dateMatch = matchesDateFilter(exp.date);

        if (matchesSearch && matchesCategory && dateMatch) {
          itemsList.push({
            id: exp.id + '_' + item.name + '_' + item.amount,
            receiptId: exp.id,
            date: exp.date,
            merchant: exp.merchant,
            name: item.name,
            amount: item.amount,
            category: item.category
          });
        }
      });
    });

    return itemsList.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const itemTimeline = getAllCategoryItems();

  return (
    <div className="history-view" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      
      {/* Search Input Bar */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          type="text"
          placeholder={viewMode === 'receipts' ? "Search store or items..." : "Search items..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-element"
          style={{ width: '100%', paddingLeft: '40px' }}
        />
        <Search size={18} style={{ position: 'absolute', left: '14px', color: '#64748b' }} />
      </div>

      {/* Date Range Selector Pill Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '2px' }}>
        {['all', 'week', 'month'].map(period => (
          <button
            type="button"
            key={period}
            onClick={() => setDateFilter(period)}
            style={{
              flex: 1,
              padding: '8px 10px',
              borderRadius: '10px',
              border: '1.5px solid',
              borderColor: dateFilter === period ? 'var(--primary)' : 'rgba(255,255,255,0.06)',
              background: dateFilter === period ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255,255,255,0.02)',
              color: dateFilter === period ? '#fff' : '#64748b',
              fontWeight: 700,
              fontSize: '0.72rem',
              cursor: 'pointer',
              textTransform: 'uppercase',
              transition: 'all 0.2s ease'
            }}
          >
            {period === 'all' ? '🗓️ All Time' : period === 'week' ? '⚡ This Week' : '📅 This Month'}
          </button>
        ))}
      </div>

      {/* Sliding View Toggle (Store Receipts vs. Item Category Timelines) */}
      <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
        <button
          type="button"
          onClick={() => {
            setViewMode('receipts');
            setActiveCategoryFilter('all');
          }}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: '12px',
            border: 'none',
            background: viewMode === 'receipts' ? 'rgba(255,255,255,0.08)' : 'transparent',
            color: viewMode === 'receipts' ? '#fff' : '#64748b',
            fontWeight: 700,
            fontSize: '0.8rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          🧾 View Receipts
        </button>
        <button
          type="button"
          onClick={() => {
            setViewMode('items');
            if (activeCategoryFilter === 'all') {
              setActiveCategoryFilter('vegetables');
            }
          }}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: '12px',
            border: 'none',
            background: viewMode === 'items' ? 'rgba(255,255,255,0.08)' : 'transparent',
            color: viewMode === 'items' ? '#fff' : '#64748b',
            fontWeight: 700,
            fontSize: '0.8rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          🥦 View Items Timeline
        </button>
      </div>

      {/* Horizontal Filter Categories Scroll */}
      <div className="cat-chips-scroll" style={{ paddingBottom: '4px' }}>
        {viewMode === 'receipts' && (
          <div
            onClick={() => setActiveCategoryFilter('all')}
            className={`cat-chip ${activeCategoryFilter === 'all' ? 'selected' : ''}`}
            style={{
              borderColor: activeCategoryFilter === 'all' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.08)',
              background: activeCategoryFilter === 'all' ? 'var(--primary-glow)' : 'rgba(255, 255, 255, 0.04)'
            }}
          >
            <span>📦</span>
            <span>All Sectors</span>
          </div>
        )}
        
        {Object.entries(CATEGORIES).map(([key, value]) => {
          if (viewMode === 'items' && key === 'other') return null;
          
          return (
            <div
              key={key}
              onClick={() => setActiveCategoryFilter(key)}
              className={`cat-chip ${activeCategoryFilter === key ? 'selected' : ''}`}
              style={{
                borderColor: activeCategoryFilter === key ? value.color : 'rgba(255, 255, 255, 0.08)',
                background: activeCategoryFilter === key ? `${value.color}20` : 'rgba(255, 255, 255, 0.04)'
              }}
            >
              <span>{value.icon}</span>
              <span>{value.label}</span>
            </div>
          );
        })}
      </div>

      {/* ================= MODE A: OVERALL RECEIPTS CARD VIEW ================= */}
      {viewMode === 'receipts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredExpenses.length > 0 ? (
            filteredExpenses.map((exp) => {
              const isExpanded = expandedId === exp.id;
              const dominantCat = exp.items[0]?.category || 'other';
              const catIcon = CATEGORIES[dominantCat]?.icon || '📦';
              const catColor = CATEGORIES[dominantCat]?.color || '#9ca3af';

              return (
                <div 
                  key={exp.id} 
                  className="glass-card" 
                  style={{ 
                    padding: '16px', 
                    marginBottom: 0,
                    borderLeft: `4px solid ${catColor}`,
                    cursor: 'pointer'
                  }}
                  onClick={() => toggleExpand(exp.id)}
                >
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="transaction-info">
                      <div className="transaction-icon" style={{ fontSize: '1.2rem' }}>
                        {catIcon}
                      </div>
                      <div className="transaction-meta">
                        <h4>{exp.merchant}</h4>
                        <p style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={12} /> {exp.date}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div className="transaction-price" style={{ color: exp.isGasMeter ? '#fbbf24' : '#fff' }}>
                          ${exp.amount.toFixed(2)}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>
                          {exp.items.length} {exp.items.length === 1 ? 'item' : 'items'}
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp size={16} className="text-slate-text" /> : <ChevronDown size={16} className="text-slate-text" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div 
                      style={{ 
                        marginTop: '16px', 
                        paddingTop: '16px', 
                        borderTop: '1px solid rgba(255, 255, 255, 0.06)'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Tag size={12} /> ITEM SPLITS
                        </span>
                        
                        {exp.items.map((item, idx) => {
                          const itemCat = CATEGORIES[item.category || 'other'] || CATEGORIES.other;
                          return (
                            <div 
                              key={idx} 
                              style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '8px 10px',
                                background: 'rgba(255, 255, 255, 0.02)',
                                border: '1px solid rgba(255, 255, 255, 0.04)',
                                borderRadius: '10px'
                              }}
                            >
                              <span style={{ fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>{itemCat.icon}</span>
                                <span>{item.name}</span>
                              </span>
                              <span style={{ fontFamily: 'var(--font-title)', fontSize: '0.85rem', fontWeight: 700 }}>
                                ${item.amount.toFixed(2)}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => onDelete(exp.id)}
                          className="outline-btn"
                          style={{ 
                            padding: '6px 12px', 
                            fontSize: '0.75rem', 
                            color: '#ef4444', 
                            borderColor: 'rgba(239, 68, 68, 0.15)',
                            background: 'rgba(239, 68, 68, 0.05)',
                            width: 'auto',
                            borderRadius: '8px'
                          }}
                        >
                          <Trash2 size={12} /> Delete Record
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
              <p style={{ fontSize: '0.85rem' }}>No expenses found matching filters.</p>
            </div>
          )}
        </div>
      )}

      {/* ================= MODE B: CATEGORIZED ITEMIZED TIMELINE VIEW ================= */}
      {viewMode === 'items' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="tip-banner" style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px dashed rgba(255,255,255,0.08)', marginBottom: 4 }}>
            <Tag size={16} style={{ color: CATEGORIES[activeCategoryFilter]?.color }} />
            <div>
              Showing timeline of all individual items purchased under <strong>{CATEGORIES[activeCategoryFilter]?.label}</strong>.
            </div>
          </div>

          {itemTimeline.length > 0 ? (
            itemTimeline.map((item) => (
              <div 
                key={item.id} 
                className="glass-card" 
                style={{ 
                  padding: '14px 16px', 
                  marginBottom: 0,
                  borderLeft: `4px solid ${CATEGORIES[activeCategoryFilter]?.color}` 
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '0.92rem', fontWeight: 750, color: '#fff' }}>
                      {item.name}
                    </span>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', color: 'var(--slate-text)', fontWeight: 500 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <Calendar size={10} /> {item.date}
                      </span>
                      <span>•</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <ShoppingCart size={10} /> {item.merchant}
                      </span>
                    </div>
                  </div>

                  <span style={{ fontFamily: 'var(--font-title)', fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>
                    ${item.amount.toFixed(2)}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
              <p style={{ fontSize: '0.85rem' }}>No individual {CATEGORIES[activeCategoryFilter]?.label.toLowerCase()} items found.</p>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
