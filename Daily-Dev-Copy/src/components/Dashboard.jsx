import React, { useState, useCallback } from 'react';
import { CATEGORIES } from '../utils/parser';
import { currentMonthKey, postedRecurringIds, recurringSplit } from '../utils/recurring';
import { categoryBudgetStatus, categorySlack, monthPaceProjector } from '../utils/categoryBudget';
import { TrendingUp, AlertTriangle, X, Check, ShoppingCart, CalendarDays } from 'lucide-react';
import EmptyState from './EmptyState';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// NOTE: this file used to carry its own `CAT_GRAD` map of category colours — a
// hand-copied second palette that had already drifted from the real one in
// utils/parser.js: dining rendered orange here but pink everywhere else, dairy
// grey here but blue everywhere else, fuel and utilities likewise. The same
// category was literally a different colour on Home than in History, Reports or
// Settings. Deleted; every screen now reads `CATEGORIES[cat].color`.

export default function Dashboard({
  expenses, budget, onSaveBudget, showToast,
  dashFilter, dashFrom, dashTo,
  setDashFilter, setDashFrom, setDashTo, onGoHistory,
  catBudgets = {}, onSetLimit, recurring = [], onManageRecurring
}) {
  const [editBudgetOpen, setEditBudgetOpen] = useState(false);
  const [editBudgetVal, setEditBudgetVal] = useState(budget.toString());

  const getPool = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    if (dashFilter === 'today') return expenses.filter(e => e.date === today);
    if (dashFilter === 'weekly') {
      const d = new Date(); d.setDate(d.getDate() - 7);
      return expenses.filter(e => e.date >= d.toISOString().split('T')[0]);
    }
    if (dashFilter === 'monthly') {
      const key = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
      return expenses.filter(e => e.date.startsWith(key));
    }
    if (dashFilter === 'custom' && dashFrom && dashTo) return expenses.filter(e => e.date >= dashFrom && e.date <= dashTo);
    return expenses;
  }, [expenses, dashFilter, dashFrom, dashTo]);

  const pool = getPool();
  const totalSpent = pool.reduce((s, e) => s + e.amount, 0);
  const pct = Math.min(Math.round((totalSpent / budget) * 100), 100);
  const remaining = Math.max(budget - totalSpent, 0);

  const periodLabel = () => {
    const now = new Date();
    if (dashFilter === 'today') return 'Today';
    if (dashFilter === 'weekly') return 'Last 7 Days';
    if (dashFilter === 'monthly') return `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;
    if (dashFilter === 'custom' && dashFrom && dashTo) {
      const fmt = s => new Date(s+'T12:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});
      return `${fmt(dashFrom)} – ${fmt(dashTo)}`;
    }
    return 'Custom';
  };

  const color = pct < 50 ? '#34D399' : pct < 85 ? '#f59e0b' : '#f43f5e';
  const R = 68;
  const circ = 2 * Math.PI * R;
  const off = circ - (pct / 100) * circ;

  // ── Budget-pace status pill (Copilot/Monarch-style "on track" indicator) ──
  // Shown for the monthly view: compares spend so far against the expected
  // spend for this point in the month, so the user sees pace, not just total.
  const statusInfo = (() => {
    if (dashFilter !== 'monthly' || !budget || budget <= 0) return null;
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const expectedByNow = budget * (now.getDate() / daysInMonth);
    const TONES = {
      good:   { color: '#34d399', bg: 'rgba(52,211,153,0.10)', border: 'rgba(52,211,153,0.25)' },
      warn:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.25)' },
      danger: { color: '#f43f5e', bg: 'rgba(244,63,94,0.10)',  border: 'rgba(244,63,94,0.25)' },
    };
    let tone, label;
    if (totalSpent > budget) {
      tone = 'danger';
      const over = totalSpent - budget;
      label = over >= 1 ? `Over budget · $${over.toFixed(0)} over` : 'Over budget';
    } else if (totalSpent <= expectedByNow) {
      tone = 'good';
      const under = expectedByNow - totalSpent;
      label = under >= 1 ? `On track · $${under.toFixed(0)} under pace` : 'On track';
    } else {
      tone = 'warn';
      const over = totalSpent - expectedByNow;
      label = over >= 1 ? `Over pace · $${over.toFixed(0)} over` : 'Over pace';
    }
    return { label, ...TONES[tone] };
  })();

  // ── Rocket Money-style weekly summary: "vs the week before" ──
  // The Week view is a rolling last-7-days window, but its card has only ever
  // shown a raw total plus a usage % measured against the *monthly* budget — no
  // comparison of its own, and no status pill (that's monthly-only). Rocket's
  // weekly spending summary exists precisely to answer "am I spending more than
  // last week?", so compare this rolling window to the 7 days immediately before
  // it. Deliberately a factual delta, not a "pace" verdict — so it sidesteps the
  // still-parked question of what pace should mean for non-monthly views.
  // Mirrors History's `periodDelta` wording, colours and 0.5 threshold exactly,
  // so the two screens can never phrase the same comparison differently.
  const weekDelta = (() => {
    if (dashFilter !== 'weekly') return null;
    const DAY = 24 * 60 * 60 * 1000;
    const iso = t => new Date(t).toISOString().split('T')[0];
    const prevStart = iso(Date.now() - 14 * DAY);
    const prevEnd = iso(Date.now() - 7 * DAY);   // exclusive — the current window starts here
    const prevTotal = expenses
      .filter(e => e.date && e.date >= prevStart && e.date < prevEnd)
      .reduce((s, e) => s + (e.amount || 0), 0);
    if (prevTotal <= 0) return null;             // nothing to compare against yet
    return totalSpent - prevTotal;
  })();

  // ── Daily allowance (Spendee-style "safe to spend per day") ──
  // Monthly view only: how much can be spent each remaining day (incl. today)
  // to finish the month exactly on budget.
  const dailyAllowance = (() => {
    if (dashFilter !== 'monthly' || !budget || budget <= 0) return null;
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysLeft = daysInMonth - now.getDate() + 1;
    return { perDay: remaining / daysLeft, daysLeft };
  })();

  // ── Upcoming recurring bills this month (Copilot-style "Upcoming" module) ──
  // Monthly view only: recurring expenses whose charge day is still ahead this
  // month and hasn't auto-posted yet — so the user sees the known commitments
  // still to come against their remaining budget, the same forward-looking
  // signal Copilot's dashboard "Upcoming" section surfaces. Auto-posted bills
  // (day already reached) drop off automatically because they no longer match.
  // Which bills have already posted this month — one shared computation for the
  // Upcoming list and the month-in-progress bar below (see utils/recurring.js).
  const recPostedIds = postedRecurringIds(expenses, currentMonthKey());

  const upcoming = (() => {
    if (dashFilter !== 'monthly' || !recurring.length) return [];
    const today = new Date().getDate();
    return recurring
      .map(r => ({ ...r, dayOfMonth: r.dayOfMonth || 1, amount: Number(r.amount) || 0 }))
      .filter(r => r.dayOfMonth > today && !recPostedIds.has(r.id))
      .map(r => ({ ...r, daysAway: r.dayOfMonth - today }))
      .sort((a, b) => a.dayOfMonth - b.dayOfMonth);
  })();
  const upcomingTotal = upcoming.reduce((s, r) => s + r.amount, 0);

  // ── Monarch-style month-in-progress split of the recurring commitment ──
  // The Upcoming list answers "what's still coming"; Monarch's cash-flow view
  // frames the month as money already gone *plus* money still committed, so the
  // remaining budget is read against the whole picture. Shares Settings'
  // `recurringSplit` helper (same posted-this-month guard as `upcoming` above),
  // so the two screens can never disagree about the same bill. Null until at
  // least one bill has actually posted — a 0% bar would be noise.
  const recProgress = (() => {
    if (dashFilter !== 'monthly' || !recurring.length) return null;
    const { paid, committed } = recurringSplit(recurring, recPostedIds);
    if (paid <= 0 || committed <= 0) return null;
    return { paid, committed, pct: Math.min(100, (paid / committed) * 100) };
  })();

  // ── "Free to spend" after known commitments (Monarch-style cash-flow) ──
  // Of the budget still remaining this month, how much is truly free once the
  // upcoming recurring bills above are set aside. Negative means the known
  // bills already exceed what's left — the forward-looking signal Monarch
  // surfaces as "here's what you'll have left," not just "here's what you spent."
  const freeToSpend = remaining - upcomingTotal;

  // ── Copilot-style "at-risk" pace projection for category limits ──
  // Monthly view only: projects a category's month-end spend from its pace so
  // far (same linear day-of-month math as the ring's status pill), so a limit
  // can be flagged *before* it's actually blown — Copilot's at-risk categories.
  // Guarded to day 5+ so one early purchase doesn't project a wild total.
  // The projector itself now lives in utils/categoryBudget.js, shared with Settings.
  const paceProject = dashFilter !== 'monthly' ? null : monthPaceProjector();

  // Category breakdown
  const catTotals = {};
  pool.forEach(e => {
    e.items.forEach(item => {
      const c = item.category || 'other';
      catTotals[c] = (catTotals[c] || 0) + item.amount;
    });
  });
  const topCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);

  // ── YNAB-style "roll with the punches" cover pointer ──
  // Monthly view only: which budgeted categories still have room left this
  // month, most-room-first. An over-limit category can never appear here by
  // construction (its remaining is negative), so a red row can point at real
  // slack instead of dead-ending. Shared with Settings via utils/categoryBudget.js,
  // so the two "Cover it from…" lines can never name different categories.
  const catSlack = dashFilter !== 'monthly' ? [] : categorySlack(catBudgets, catTotals);

  const handleSaveBudget = () => {
    const v = parseFloat(editBudgetVal);
    if (!isNaN(v) && v > 0) {
      onSaveBudget(v);
      if (showToast) showToast('Budget updated ✓');
    }
    setEditBudgetOpen(false);
  };

  const relDate = s => {
    const diff = Math.round((Date.now() - new Date(s+'T12:00')) / 864e5);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return diff + ' days ago';
    return new Date(s+'T12:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});
  };

  return (
    <div className="dashboard-view">
      {/* Time filter tabs */}
      <div className="time-tabs">
        {['today','weekly','monthly','custom'].map(f => (
          <div
            key={f}
            className={`time-tab${dashFilter === f ? ' active' : ''}`}
            onClick={() => setDashFilter(f)}
          >
            {f === 'today' ? 'Today' : f === 'weekly' ? 'Week' : f === 'monthly' ? 'Month' : 'Custom'}
          </div>
        ))}
      </div>

      {/* Custom date range */}
      {dashFilter === 'custom' && (
        <div className="date-range-row">
          <input
            type="date"
            className="date-range-input"
            value={dashFrom}
            onChange={e => setDashFrom(e.target.value)}
          />
          <span className="date-range-sep">→</span>
          <input
            type="date"
            className="date-range-input"
            value={dashTo}
            onChange={e => setDashTo(e.target.value)}
          />
        </div>
      )}

      {/* Budget ring card */}
      <div className="glass-card budget-ring-container">
        <h2 className="section-title" style={{alignSelf:'flex-start'}}>
          <TrendingUp size={18} /> {periodLabel()}
        </h2>
        <div style={{position:'relative',width:160,height:160,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <svg height={160} width={160} className="budget-glow-ring">
            <circle
              stroke="rgba(255,255,255,0.04)"
              fill="transparent"
              strokeWidth={12}
              r={R}
              cx={R+12}
              cy={R+12}
            />
            <circle
              stroke={color}
              fill="transparent"
              strokeWidth={12}
              strokeDasharray={`${circ} ${circ}`}
              style={{
                strokeDashoffset: off,
                transition: 'stroke-dashoffset 0.8s ease-in-out',
                filter: `drop-shadow(0 0 6px ${color}88)`
              }}
              strokeLinecap="round"
              r={R}
              cx={R+12}
              cy={R+12}
              transform={`rotate(-90 ${R+12} ${R+12})`}
            />
          </svg>
          <div
            className="budget-stats-center"
            onClick={() => { setEditBudgetVal(budget.toString()); setEditBudgetOpen(true); }}
            style={{cursor:'pointer'}}
          >
            <h3>${totalSpent.toFixed(2)}</h3>
            <p>{dashFilter === 'monthly' ? `of $${budget} ✏️` : `spent`}</p>
            <p style={{fontSize:'0.62rem',opacity:0.6}}>
              {dashFilter === 'monthly' ? 'tap to edit' : 'vs $'+budget+' budget'}
            </p>
          </div>
        </div>
        {statusInfo && (
          <div
            className="status-pill"
            style={{ color: statusInfo.color, background: statusInfo.bg, borderColor: statusInfo.border }}
          >
            <span className="status-dot" style={{ background: statusInfo.color }} />
            {statusInfo.label}
          </div>
        )}
        {/* Rocket-style weekly summary line — the Week view's counterpart to the
            monthly pace pill above. Same wording/colours as History's delta. */}
        {weekDelta !== null && (
          <div style={{
            fontSize: '0.72rem',
            fontWeight: 600,
            marginTop: 10,
            textAlign: 'center',
            color: Math.abs(weekDelta) < 0.5 ? '#5A6270' : weekDelta < 0 ? '#34D399' : '#EF9F27'
          }}>
            {Math.abs(weekDelta) < 0.5
              ? 'About the same as the week before'
              : weekDelta < 0
                ? `▼ $${Math.abs(weekDelta).toFixed(2)} less than the week before`
                : `▲ $${weekDelta.toFixed(2)} more than the week before`}
          </div>
        )}
        <div style={{display:'flex',width:'100%',justifyContent:'space-around',marginTop:18,borderTop:'1px solid rgba(255,255,255,0.06)',paddingTop:14}}>
          <div style={{textAlign:'center'}}>
            <p style={{fontSize:'0.7rem',color:'#8A93A0',fontWeight:600}}>
              {dashFilter === 'monthly' ? 'REMAINING' : 'BUDGET'}
            </p>
            <p style={{fontFamily:'var(--font-title)',fontSize:'1.1rem',fontWeight:800,color:'#34D399'}}>
              {dashFilter === 'monthly' ? `$${remaining.toFixed(2)}` : `$${budget}`}
            </p>
          </div>
          {dailyAllowance && (
            <>
              <div style={{width:1,background:'rgba(255,255,255,0.06)'}}></div>
              <div style={{textAlign:'center'}}>
                <p style={{fontSize:'0.7rem',color:'#8A93A0',fontWeight:600}}>LEFT / DAY</p>
                <p style={{fontFamily:'var(--font-title)',fontSize:'1.1rem',fontWeight:800,color:dailyAllowance.perDay > 0 ? '#34d399' : '#5A6270'}}>
                  ${dailyAllowance.perDay.toFixed(2)}
                </p>
                <p style={{fontSize:'0.62rem',color:'#5A6270',fontWeight:600}}>
                  {dailyAllowance.daysLeft} {dailyAllowance.daysLeft === 1 ? 'day' : 'days'} left
                </p>
              </div>
            </>
          )}
          <div style={{width:1,background:'rgba(255,255,255,0.06)'}}></div>
          <div style={{textAlign:'center'}}>
            <p style={{fontSize:'0.7rem',color:'#8A93A0',fontWeight:600}}>USAGE</p>
            <p style={{fontFamily:'var(--font-title)',fontSize:'1.1rem',fontWeight:800,color}}>{pct}%</p>
          </div>
        </div>
        {dashFilter === 'monthly' && budget > 0 && upcomingTotal > 0 && (
          <p style={{fontSize:'0.68rem',color:'#5A6270',textAlign:'center',marginTop:10,fontWeight:600}}>
            <span style={{color: freeToSpend >= 0 ? '#34d399' : '#f43f5e'}}>
              ${Math.abs(freeToSpend).toFixed(2)} {freeToSpend >= 0 ? 'free to spend' : 'over'}
            </span>
            {' '}after ${upcomingTotal.toFixed(2)} in upcoming {upcoming.length === 1 ? 'bill' : 'bills'}
          </p>
        )}
        {pool.length === 0 && (
          <p style={{fontSize:'0.72rem',color:'#5A6270',textAlign:'center',marginTop:'8px',fontStyle:'italic'}}>
            No expenses for this period.
          </p>
        )}
      </div>

      {/* Alert */}
      {pct >= 85 && dashFilter === 'monthly' && (
        <div className="tip-banner" style={{background:'linear-gradient(135deg,rgba(244,63,94,0.08),rgba(244,63,94,0.04))',borderColor:'rgba(244,63,94,0.2)',color:'#fb7185'}}>
          <AlertTriangle size={18} style={{flexShrink:0,marginTop:1}} />
          <div><strong>Budget alert!</strong> You've used {pct}% of your budget.</div>
        </div>
      )}

      {/* Upcoming recurring bills — Copilot/Rocket-style "Upcoming" module */}
      {upcoming.length > 0 && (
        <div className="glass-card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <h2 className="section-title" style={{marginBottom:0}}>
              <CalendarDays size={18} /> Upcoming · {periodLabel()}
            </h2>
            {onManageRecurring && (
              <button
                onClick={() => onManageRecurring()}
                style={{background:'none',border:'none',padding:0,fontSize:'0.68rem',fontWeight:600,color:'#A99BFA',cursor:'pointer',fontFamily:'var(--font-body)',flexShrink:0}}
              >
                Manage →
              </button>
            )}
          </div>
          {upcoming.map(r => {
            const info = CATEGORIES[r.category] || CATEGORIES['other'];
            const dueLabel = r.daysAway === 1 ? 'Tomorrow' : `in ${r.daysAway} days`;
            return (
              <div
                key={r.id}
                onClick={() => onManageRecurring && onManageRecurring(r.id)}
                style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,0.04)',cursor:onManageRecurring?'pointer':'default'}}
              >
                <div style={{width:40,height:40,borderRadius:13,background:`${info.color}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.05rem',flexShrink:0}}>
                  {info.icon}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:'0.84rem',fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {r.merchant?.trim() || r.name}
                  </div>
                  <div style={{fontSize:'0.63rem',color:'#5A6270',fontWeight:600,marginTop:2}}>
                    Day {r.dayOfMonth} · {dueLabel}
                  </div>
                </div>
                <div style={{fontSize:'0.92rem',fontWeight:800,color:'#8A93A0'}}>
                  ${r.amount.toFixed(2)}
                </div>
              </div>
            );
          })}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:12,paddingTop:12,borderTop:'1px solid rgba(255,255,255,0.06)'}}>
            <span style={{fontSize:'0.7rem',color:'#8A93A0',fontWeight:600}}>
              {upcoming.length} {upcoming.length === 1 ? 'bill' : 'bills'} left this month
            </span>
            <span style={{fontFamily:'var(--font-title)',fontSize:'1rem',fontWeight:800,color:'#A99BFA'}}>
              ${upcomingTotal.toFixed(2)}
            </span>
          </div>
          {/* Monarch-style month-in-progress: how much of the standing monthly
              bill commitment has already gone out, alongside what's still due. */}
          {recProgress && (
            <div style={{marginTop:10}}>
              <div style={{height:4,borderRadius:2,background:'#1B212B',overflow:'hidden'}}>
                <div style={{width:`${recProgress.pct}%`,height:'100%',background:'#34D399',borderRadius:2,transition:'width 0.4s ease'}} />
              </div>
              <p style={{fontSize:'0.64rem',fontWeight:600,color:'#5A6270',marginTop:6}}>
                <span style={{color:'#34D399'}}>${recProgress.paid.toFixed(2)} paid</span>
                {' '}of ${recProgress.committed.toFixed(2)} in bills this month
              </p>
            </div>
          )}
        </div>
      )}

      {/* Category breakdown */}
      {topCats.length > 0 && (
        <div className="glass-card">
          <h2 className="section-title" style={{marginBottom:14}}>
            <TrendingUp size={18} /> Breakdown · {periodLabel()}
          </h2>
          {topCats.map(([cat, amt]) => {
            const p = totalSpent > 0 ? Math.round(amt / totalSpent * 100) : 0;
            const info = CATEGORIES[cat] || CATEGORIES['other'];
            // Rocket Money-style category-limit awareness (monthly view only,
            // since category budgets are monthly limits set in Settings).
            const limit = dashFilter === 'monthly' ? catBudgets[cat] : null;
            // One shared limit rule (utils/categoryBudget.js), so this row and the
            // matching row in Settings' Category Budgets can never disagree about
            // the state, the colour or the wording. Includes the Copilot-style
            // at-risk check: under the limit today, but on pace to finish over it.
            const budgetLine = categoryBudgetStatus(amt, limit, paceProject);
            const overLimit = budgetLine?.state === 'over';
            // YNAB-style "progress at a glance": the share-of-spend bar now carries a
            // tick where this category's limit falls. The tick uses the *same*
            // denominator as the fill (totalSpent), so "fill has passed the tick" means
            // exactly "over limit" — no second scale to reconcile. Hidden when the limit
            // is larger than the period's total spend, i.e. off this bar's scale.
            const limitPct = limit > 0 && totalSpent > 0 ? (limit / totalSpent) * 100 : 0;
            const showLimitTick = limitPct > 0 && limitPct <= 100;
            return (
              <React.Fragment key={cat}>
              <div className="breakdown-row">
                <div className="breakdown-icon" style={{background:`${info.color}18`}}>{info.icon}</div>
                <div className="breakdown-meta">
                  <div className="breakdown-name">{info.label}</div>
                  <div className="breakdown-bar-bg" style={{position:'relative'}}>
                    <div
                      className="breakdown-bar-fill"
                      style={{width:`${p}%`,background:info.color}}
                    />
                    {showLimitTick && (
                      <div
                        title={`Limit $${limit}`}
                        style={{position:'absolute',left:`${limitPct}%`,top:0,bottom:0,width:2,marginLeft:-1,borderRadius:1,background:'rgba(244,246,248,0.55)'}}
                      />
                    )}
                  </div>
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <div className="breakdown-amount">${amt.toFixed(2)}</div>
                  <div className="breakdown-pct">{p}%</div>
                  {budgetLine && (
                    <div style={{fontSize:'0.6rem',fontWeight:600,color:budgetLine.color,marginTop:2}}>
                      {budgetLine.text}
                    </div>
                  )}
                  {/* Spendee-style one-tap flow: no limit yet → jump straight to
                      Settings' Category Budgets with this category pre-selected. */}
                  {!budgetLine && dashFilter === 'monthly' && onSetLimit && (
                    <button
                      onClick={() => onSetLimit(cat)}
                      style={{background:'none',border:'none',padding:0,marginTop:2,fontSize:'0.6rem',fontWeight:600,color:'#A99BFA',cursor:'pointer',fontFamily:'var(--font-body)'}}
                    >
                      Set a limit →
                    </button>
                  )}
                </div>
              </div>
              {/* YNAB "roll with the punches": an over-limit row points at the
                  categories that still have room, instead of dead-ending in red. */}
              {overLimit && catSlack.length > 0 && (
                <p style={{fontSize:'0.62rem',color:'#5A6270',fontWeight:600,margin:'-4px 0 8px',paddingLeft:42}}>
                  Cover it from{' '}
                  {catSlack.map((s, i) => (
                    <span key={s.k}>
                      {i > 0 && ' or '}
                      <span style={{color:'#8A93A0',fontWeight:700}}>{(CATEGORIES[s.k] || CATEGORIES['other']).label}</span>
                      {' '}
                      <span style={{color:'#34D399',fontWeight:700}}>(${s.left.toFixed(0)} left)</span>
                    </span>
                  ))}
                </p>
              )}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Recent transactions */}
      <div className="glass-card">
        <h2 className="section-title" style={{marginBottom:14}}>Recent · {periodLabel()}</h2>
        {pool.length === 0 ? (
          <EmptyState
            icon={expenses.length === 0 ? <ShoppingCart size={22} /> : <CalendarDays size={22} />}
            title={expenses.length === 0 ? 'No expenses yet' : 'Nothing this period'}
            message={expenses.length === 0
              ? 'Scan a receipt or add an expense to start tracking your spending.'
              : 'No transactions for the selected time range — try another period above.'}
          />
        ) : (
          pool.slice(0, 3).map(e => {
            const info = CATEGORIES[e.items?.[0]?.category] || CATEGORIES['other'];
            return (
              <div
                key={e.id}
                style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,0.04)',cursor:'pointer'}}
                onClick={onGoHistory}
              >
                <div style={{width:40,height:40,borderRadius:13,background:`${info.color}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.05rem',flexShrink:0}}>
                  {info.icon}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:'0.84rem',fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {e.merchant}
                  </div>
                  <div style={{fontSize:'0.63rem',color:'#5A6270',fontWeight:600,marginTop:2}}>
                    {relDate(e.date)}
                  </div>
                </div>
                <div style={{fontSize:'0.92rem',fontWeight:800,color:'#f43f5e'}}>
                  −${e.amount.toFixed(2)}
                </div>
              </div>
            );
          })
        )}
        {pool.length > 3 && (
          <div style={{textAlign:'center',marginTop:10}}>
            <button
              onClick={onGoHistory}
              style={{background:'none',border:'none',color:'#A99BFA',fontFamily:'var(--font-body)',fontSize:'0.74rem',fontWeight:700,cursor:'pointer'}}
            >
              View all {pool.length} transactions →
            </button>
          </div>
        )}
      </div>

      {/* Budget edit modal */}
      {editBudgetOpen && (
        <div className="confirm-overlay" onClick={() => setEditBudgetOpen(false)}>
          <div className="confirm-box" style={{maxWidth:320}} onClick={e => e.stopPropagation()}>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:'2rem',marginBottom:4}}>💰</div>
              <h3 style={{fontFamily:'var(--font-title)',fontSize:'1.1rem',fontWeight:800,marginBottom:4}}>Monthly Budget</h3>
              <p style={{fontSize:'0.75rem',color:'#8A93A0'}}>Set your max spending for this month</p>
            </div>
            <input
              type="number"
              inputMode="decimal"
              placeholder="e.g. 500"
              value={editBudgetVal}
              onChange={e => setEditBudgetVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSaveBudget(); }}
              className="input-element"
              style={{fontSize:'2rem',fontFamily:'var(--font-title)',fontWeight:800,textAlign:'center'}}
              autoFocus
            />
            {/* Quick chips */}
            <div style={{display:'flex',gap:8,flexWrap:'wrap',justifyContent:'center'}}>
              {[-100,-50,50,100,250].map(v => (
                <div
                  key={v}
                  className="helper-chip"
                  onClick={() => setEditBudgetVal(String(Math.max(1, (parseFloat(editBudgetVal) || 0) + v)))}
                >
                  {v > 0 ? '+' : ''}${v}
                </div>
              ))}
            </div>
            <div style={{display:'flex',gap:8}}>
              <button className="outline-btn" onClick={() => setEditBudgetOpen(false)} style={{flex:1,padding:12}}>
                <X size={16}/> Cancel
              </button>
              <button className="solid-btn" onClick={handleSaveBudget} style={{flex:2}}>
                <Check size={18}/> Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
