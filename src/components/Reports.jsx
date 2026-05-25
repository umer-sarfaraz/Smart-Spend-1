import React, { useState, useMemo } from 'react';
import { CATEGORIES } from '../utils/parser';
import {
  BarChart2, ScrollText,
  ChevronDown, ChevronUp,
  TrendingUp, TrendingDown, Minus,
  Calendar, ShoppingCart
} from 'lucide-react';
import History from './History';

// ─── Period helpers ────────────────────────────────────────────────────────────

const PERIODS = [
  { key: 'week',    label: 'Week'    },
  { key: 'month',   label: 'Month'   },
  { key: 'quarter', label: 'Quarter' },
  { key: 'year',    label: 'Year'    },
  { key: 'custom',  label: 'Custom'  },
];

function getPeriodRanges(period, customFrom, customTo) {
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  if (period === 'week') {
    const curStart = new Date();
    curStart.setDate(curStart.getDate() - 6);
    curStart.setHours(0, 0, 0, 0);
    const prevEnd = new Date(curStart.getTime() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - 6);
    prevStart.setHours(0, 0, 0, 0);
    return {
      current: { start: curStart, end: today },
      previous: { start: prevStart, end: prevEnd },
      label: 'Last 7 days', prevLabel: 'Prior 7 days'
    };
  }

  if (period === 'month') {
    const now = new Date();
    const curStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    return {
      current: { start: curStart, end: today },
      previous: { start: prevStart, end: prevEnd },
      label: now.toLocaleString('default', { month: 'long', year: 'numeric' }),
      prevLabel: prevStart.toLocaleString('default', { month: 'short' })
    };
  }

  if (period === 'quarter') {
    const now = new Date();
    const q = Math.floor(now.getMonth() / 3);
    const curStart = new Date(now.getFullYear(), q * 3, 1);
    const prevStart = new Date(now.getFullYear(), q * 3 - 3, 1);
    const prevEnd = new Date(now.getFullYear(), q * 3, 0, 23, 59, 59);
    const prevQ = ((q - 1) + 4) % 4;
    const prevYear = q === 0 ? now.getFullYear() - 1 : now.getFullYear();
    return {
      current: { start: curStart, end: today },
      previous: { start: prevStart, end: prevEnd },
      label: `Q${q + 1} ${now.getFullYear()}`,
      prevLabel: `Q${prevQ + 1} ${prevYear}`
    };
  }

  if (period === 'year') {
    const now = new Date();
    const curStart = new Date(now.getFullYear(), 0, 1);
    const prevStart = new Date(now.getFullYear() - 1, 0, 1);
    const prevEnd = new Date(now.getFullYear(), 0, 0, 23, 59, 59);
    return {
      current: { start: curStart, end: today },
      previous: { start: prevStart, end: prevEnd },
      label: String(now.getFullYear()),
      prevLabel: String(now.getFullYear() - 1)
    };
  }

  // custom
  const start = customFrom
    ? new Date(customFrom + 'T00:00:00')
    : new Date(Date.now() - 30 * 86400000);
  const end = customTo ? new Date(customTo + 'T23:59:59') : today;
  return { current: { start, end }, previous: null, label: 'Custom range', prevLabel: null };
}

function filterExpenses(expenses, range) {
  return expenses.filter(exp => {
    const d = new Date(exp.date + 'T12:00:00');
    return d >= range.start && d <= range.end;
  });
}

function flatItems(expenses) {
  const out = [];
  expenses.forEach(exp =>
    exp.items.forEach(it => out.push({ ...it, date: exp.date, merchant: exp.merchant }))
  );
  return out;
}

function groupByName(items) {
  const m = {};
  items.forEach(it => {
    if (!m[it.name]) m[it.name] = { name: it.name, total: 0, count: 0, purchases: [] };
    m[it.name].total += it.amount;
    m[it.name].count++;
    m[it.name].purchases.push(it);
  });
  return Object.values(m).sort((a, b) => b.total - a.total);
}

// ─── Delta helpers ─────────────────────────────────────────────────────────────

function deltaColor(delta) {
  if (Math.abs(delta) < 0.005) return '#64748b';
  // Spending less = good = green; spending more = bad = red
  return delta > 0 ? '#f87171' : '#34d399';
}

function fmtDelta(delta) {
  const sign = delta >= 0 ? '+' : '−';
  return `${sign}$${Math.abs(delta).toFixed(2)}`;
}

function DeltaBadge({ delta }) {
  if (Math.abs(delta) < 0.005) return null;
  const color = deltaColor(delta);
  const Icon = delta > 0 ? TrendingUp : TrendingDown;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '3px',
      fontSize: '0.65rem', fontWeight: 700, color,
      background: `${color}18`, padding: '2px 7px', borderRadius: '20px'
    }}>
      <Icon size={10} /> {fmtDelta(delta)}
    </span>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function Reports({
  expenses, onDelete,
  viewMode, setViewMode,
  activeCategoryFilter, setActiveCategoryFilter
}) {
  const [view,        setView]        = useState('reports'); // 'reports' | 'ledger'
  const [period,      setPeriod]      = useState('month');
  const [customFrom,  setCustomFrom]  = useState('');
  const [customTo,    setCustomTo]    = useState('');
  const [expandedCat, setExpandedCat] = useState(null);   // category key
  const [expandedItem,setExpandedItem]= useState(null);   // "catKey__itemName"

  // ── Date ranges ──────────────────────────────────────────────────────────────
  const ranges = useMemo(
    () => getPeriodRanges(period, customFrom, customTo),
    [period, customFrom, customTo]
  );

  const curExp  = useMemo(() => filterExpenses(expenses, ranges.current),                    [expenses, ranges]);
  const prevExp = useMemo(() => ranges.previous ? filterExpenses(expenses, ranges.previous) : [], [expenses, ranges]);

  const curItems  = useMemo(() => flatItems(curExp),  [curExp]);
  const prevItems = useMemo(() => flatItems(prevExp), [prevExp]);

  const curTotal  = curExp.reduce((s, e) => s + e.amount, 0);
  const prevTotal = prevExp.reduce((s, e) => s + e.amount, 0);
  const totalDelta = curTotal - prevTotal;

  // ── Category rows (sorted by current spend, skip zero) ───────────────────────
  const categoryRows = useMemo(() => {
    return Object.entries(CATEGORIES).map(([key, meta]) => {
      const cItems = curItems.filter(it => (it.category || 'other') === key);
      const pItems = prevItems.filter(it => (it.category || 'other') === key);
      const cur  = cItems.reduce((s, i) => s + i.amount, 0);
      const prev = pItems.reduce((s, i) => s + i.amount, 0);
      return { key, meta, cur, prev, items: cItems };
    })
    .filter(r => r.cur > 0)
    .sort((a, b) => b.cur - a.cur);
  }, [curItems, prevItems]);

  const maxBar = Math.max(1, ...categoryRows.map(r => Math.max(r.cur, r.prev)));

  // ── Top 5 most purchased by frequency ────────────────────────────────────────
  const topItems = useMemo(() => {
    const m = {};
    curItems.forEach(it => {
      const k = it.name.toLowerCase();
      if (!m[k]) m[k] = { name: it.name, count: 0, total: 0, cat: it.category || 'other' };
      m[k].count++;
      m[k].total += it.amount;
    });
    return Object.values(m).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [curItems]);

  // ── Quick stats ───────────────────────────────────────────────────────────────
  const quickStats = useMemo(() => {
    const grocery   = curItems.filter(i => ['vegetables','fruits','dairy','meat','bakery'].includes(i.category)).reduce((s,i) => s+i.amount, 0);
    const fuel      = curItems.filter(i => i.category === 'fuel').reduce((s,i) => s+i.amount, 0);
    const utilities = curItems.filter(i => i.category === 'utilities').reduce((s,i) => s+i.amount, 0);
    return [
      { label: 'Grocery',   val: grocery,   icon: '🥦' },
      { label: 'Fuel',      val: fuel,      icon: '⛽' },
      { label: 'Utilities', val: utilities, icon: '⚡' },
    ];
  }, [curItems]);

  // ── Shared toggle style ───────────────────────────────────────────────────────
  const toggleBtn = (active) => ({
    flex: 1, padding: '10px', borderRadius: '12px', border: 'none',
    background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
    color: active ? '#fff' : '#64748b',
    fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
    transition: 'all 0.18s'
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

      {/* ── Reports / Ledger top toggle ── */}
      <div style={{
        display: 'flex', background: 'rgba(255,255,255,0.03)',
        padding: '4px', borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.06)', gap: '4px'
      }}>
        <button style={toggleBtn(view === 'reports')} onClick={() => setView('reports')}>
          <BarChart2 size={15} /> Reports
        </button>
        <button style={toggleBtn(view === 'ledger')} onClick={() => setView('ledger')}>
          <ScrollText size={15} /> Ledger
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════
          LEDGER VIEW — pass straight through to existing History
      ══════════════════════════════════════════════════════════ */}
      {view === 'ledger' && (
        <History
          expenses={expenses}
          onDelete={onDelete}
          viewMode={viewMode}
          setViewMode={setViewMode}
          activeCategoryFilter={activeCategoryFilter}
          setActiveCategoryFilter={setActiveCategoryFilter}
        />
      )}

      {/* ══════════════════════════════════════════════════════════
          REPORTS VIEW
      ══════════════════════════════════════════════════════════ */}
      {view === 'reports' && (
        <>
          {/* Period tabs */}
          <div style={{
            display: 'flex', background: 'rgba(255,255,255,0.02)',
            padding: '4px', borderRadius: '14px',
            border: '1px solid rgba(255,255,255,0.06)', gap: '3px'
          }}>
            {PERIODS.map(p => (
              <button
                key={p.key}
                onClick={() => { setPeriod(p.key); setExpandedCat(null); setExpandedItem(null); }}
                style={{
                  flex: 1, padding: '8px 2px', borderRadius: '10px', border: 'none',
                  background: period === p.key ? 'rgba(99,102,241,0.2)' : 'transparent',
                  color: period === p.key ? '#a5b4fc' : '#64748b',
                  fontWeight: 700, fontSize: '0.68rem', cursor: 'pointer',
                  borderBottom: period === p.key ? '2px solid #6366f1' : '2px solid transparent',
                  transition: 'all 0.15s'
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom date range */}
          {period === 'custom' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="input-group">
                <label>From</label>
                <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="input-element" />
              </div>
              <div className="input-group">
                <label>To</label>
                <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="input-element" />
              </div>
            </div>
          )}

          {/* Hero summary card */}
          <div style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: '20px', padding: '20px'
          }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>
              {ranges.label}
            </div>
            <div style={{ fontFamily: 'var(--font-title)', fontSize: '2.4rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: '14px' }}>
              ${curTotal.toFixed(2)}
            </div>
            {ranges.previous && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  vs {ranges.prevLabel}: <strong style={{ color: '#e2e8f0' }}>${prevTotal.toFixed(2)}</strong>
                </span>
                <DeltaBadge delta={totalDelta} />
              </div>
            )}
            {curExp.length === 0 && (
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>No expenses recorded yet for this period.</div>
            )}
          </div>

          {/* Quick stats: Grocery | Fuel | Utilities */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {quickStats.map(s => (
              <div key={s.label} className="glass-card" style={{ padding: '12px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem', marginBottom: '5px' }}>{s.icon}</div>
                <div style={{ fontFamily: 'var(--font-title)', fontWeight: 800, fontSize: '0.95rem', color: '#fff' }}>
                  ${s.val.toFixed(2)}
                </div>
                <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* ── Category breakdown ─────────────────────────────────────── */}
          {categoryRows.length > 0 ? (
            <div>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>
                Category Breakdown — tap to expand
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {categoryRows.map(row => {
                  const isOpen = expandedCat === row.key;
                  const delta  = row.cur - row.prev;
                  const hasPrev = !!ranges.previous;
                  const curPct  = (row.cur  / maxBar) * 100;
                  const prevPct = (row.prev / maxBar) * 100;
                  const itemGroups = groupByName(row.items);

                  return (
                    <div key={row.key}>

                      {/* ── Category bar row (clickable) ── */}
                      <button
                        onClick={() => {
                          setExpandedCat(isOpen ? null : row.key);
                          setExpandedItem(null);
                        }}
                        style={{
                          width: '100%', textAlign: 'left', background: 'none',
                          border: 'none', cursor: 'pointer', padding: '10px 2px',
                          borderRadius: isOpen ? '14px 14px 0 0' : '14px'
                        }}
                      >
                        {/* Label row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '1rem' }}>{row.meta.icon}</span>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#e2e8f0' }}>{row.meta.label}</span>
                            {hasPrev && row.prev > 0 && <DeltaBadge delta={delta} />}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontFamily: 'var(--font-title)', fontWeight: 800, color: '#fff', fontSize: '0.9rem' }}>
                              ${row.cur.toFixed(2)}
                            </span>
                            {isOpen
                              ? <ChevronUp  size={14} style={{ color: '#64748b', flexShrink: 0 }} />
                              : <ChevronDown size={14} style={{ color: '#64748b', flexShrink: 0 }} />
                            }
                          </div>
                        </div>

                        {/* Progress bar (current + ghosted previous overlay) */}
                        <div style={{ position: 'relative', height: '7px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
                          {hasPrev && row.prev > 0 && (
                            <div style={{
                              position: 'absolute', top: 0, left: 0, height: '100%',
                              width: `${prevPct}%`,
                              background: 'rgba(148,163,184,0.22)',
                              borderRadius: '99px'
                            }} />
                          )}
                          <div style={{
                            position: 'absolute', top: 0, left: 0, height: '100%',
                            width: `${curPct}%`,
                            background: row.meta.gradient || row.meta.color,
                            borderRadius: '99px',
                            transition: 'width 0.4s ease'
                          }} />
                        </div>
                      </button>

                      {/* ── INLINE EXPANDED DETAIL ─────────────────────────────── */}
                      {isOpen && (
                        <div style={{
                          background: 'rgba(255,255,255,0.025)',
                          border: '1px solid rgba(255,255,255,0.07)',
                          borderTop: 'none',
                          borderRadius: '0 0 16px 16px',
                          padding: '14px',
                          marginBottom: '6px'
                        }}>

                          {/* 4-chip insight grid */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '10px' }}>
                              <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>This period</div>
                              <div style={{ fontFamily: 'var(--font-title)', fontWeight: 800, fontSize: '1.15rem', color: '#fff', marginTop: '3px' }}>${row.cur.toFixed(2)}</div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '10px' }}>
                              <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Items bought</div>
                              <div style={{ fontFamily: 'var(--font-title)', fontWeight: 800, fontSize: '1.15rem', color: '#fff', marginTop: '3px' }}>{row.items.length}</div>
                            </div>
                            {hasPrev && (
                              <>
                                <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '10px' }}>
                                  <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Prev period</div>
                                  <div style={{ fontFamily: 'var(--font-title)', fontWeight: 800, fontSize: '1.15rem', color: '#94a3b8', marginTop: '3px' }}>${row.prev.toFixed(2)}</div>
                                </div>
                                <div style={{
                                  background: `${deltaColor(delta)}10`,
                                  border: `1px solid ${deltaColor(delta)}22`,
                                  borderRadius: '12px', padding: '10px'
                                }}>
                                  <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Change</div>
                                  <div style={{
                                    fontFamily: 'var(--font-title)', fontWeight: 800, fontSize: '1.05rem',
                                    color: deltaColor(delta), marginTop: '3px',
                                    display: 'flex', alignItems: 'center', gap: '4px'
                                  }}>
                                    {delta > 0 ? <TrendingUp size={13} /> : delta < 0 ? <TrendingDown size={13} /> : <Minus size={13} />}
                                    {fmtDelta(delta)}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>

                          {/* This period vs previous period bars */}
                          {hasPrev && row.prev > 0 && (
                            <div style={{ marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {[
                                { label: ranges.label,    val: row.cur,  color: row.meta.gradient || row.meta.color },
                                { label: ranges.prevLabel, val: row.prev, color: 'rgba(148,163,184,0.3)' }
                              ].map(bar => {
                                const maxVal = Math.max(row.cur, row.prev, 0.01);
                                return (
                                  <div key={bar.label}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#94a3b8', marginBottom: '5px' }}>
                                      <span>{bar.label}</span>
                                      <span style={{ fontWeight: 700 }}>${bar.val.toFixed(2)}</span>
                                    </div>
                                    <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '99px', overflow: 'hidden' }}>
                                      <div style={{
                                        width: `${(bar.val / maxVal) * 100}%`, height: '100%',
                                        background: bar.color, borderRadius: '99px',
                                        transition: 'width 0.45s ease'
                                      }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Item list within category */}
                          <div style={{ fontSize: '0.64rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>
                            Items
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {itemGroups.map(group => {
                              const itemKey  = row.key + '__' + group.name;
                              const itemOpen = expandedItem === itemKey;

                              return (
                                <div key={group.name}>

                                  {/* ── Item row (clickable) ── */}
                                  <button
                                    onClick={() => setExpandedItem(itemOpen ? null : itemKey)}
                                    style={{
                                      width: '100%', textAlign: 'left', cursor: 'pointer',
                                      background: 'rgba(255,255,255,0.04)',
                                      border: '1px solid rgba(255,255,255,0.07)',
                                      borderRadius: itemOpen ? '12px 12px 0 0' : '12px',
                                      padding: '10px 12px',
                                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                    }}
                                  >
                                    <div>
                                      <div style={{ fontSize: '0.83rem', fontWeight: 700, color: '#e2e8f0' }}>{group.name}</div>
                                      <div style={{ fontSize: '0.67rem', color: '#64748b', marginTop: '2px' }}>
                                        {group.count}× purchased
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span style={{ fontFamily: 'var(--font-title)', fontWeight: 800, color: '#fff', fontSize: '0.88rem' }}>
                                        ${group.total.toFixed(2)}
                                      </span>
                                      {itemOpen
                                        ? <ChevronUp  size={12} style={{ color: '#64748b', flexShrink: 0 }} />
                                        : <ChevronDown size={12} style={{ color: '#64748b', flexShrink: 0 }} />
                                      }
                                    </div>
                                  </button>

                                  {/* ── INLINE ITEM PURCHASE HISTORY ── */}
                                  {itemOpen && (
                                    <div style={{
                                      background: 'rgba(255,255,255,0.015)',
                                      border: '1px solid rgba(255,255,255,0.05)',
                                      borderTop: 'none',
                                      borderRadius: '0 0 12px 12px',
                                      padding: '8px 12px',
                                      display: 'flex', flexDirection: 'column', gap: '0'
                                    }}>
                                      {group.purchases.map((p, idx) => (
                                        <div
                                          key={idx}
                                          style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            padding: '8px 0',
                                            borderBottom: idx < group.purchases.length - 1
                                              ? '1px solid rgba(255,255,255,0.04)' : 'none'
                                          }}
                                        >
                                          <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#e2e8f0', fontWeight: 600 }}>
                                              <ShoppingCart size={11} style={{ color: '#64748b' }} />
                                              {p.merchant}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.67rem', color: '#64748b', marginTop: '2px' }}>
                                              <Calendar size={10} /> {p.date}
                                            </div>
                                          </div>
                                          <span style={{ fontFamily: 'var(--font-title)', fontWeight: 700, color: '#fff', fontSize: '0.85rem' }}>
                                            ${p.amount.toFixed(2)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                </div>
                              );
                            })}
                          </div>

                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: '#64748b' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📊</div>
              <p style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>
                No expenses in this period yet.<br />
                Scan a bill or add one manually to see your breakdown.
              </p>
            </div>
          )}

          {/* ── Most purchased items ─────────────────────────────────── */}
          {topItems.length > 0 && (
            <div>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px', marginTop: '4px' }}>
                Most Purchased
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {topItems.map((item, idx) => (
                  <div
                    key={item.name}
                    className="glass-card"
                    style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{
                        fontFamily: 'var(--font-title)', fontWeight: 900, fontSize: '1.1rem',
                        color: idx === 0 ? '#fbbf24' : '#334155', width: '22px', flexShrink: 0
                      }}>
                        {idx + 1}
                      </span>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#e2e8f0' }}>{item.name}</div>
                        <div style={{ fontSize: '0.67rem', color: '#64748b', marginTop: '2px' }}>
                          {CATEGORIES[item.cat]?.label || 'Other'} &bull; {item.count}× bought
                        </div>
                      </div>
                    </div>
                    <span style={{ fontFamily: 'var(--font-title)', fontWeight: 800, color: '#fff', fontSize: '0.9rem' }}>
                      ${item.total.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </>
      )}
    </div>
  );
}
