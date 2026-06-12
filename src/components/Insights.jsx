import React, { useState, useMemo } from 'react';
import { CATEGORIES } from '../utils/parser';
import { TrendingUp, TrendingDown, Sparkles, Crown, CalendarDays, Receipt, Flame } from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, Tooltip, AreaChart, Area
} from 'recharts';

// ─────────────────────────────────────────────────────────────
// Insights — visual analytics tab: trends, patterns and smart
// highlights computed from the ledger. Chart-first, zero setup.
// ─────────────────────────────────────────────────────────────

const PERIODS = [
  { id: 'week',  label: '7 Days'     },
  { id: 'month', label: 'This Month' },
  { id: '3m',    label: '3 Months'   },
  { id: 'year',  label: 'Year'       },
  { id: 'all',   label: 'All Time'   },
];

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const fmtMoney = (v) => `$${(v || 0).toFixed(2)}`;
const fmtShort = (v) => v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${Math.round(v)}`;

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '8px 12px', fontSize: '0.75rem', boxShadow: '0 8px 20px rgba(0,0,0,0.5)' }}>
      <div style={{ color: '#94a3b8', marginBottom: 2 }}>{label}</div>
      <div style={{ fontWeight: 800, color: '#fff' }}>{fmtMoney(payload[0].value)}</div>
    </div>
  );
};

export default function Insights({ expenses = [], budget = 0, catBudgets = {} }) {
  const [period, setPeriod] = useState('month');

  // ── Period pool ────────────────────────────────────────────
  const pool = useMemo(() => {
    const now = new Date();
    const cut = (days) => {
      const d = new Date(); d.setDate(d.getDate() - days);
      return d.toISOString().split('T')[0];
    };
    if (period === 'week')  return expenses.filter(e => e.date >= cut(7));
    if (period === 'month') {
      const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      return expenses.filter(e => e.date.startsWith(key));
    }
    if (period === '3m')   return expenses.filter(e => e.date >= cut(92));
    if (period === 'year') return expenses.filter(e => e.date >= cut(365));
    return expenses;
  }, [expenses, period]);

  // ── KPIs ───────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = pool.reduce((s, e) => s + e.amount, 0);
    const days = { week: 7, month: new Date().getDate(), '3m': 92, year: 365 }[period]
      || Math.max(1, new Set(expenses.map(e => e.date)).size);
    const catT = {};
    pool.forEach(e => e.items.forEach(i => {
      const c = i.category || 'other';
      catT[c] = (catT[c] || 0) + i.amount;
    }));
    const topCat = Object.entries(catT).sort((a, b) => b[1] - a[1])[0];
    return {
      total,
      avgDay: total / Math.max(1, days),
      count: pool.length,
      topCat: topCat ? { key: topCat[0], amt: topCat[1] } : null,
      catTotals: catT,
    };
  }, [pool, period, expenses]);

  // ── Donut data ─────────────────────────────────────────────
  const donutData = useMemo(() =>
    Object.entries(stats.catTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([key, value]) => ({
        key,
        name: CATEGORIES[key]?.label || key,
        value: Math.round(value * 100) / 100,
        color: CATEGORIES[key]?.color || '#9ca3af',
        icon: CATEGORIES[key]?.icon || '📦',
        pct: stats.total > 0 ? Math.round(value / stats.total * 100) : 0,
      })), [stats]);

  // ── Daily bars (last 14 days, always) ──────────────────────
  const dailyData = useMemo(() => {
    const out = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const amt = expenses.filter(e => e.date === key).reduce((s, e) => s + e.amount, 0);
      out.push({ label: d.toLocaleDateString('en-US', { day: 'numeric' }), full: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), amt: Math.round(amt * 100) / 100 });
    }
    return out;
  }, [expenses]);

  // ── Monthly trend (last 6 months, always) ──────────────────
  const monthlyData = useMemo(() => {
    const out = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const amt = expenses.filter(e => e.date.startsWith(key)).reduce((s, e) => s + e.amount, 0);
      out.push({ label: d.toLocaleDateString('en-US', { month: 'short' }), amt: Math.round(amt * 100) / 100 });
    }
    return out;
  }, [expenses]);

  // ── Day-of-week pattern (period pool) ──────────────────────
  const dowData = useMemo(() => {
    const sums = Array(7).fill(0);
    pool.forEach(e => { sums[new Date(e.date + 'T12:00').getDay()] += e.amount; });
    return DOW.map((label, i) => ({ label, amt: Math.round(sums[i] * 100) / 100 }));
  }, [pool]);

  // ── Top merchants (period pool) ────────────────────────────
  const merchants = useMemo(() => {
    const t = {};
    pool.forEach(e => { t[e.merchant] = (t[e.merchant] || 0) + e.amount; });
    return Object.entries(t).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [pool]);
  const merchMax = merchants[0]?.[1] || 1;

  // ── Smart highlights (always month-vs-month) ───────────────
  const highlights = useMemo(() => {
    const now = new Date();
    const thisKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevKey = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;

    const thisPool = expenses.filter(e => e.date.startsWith(thisKey));
    const prevPool = expenses.filter(e => e.date.startsWith(prevKey));
    const thisTotal = thisPool.reduce((s, e) => s + e.amount, 0);
    const prevTotal = prevPool.reduce((s, e) => s + e.amount, 0);

    const out = [];

    // 1. Month-over-month change
    if (prevTotal > 0) {
      const pct = Math.round((thisTotal - prevTotal) / prevTotal * 100);
      out.push({
        icon: pct > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />,
        color: pct > 0 ? '#f43f5e' : '#10b981',
        text: <>You've spent <strong>{fmtMoney(thisTotal)}</strong> this month — <strong>{Math.abs(pct)}% {pct > 0 ? 'more' : 'less'}</strong> than last month ({fmtMoney(prevTotal)}).</>,
      });
    }

    // 2. Budget pace projection
    if (budget > 0 && thisTotal > 0) {
      const dayOfMonth = now.getDate();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const projected = thisTotal / dayOfMonth * daysInMonth;
      const over = projected > budget;
      out.push({
        icon: <Flame size={16} />,
        color: over ? '#f59e0b' : '#10b981',
        text: over
          ? <>At this pace you'll hit <strong>{fmtMoney(projected)}</strong> by month-end — <strong>{fmtMoney(projected - budget)} over</strong> your {fmtMoney(budget)} budget.</>
          : <>On track! Projected month-end spend is <strong>{fmtMoney(projected)}</strong>, under your {fmtMoney(budget)} budget.</>,
      });
    }

    // 3. Biggest purchase in current period
    const biggest = [...pool].sort((a, b) => b.amount - a.amount)[0];
    if (biggest) {
      out.push({
        icon: <Crown size={16} />,
        color: '#a78bfa',
        text: <>Biggest receipt: <strong>{fmtMoney(biggest.amount)}</strong> at <strong>{biggest.merchant}</strong> ({new Date(biggest.date + 'T12:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}).</>,
      });
    }

    // 4. Busiest spending day of week
    const dowMax = dowData.reduce((m, d) => d.amt > m.amt ? d : m, { amt: 0 });
    if (dowMax.amt > 0) {
      out.push({
        icon: <CalendarDays size={16} />,
        color: '#22d3ee',
        text: <><strong>{dowMax.label}</strong> is your biggest spending day — {fmtMoney(dowMax.amt)} in this period.</>,
      });
    }

    return out;
  }, [expenses, pool, budget, dowData]);

  const kpiCard = (label, value, sub) => (
    <div className="glass-card" style={{ flex: 1, minWidth: 0, padding: '12px 14px' }}>
      <p style={{ fontSize: '0.62rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
      <p style={{ fontFamily: 'var(--font-title)', fontSize: '1.15rem', fontWeight: 800, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</p>
      {sub && <p style={{ fontSize: '0.62rem', color: '#94a3b8', marginTop: 1 }}>{sub}</p>}
    </div>
  );

  const empty = pool.length === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Sparkles size={18} style={{ color: '#6366f1' }} />
        <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '1.15rem', fontWeight: 800 }}>Insights</h2>
      </div>

      {/* Period chips */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px', scrollbarWidth: 'none' }}>
        {PERIODS.map(p => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            style={{
              flexShrink: 0, padding: '6px 14px', borderRadius: '50px', cursor: 'pointer',
              fontSize: '0.75rem', fontWeight: 700,
              border: `1px solid ${period === p.id ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.08)'}`,
              background: period === p.id ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.03)',
              color: period === p.id ? '#a5b4fc' : '#64748b',
              transition: 'all 0.15s',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {empty ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '2.2rem', marginBottom: 8 }}>📊</div>
          <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>No expenses in this period</p>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>Scan a receipt or add an expense, and your charts will light up here.</p>
        </div>
      ) : (
        <>
          {/* KPI row */}
          <div style={{ display: 'flex', gap: '10px' }}>
            {kpiCard('Spent', fmtMoney(stats.total), `${stats.count} receipt${stats.count !== 1 ? 's' : ''}`)}
            {kpiCard('Daily Avg', fmtMoney(stats.avgDay))}
            {kpiCard('Top Category', stats.topCat ? `${CATEGORIES[stats.topCat.key]?.icon || '📦'} ${fmtShort(stats.topCat.amt)}` : '—',
              stats.topCat ? CATEGORIES[stats.topCat.key]?.label : '')}
          </div>

          {/* Smart highlights */}
          {highlights.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {highlights.map((h, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '11px 14px', background: `${h.color}10`, border: `1px solid ${h.color}35`, borderRadius: '14px', fontSize: '0.78rem', lineHeight: 1.5, color: '#e2e8f0' }}>
                  <span style={{ color: h.color, flexShrink: 0, marginTop: 1 }}>{h.icon}</span>
                  <span>{h.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Category budgets progress (always current month) */}
          {Object.keys(catBudgets).length > 0 && (() => {
            const now = new Date();
            const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            const monthCatT = {};
            expenses.filter(e => e.date.startsWith(monthKey)).forEach(e =>
              e.items.forEach(i => {
                const c = i.category || 'other';
                monthCatT[c] = (monthCatT[c] || 0) + i.amount;
              })
            );
            return (
              <div className="glass-card">
                <h3 className="section-title">🎯 Category Budgets <span style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 700 }}>· this month</span></h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: 4 }}>
                  {Object.entries(catBudgets).map(([key, limit]) => {
                    const spent = monthCatT[key] || 0;
                    const pct = Math.min(100, Math.round(spent / limit * 100));
                    const color = pct < 70 ? '#10b981' : pct < 100 ? '#f59e0b' : '#f43f5e';
                    return (
                      <div key={key}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 4 }}>
                          <span style={{ color: '#cbd5e1', fontWeight: 600 }}>{CATEGORIES[key]?.icon} {CATEGORIES[key]?.label || key}</span>
                          <span style={{ fontWeight: 700, color: spent > limit ? '#f43f5e' : '#94a3b8' }}>
                            {fmtMoney(spent)} / {fmtMoney(limit)}{spent > limit ? ' ⚠' : ''}
                          </span>
                        </div>
                        <div style={{ height: 7, borderRadius: 4, background: 'rgba(255,255,255,0.05)' }}>
                          <div style={{ height: '100%', borderRadius: 4, width: `${Math.max(2, pct)}%`, background: color, boxShadow: `0 0 8px ${color}66`, transition: 'width 0.4s ease' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Category donut */}
          <div className="glass-card">
            <h3 className="section-title" style={{ marginBottom: 4 }}>🍩 Where It Went</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '46%', height: 170, position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={3} strokeWidth={0}>
                      {donutData.map(d => <Cell key={d.key} fill={d.color} />)}
                    </Pie>
                    <Tooltip content={<ChartTip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <span style={{ fontSize: '0.58rem', fontWeight: 700, color: '#64748b' }}>TOTAL</span>
                  <span style={{ fontFamily: 'var(--font-title)', fontWeight: 800, fontSize: '0.95rem' }}>{fmtShort(stats.total)}</span>
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: 170, overflowY: 'auto', paddingRight: 4 }}>
                {donutData.slice(0, 6).map(d => (
                  <div key={d.key} style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.72rem' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.icon} {d.name}</span>
                    <span style={{ fontWeight: 700, color: '#94a3b8', flexShrink: 0 }}>{d.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Daily bars */}
          <div className="glass-card">
            <h3 className="section-title">📅 Last 14 Days</h3>
            <div style={{ height: 150 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData} margin={{ top: 6, right: 0, left: -22, bottom: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} interval={1} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={fmtShort} />
                  <Tooltip content={<ChartTip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} labelFormatter={(l, p) => p?.[0]?.payload?.full || l} />
                  <Bar dataKey="amt" fill="#6366f1" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly trend */}
          <div className="glass-card">
            <h3 className="section-title">📈 6-Month Trend</h3>
            <div style={{ height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData} margin={{ top: 6, right: 4, left: -22, bottom: 0 }}>
                  <defs>
                    <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={fmtShort} />
                  <Tooltip content={<ChartTip />} />
                  <Area type="monotone" dataKey="amt" stroke="#10b981" strokeWidth={2.5} fill="url(#trendFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Day-of-week pattern */}
          <div className="glass-card">
            <h3 className="section-title">🗓 Spending by Day of Week</h3>
            <div style={{ height: 130 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dowData} margin={{ top: 6, right: 0, left: -22, bottom: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={fmtShort} />
                  <Tooltip content={<ChartTip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="amt" fill="#f59e0b" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top merchants */}
          {merchants.length > 0 && (
            <div className="glass-card">
              <h3 className="section-title">🏪 Top Stores</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: 4 }}>
                {merchants.map(([name, amt], i) => (
                  <div key={name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 4 }}>
                      <span style={{ color: '#cbd5e1', fontWeight: 600 }}>{i + 1}. {name}</span>
                      <span style={{ fontWeight: 800, color: '#fff' }}>{fmtMoney(amt)}</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 4, background: 'rgba(255,255,255,0.05)' }}>
                      <div style={{ height: '100%', borderRadius: 4, width: `${Math.max(4, amt / merchMax * 100)}%`, background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }} />
                    </div>
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
