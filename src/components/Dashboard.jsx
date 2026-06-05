import React, { useState, useCallback } from 'react';
import { CATEGORIES } from '../utils/parser';
import { TrendingUp, AlertTriangle, X, Check } from 'lucide-react';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const CAT_GRAD = {
  vegetables:'#10b981', fruits:'#f43f5e', dairy:'#94a3b8', meat:'#fb7185',
  bakery:'#fbbf24', dining:'#f97316', fuel:'#fbbf24', utilities:'#818cf8',
  shopping:'#2dd4bf', entertainment:'#f472b6', fitness:'#a3e635',
  education:'#22d3ee', rent:'#818cf8', other:'#9ca3af'
};

export default function Dashboard({
  expenses, budget, onSaveBudget, showToast,
  dashFilter, dashFrom, dashTo,
  setDashFilter, setDashFrom, setDashTo, onGoHistory
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

  const color = pct < 50 ? '#10b981' : pct < 85 ? '#f59e0b' : '#f43f5e';
  const R = 68;
  const circ = 2 * Math.PI * R;
  const off = circ - (pct / 100) * circ;

  // Category breakdown
  const catTotals = {};
  pool.forEach(e => {
    e.items.forEach(item => {
      const c = item.category || 'other';
      catTotals[c] = (catTotals[c] || 0) + item.amount;
    });
  });
  const topCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);

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
        <div style={{display:'flex',width:'100%',justifyContent:'space-around',marginTop:18,borderTop:'1px solid rgba(255,255,255,0.06)',paddingTop:14}}>
          <div style={{textAlign:'center'}}>
            <p style={{fontSize:'0.7rem',color:'#94a3b8',fontWeight:600}}>
              {dashFilter === 'monthly' ? 'REMAINING' : 'BUDGET'}
            </p>
            <p style={{fontFamily:'var(--font-title)',fontSize:'1.1rem',fontWeight:800,color:'#10b981'}}>
              {dashFilter === 'monthly' ? `$${remaining.toFixed(2)}` : `$${budget}`}
            </p>
          </div>
          <div style={{width:1,background:'rgba(255,255,255,0.06)'}}></div>
          <div style={{textAlign:'center'}}>
            <p style={{fontSize:'0.7rem',color:'#94a3b8',fontWeight:600}}>USAGE</p>
            <p style={{fontFamily:'var(--font-title)',fontSize:'1.1rem',fontWeight:800,color}}>{pct}%</p>
          </div>
        </div>
        {pool.length === 0 && (
          <p style={{fontSize:'0.72rem',color:'#64748b',textAlign:'center',marginTop:'8px',fontStyle:'italic'}}>
            No expenses for this period.
          </p>
        )}
      </div>

      {/* Alert */}
      {pct >= 85 && dashFilter === 'monthly' && (
        <div className="tip-banner" style={{background:'linear-gradient(135deg,rgba(244,63,94,0.08),rgba(244,63,94,0.04))',borderColor:'rgba(244,63,94,0.2)',color:'#fca5a5'}}>
          <AlertTriangle size={18} style={{flexShrink:0,marginTop:1}} />
          <div><strong>Budget alert!</strong> You've used {pct}% of your budget.</div>
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
            return (
              <div key={cat} className="breakdown-row">
                <div className="breakdown-icon" style={{background:`${info.color}18`}}>{info.icon}</div>
                <div className="breakdown-meta">
                  <div className="breakdown-name">{info.label}</div>
                  <div className="breakdown-bar-bg">
                    <div
                      className="breakdown-bar-fill"
                      style={{width:`${p}%`,background:CAT_GRAD[cat]||info.color}}
                    />
                  </div>
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <div className="breakdown-amount">${amt.toFixed(2)}</div>
                  <div className="breakdown-pct">{p}%</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recent transactions */}
      <div className="glass-card">
        <h2 className="section-title" style={{marginBottom:14}}>Recent · {periodLabel()}</h2>
        {pool.length === 0 ? (
          <p style={{fontSize:'0.72rem',color:'#64748b',textAlign:'center',fontStyle:'italic',padding:'8px 0'}}>
            No transactions this period.
          </p>
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
                  <div style={{fontSize:'0.63rem',color:'#64748b',fontWeight:600,marginTop:2}}>
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
              style={{background:'none',border:'none',color:'#6366f1',fontFamily:'var(--font-body)',fontSize:'0.74rem',fontWeight:700,cursor:'pointer'}}
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
              <p style={{fontSize:'0.75rem',color:'#94a3b8'}}>Set your max spending for this month</p>
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
