import React, { useState } from 'react';
import { CATEGORIES } from '../utils/parser';
import { Search, Calendar, ChevronDown, ChevronUp, Trash2, Tag, ShoppingCart } from 'lucide-react';
import EmptyState from './EmptyState';

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

  // Per-item price history (YNAB-style "historical context inline", applied at the
  // item level — SmartSpend's grocery-intelligence differentiator). All-time stats
  // per item name within the active category, deliberately ignoring the search/date
  // filters so the range reflects the item's true purchase history.
  const itemPriceStats = (() => {
    if (viewMode !== 'items') return {};
    const stats = {};
    expenses.forEach((exp) => {
      exp.items.forEach((item) => {
        if (item.category !== activeCategoryFilter) return;
        const key = (item.name || '').trim().toLowerCase();
        if (!key) return;
        const amt = item.amount || 0;
        if (!stats[key]) {
          stats[key] = { count: 1, min: amt, max: amt, sum: amt, dateSet: new Set([exp.date]) };
        } else {
          stats[key].count += 1;
          stats[key].min = Math.min(stats[key].min, amt);
          stats[key].max = Math.max(stats[key].max, amt);
          stats[key].sum += amt;
          stats[key].dateSet.add(exp.date);
        }
      });
    });
    // Restock cadence (Monarch-style recurring detection, applied per grocery item):
    // with 3+ distinct purchase dates, the typical gap (median, in days) tells us
    // how often the user usually rebuys the item. Median >= 2 days avoids noise
    // from same-week top-ups.
    Object.values(stats).forEach((s) => {
      const days = [...s.dateSet]
        .map((d) => new Date(d).setHours(0, 0, 0, 0))
        .filter((t) => !isNaN(t))
        .sort((a, b) => a - b);
      if (days.length >= 3) {
        const gaps = [];
        for (let i = 1; i < days.length; i++) gaps.push((days[i] - days[i - 1]) / 86400000);
        gaps.sort((a, b) => a - b);
        const mid = Math.floor(gaps.length / 2);
        const median = gaps.length % 2 ? gaps[mid] : (gaps[mid - 1] + gaps[mid]) / 2;
        if (median >= 2) {
          s.cadenceDays = Math.round(median);
          s.latestDay = days[days.length - 1];
        }
      }
    });
    return stats;
  })();

  // Summary of the currently-filtered set (Monarch-style "total of what you're viewing").
  // Receipts: full spend when "all", else only the selected category's item amounts.
  const receiptsTotal = filteredExpenses.reduce((sum, exp) => {
    if (activeCategoryFilter === 'all') return sum + (exp.amount || 0);
    return sum + exp.items
      .filter((item) => item.category === activeCategoryFilter)
      .reduce((s, item) => s + (item.amount || 0), 0);
  }, 0);
  const itemsTotal = itemTimeline.reduce((sum, item) => sum + (item.amount || 0), 0);
  const summaryCount = viewMode === 'receipts' ? filteredExpenses.length : itemTimeline.length;
  const summaryTotal = viewMode === 'receipts' ? receiptsTotal : itemsTotal;
  const summaryNoun = viewMode === 'receipts'
    ? (summaryCount === 1 ? 'receipt' : 'receipts')
    : (summaryCount === 1 ? 'item' : 'items');
  const rangeLabel = dateFilter === 'week' ? 'This week' : dateFilter === 'month' ? 'This month' : 'All time';

  // "vs last period" comparison (Monarch/Rocket Money-style) — This Month vs the
  // previous calendar month, This Week vs the previous 7 days — honoring the same
  // search + category filters as the visible total.
  const prevPeriodTotal = (() => {
    if (dateFilter !== 'month' && dateFilter !== 'week') return null;
    let start, end;
    if (dateFilter === 'month') {
      const now = new Date();
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      // "This Week" is a rolling last-7-days window, so compare to the 7 days before it.
      end = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      start = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    }
    const inPrevPeriod = (dateStr) => {
      const d = new Date(dateStr);
      return d >= start && d < end;
    };
    const q = search.toLowerCase();
    if (viewMode === 'receipts') {
      return expenses.reduce((sum, exp) => {
        if (!inPrevPeriod(exp.date)) return sum;
        const matchesSearch =
          exp.merchant.toLowerCase().includes(q) ||
          exp.items.some((item) => item.name.toLowerCase().includes(q));
        const matchesCategory =
          activeCategoryFilter === 'all' ||
          exp.items.some((item) => item.category === activeCategoryFilter);
        if (!matchesSearch || !matchesCategory) return sum;
        if (activeCategoryFilter === 'all') return sum + (exp.amount || 0);
        return sum + exp.items
          .filter((item) => item.category === activeCategoryFilter)
          .reduce((s, item) => s + (item.amount || 0), 0);
      }, 0);
    }
    let total = 0;
    expenses.forEach((exp) => {
      if (!inPrevPeriod(exp.date)) return;
      exp.items.forEach((item) => {
        const matchesSearch =
          item.name.toLowerCase().includes(q) ||
          exp.merchant.toLowerCase().includes(q);
        if (matchesSearch && item.category === activeCategoryFilter) {
          total += item.amount || 0;
        }
      });
    });
    return total;
  })();
  const periodDelta = prevPeriodTotal !== null && prevPeriodTotal > 0 ? summaryTotal - prevPeriodTotal : null;
  const compareLabel = dateFilter === 'week' ? 'the week before' : 'last month';

  // Month-over-month mini trend (Monarch-style, All-time view only — the one range
  // with no "vs last period" line): totals for the last 6 calendar months, honoring
  // the same search + category filters as the visible total. Hidden unless 2+ months
  // have spend, so a brand-new ledger doesn't show a one-bar "trend".
  const monthTrend = (() => {
    if (dateFilter !== 'all') return null;
    const now = new Date();
    const q = search.toLowerCase();
    const buckets = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({ y: d.getFullYear(), m: d.getMonth(), label: d.toLocaleString('en-US', { month: 'short' }), total: 0 });
    }
    expenses.forEach((exp) => {
      const d = new Date(exp.date);
      if (isNaN(d)) return;
      const b = buckets.find((bk) => bk.y === d.getFullYear() && bk.m === d.getMonth());
      if (!b) return;
      if (viewMode === 'receipts') {
        const matchesSearch =
          exp.merchant.toLowerCase().includes(q) ||
          exp.items.some((item) => item.name.toLowerCase().includes(q));
        const matchesCategory =
          activeCategoryFilter === 'all' ||
          exp.items.some((item) => item.category === activeCategoryFilter);
        if (!matchesSearch || !matchesCategory) return;
        b.total += activeCategoryFilter === 'all'
          ? (exp.amount || 0)
          : exp.items
              .filter((item) => item.category === activeCategoryFilter)
              .reduce((s, item) => s + (item.amount || 0), 0);
      } else {
        exp.items.forEach((item) => {
          const matchesSearch =
            item.name.toLowerCase().includes(q) ||
            exp.merchant.toLowerCase().includes(q);
          if (matchesSearch && item.category === activeCategoryFilter) b.total += item.amount || 0;
        });
      }
    });
    const max = Math.max(...buckets.map((b) => b.total));
    if (max <= 0 || buckets.filter((b) => b.total > 0).length < 2) return null;
    return { buckets, max };
  })();

  // Empty-state context: tell "no data yet" apart from "no matches", and offer a one-tap reset.
  const hasAnyData = expenses.length > 0;
  const receiptsFiltersActive = search.trim() !== '' || dateFilter !== 'all' || activeCategoryFilter !== 'all';
  const itemsFiltersActive = search.trim() !== '' || dateFilter !== 'all';
  const activeCatLabel = CATEGORIES[activeCategoryFilter]?.label || 'these';
  const clearFilters = () => {
    setSearch('');
    setDateFilter('all');
    if (viewMode === 'receipts') setActiveCategoryFilter('all');
  };

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
        <Search size={18} style={{ position: 'absolute', left: '14px', color: '#5A6270' }} />
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
              background: dateFilter === period ? 'rgba(169, 155, 250, 0.08)' : 'rgba(255,255,255,0.02)',
              color: dateFilter === period ? '#fff' : '#5A6270',
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
            color: viewMode === 'receipts' ? '#fff' : '#5A6270',
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
            color: viewMode === 'items' ? '#fff' : '#5A6270',
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

      {/* Filtered totals summary — reflects search + date range + category (Monarch-style) */}
      {summaryCount > 0 && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          padding: '12px 16px',
          borderRadius: '14px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)'
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--slate-text)' }}>
              {rangeLabel}
              {viewMode === 'receipts' && activeCategoryFilter !== 'all' ? ` · ${CATEGORIES[activeCategoryFilter]?.label}` : ''}
            </span>
            <span style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontFamily: 'var(--font-title)', fontSize: '1.15rem', fontWeight: 800, color: 'var(--white-text)' }}>
                ${summaryTotal.toFixed(2)}
              </span>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--slate-text)' }}>
                {summaryCount} {summaryNoun}
              </span>
            </span>
          </div>
          {periodDelta !== null && (
            <div style={{
              fontSize: '0.72rem',
              fontWeight: 600,
              color: Math.abs(periodDelta) < 0.5 ? 'var(--slate-text)' : periodDelta < 0 ? '#34D399' : '#EF9F27'
            }}>
              {Math.abs(periodDelta) < 0.5
                ? `About the same as ${compareLabel}`
                : periodDelta < 0
                  ? `▼ $${Math.abs(periodDelta).toFixed(2)} less than ${compareLabel}`
                  : `▲ $${periodDelta.toFixed(2)} more than ${compareLabel}`}
            </div>
          )}
          {monthTrend && (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', paddingTop: '6px' }}>
              {monthTrend.buckets.map((b, i) => {
                const isCurrent = i === monthTrend.buckets.length - 1;
                return (
                  <div key={`${b.y}-${b.m}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <div
                      title={`${b.label}: $${b.total.toFixed(2)}`}
                      style={{
                        width: '100%',
                        height: `${Math.max(3, Math.round((b.total / monthTrend.max) * 34))}px`,
                        borderRadius: '3px',
                        background: isCurrent ? '#A99BFA' : b.total > 0 ? 'rgba(169, 155, 250, 0.28)' : 'rgba(255, 255, 255, 0.06)'
                      }}
                    />
                    <span style={{ fontSize: '0.58rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.03em', color: isCurrent ? '#8A93A0' : '#5A6270' }}>
                      {b.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

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
                        <div className="transaction-price" style={{ color: exp.isGasMeter ? '#f59e0b' : '#fff' }}>
                          ${exp.amount.toFixed(2)}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#5A6270', fontWeight: 600 }}>
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
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#5A6270', display: 'flex', alignItems: 'center', gap: '4px' }}>
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
                            color: '#f43f5e', 
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
            <EmptyState
              icon={hasAnyData ? <Search size={22} /> : <ShoppingCart size={22} />}
              title={hasAnyData ? 'No receipts match your filters' : 'No expenses yet'}
              message={hasAnyData
                ? 'Try a different search, date range, or category.'
                : 'Scan a receipt or add an expense to start tracking your spending.'}
              showClear={hasAnyData && receiptsFiltersActive}
              onClear={clearFilters}
            />
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
            itemTimeline.map((item) => {
              const stats = itemPriceStats[(item.name || '').trim().toLowerCase()];
              const priceHistory = stats && stats.count > 1
                ? (stats.max - stats.min < 0.005
                    ? `Bought ${stats.count}× · always $${stats.min.toFixed(2)}`
                    : `Bought ${stats.count}× · avg $${(stats.sum / stats.count).toFixed(2)} · $${stats.min.toFixed(2)}–$${stats.max.toFixed(2)}`)
                : null;
              // Price-book flag (GroceryTrack-style): mark when THIS purchase is the
              // highest/lowest the user has ever paid for the item. Only when the
              // price actually varies, so "always $X" rows stay clean.
              const priceVaries = stats && stats.count > 1 && stats.max - stats.min >= 0.005;
              const priceFlag = priceVaries && Math.abs(item.amount - stats.max) < 0.005
                ? { text: '▲ highest you’ve paid', color: '#EF9F27' }
                : priceVaries && Math.abs(item.amount - stats.min) < 0.005
                  ? { text: '▼ lowest you’ve paid', color: '#34D399' }
                  : null;
              // Restock line — only on the item's most recent purchase row, so the
              // cadence reads once per item instead of repeating down the timeline.
              const restock = (() => {
                if (!stats || stats.cadenceDays == null) return null;
                const rowDay = new Date(item.date).setHours(0, 0, 0, 0);
                if (isNaN(rowDay) || rowDay !== stats.latestDay) return null;
                const daysSince = Math.round((new Date().setHours(0, 0, 0, 0) - stats.latestDay) / 86400000);
                if (daysSince < 0) return null;
                const ago = daysSince === 0 ? 'today' : daysSince === 1 ? 'yesterday' : `${daysSince} days ago`;
                return {
                  text: `Usually every ~${stats.cadenceDays} days · last bought ${ago}`,
                  due: daysSince > stats.cadenceDays
                };
              })();

              return (
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

                    {priceHistory && (
                      <span style={{ fontSize: '0.68rem', color: '#5A6270', fontWeight: 500 }}>
                        {priceHistory}
                        {priceFlag && (
                          <span style={{ color: priceFlag.color, fontWeight: 500 }}>
                            {' · '}{priceFlag.text}
                          </span>
                        )}
                      </span>
                    )}

                    {restock && (
                      <span style={{ fontSize: '0.68rem', fontWeight: 500, color: restock.due ? '#A99BFA' : '#5A6270' }}>
                        {restock.text}
                        {restock.due ? ' · may be due for a restock' : ''}
                      </span>
                    )}
                  </div>

                  <span style={{ fontFamily: 'var(--font-title)', fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>
                    ${item.amount.toFixed(2)}
                  </span>
                </div>
              </div>
              );
            })
          ) : (
            <EmptyState
              icon={hasAnyData && itemsFiltersActive ? <Search size={22} /> : <ShoppingCart size={22} />}
              title={!hasAnyData
                ? 'No items yet'
                : itemsFiltersActive
                  ? `No ${activeCatLabel} items match your filters`
                  : `No ${activeCatLabel} items yet`}
              message={!hasAnyData
                ? 'Scan a receipt or add an expense to build your item history.'
                : itemsFiltersActive
                  ? 'Try a different search or date range.'
                  : `Items you buy under ${activeCatLabel} will show up here.`}
              showClear={hasAnyData && itemsFiltersActive}
              onClear={clearFilters}
            />
          )}
        </div>
      )}

    </div>
  );
}
