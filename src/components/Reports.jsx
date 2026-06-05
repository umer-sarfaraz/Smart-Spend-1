import React, { useState, useMemo } from 'react';
import { CATEGORIES } from '../utils/parser';
import { TrendingUp, ShoppingCart, X, Trash2 } from 'lucide-react';

const CAT_GRAD = {
  vegetables:'#10b981', fruits:'#f43f5e', dairy:'#94a3b8', meat:'#fb7185',
  bakery:'#fbbf24', dining:'#f97316', fuel:'#fbbf24', utilities:'#818cf8',
  shopping:'#2dd4bf', entertainment:'#f472b6', fitness:'#a3e635',
  education:'#22d3ee', rent:'#818cf8', other:'#9ca3af'
};

export default function Reports({ expenses, onDelete }) {
  const [period, setPeriod]       = useState('monthly');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo,   setCustomTo]   = useState('');
  const [bdMode,     setBdMode]     = useState('category');
  const [filterKey,  setFilterKey]  = useState(null);
  const [detailExp,  setDetailExp]  = useState(null);

  // ── Pool filtered by period ──────────────────────────────────────────────────
  const pool = useMemo(() => {
    const now   = new Date();
    const today = now.toISOString().split('T')[0];
    if (period === 'today') return expenses.filter(e => e.date === today);
    if (period === 'weekly') {
      const d = new Date(); d.setDate(d.getDate() - 7);
      return expenses.filter(e => e.date >= d.toISOString().split('T')[0]);
    }
    if (period === 'monthly') {
      const key = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
      return expenses.filter(e => e.date.startsWith(key));
    }
    if (period === 'custom' && customFrom && customTo)
      return expenses.filter(e => e.date >= customFrom && e.date <= customTo);
    return expenses;
  }, [expenses, period, customFrom, customTo]);

  const periodTotal = pool.reduce((s, e) => s + e.amount, 0);

  const periodLabel = () => {
    const now = new Date();
    if (period === 'today')   return 'Today';
    if (period === 'weekly')  return 'Last 7 Days';
    if (period === 'monthly') return now.toLocaleDateString('en-US',{month:'long',year:'numeric'});
    if (period === 'custom' && customFrom && customTo) {
      const fmt = s => new Date(s+'T12:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});
      return `${fmt(customFrom)} – ${fmt(customTo)}`;
    }
    return 'All Time';
  };

  // ── Breakdown data ───────────────────────────────────────────────────────────
  const bdRows = useMemo(() => {
    if (bdMode === 'category') {
      const t = {};
      pool.forEach(e => e.items.forEach(i => { const c = i.category||'other'; t[c]=(t[c]||0)+i.amount; }));
      return Object.entries(t).sort((a,b)=>b[1]-a[1]).map(([key,amt]) => ({
        key, label: CATEGORIES[key]?.label || key,
        icon: CATEGORIES[key]?.icon || '📦',
        bg: `${CATEGORIES[key]?.color||'#6366f1'}18`,
        fill: CAT_GRAD[key]||'#6366f1', amt,
        pct: periodTotal > 0 ? Math.round(amt/periodTotal*100) : 0
      }));
    } else {
      const t = {};
      pool.forEach(e => { t[e.merchant]=(t[e.merchant]||0)+e.amount; });
      const colors = ['#6366f1','#10b981','#f59e0b','#f43f5e','#8b5cf6','#0ea5e9','#f97316'];
      return Object.entries(t).sort((a,b)=>b[1]-a[1]).map(([key,amt],i) => ({
        key, label: key, icon: '🏪',
        bg: 'rgba(99,102,241,0.1)', fill: colors[i%colors.length], amt,
        pct: periodTotal > 0 ? Math.round(amt/periodTotal*100) : 0
      }));
    }
  }, [pool, bdMode, periodTotal]);

  // ── Filtered transaction list ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!filterKey) return pool;
    if (bdMode === 'category') return pool.filter(e => e.items.some(i=>(i.category||'other')===filterKey));
    return pool.filter(e => e.merchant === filterKey);
  }, [pool, filterKey, bdMode]);

  const grouped = useMemo(() => {
    const g = {};
    filtered.forEach(e => {
      const d = new Date(e.date+'T12:00');
      const k = d.toLocaleDateString('en-US',{month:'long',year:'numeric'});
      if (!g[k]) g[k] = { items:[], total:0 };
      g[k].items.push(e);
      g[k].total += e.amount;
    });
    return g;
  }, [filtered]);

  const relDate = s => {
    const diff = Math.round((Date.now()-new Date(s+'T12:00'))/864e5);
    if (diff===0) return 'Today'; if (diff===1) return 'Yesterday';
    if (diff<7) return diff+' days ago';
    return new Date(s+'T12:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});
  };

  // ── Merchant total for detail sheet ─────────────────────────────────────────
  const merchantTotal = detailExp
    ? pool.filter(e=>e.merchant===detailExp.merchant).reduce((s,e)=>s+e.amount,0)
    : 0;
  const merchantVisits = detailExp
    ? pool.filter(e=>e.merchant===detailExp.merchant).length
    : 0;

  return (
    <div>
      {/* Time filter tabs */}
      <div className="time-tabs">
        {[['today','Today'],['weekly','Week'],['monthly','Month'],['custom','Custom']].map(([k,l]) => (
          <div key={k} className={`time-tab${period===k?' active':''}`}
            onClick={() => { setPeriod(k); setFilterKey(null); if(k!=='custom'){setCustomFrom('');setCustomTo('');} }}>
            {l}
          </div>
        ))}
      </div>

      {/* Custom date range */}
      {period === 'custom' && (
        <div className="date-range-row">
          <input type="date" className="date-range-input" value={customFrom} onChange={e=>setCustomFrom(e.target.value)} />
          <span className="date-range-sep">→</span>
          <input type="date" className="date-range-input" value={customTo}   onChange={e=>setCustomTo(e.target.value)} />
        </div>
      )}

      {/* Period banner */}
      <div className="period-banner">
        <span className="period-banner-lbl">{periodLabel()}</span>
        <span className="period-banner-amt">${periodTotal.toFixed(2)} spent</span>
      </div>

      {/* Breakdown card */}
      <div className="glass-card" style={{marginBottom:12}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
          <h2 className="section-title" style={{marginBottom:0}}>
            <TrendingUp size={16} style={{marginRight:6,verticalAlign:'middle'}} />
            Breakdown
          </h2>
          <span style={{fontSize:'0.62rem',color:'#64748b',fontWeight:700}}>Tap row to filter ↓</span>
        </div>

        {/* By Category / By Store toggle */}
        <div style={{display:'flex',gap:6,marginBottom:12}}>
          {[['category','By Category'],['store','By Store']].map(([k,l]) => (
            <button key={k}
              onClick={() => { setBdMode(k); setFilterKey(null); }}
              style={{
                flex:1, padding:'7px', borderRadius:11, border:'1.5px solid',
                fontFamily:'var(--font-body)', fontSize:'0.72rem', fontWeight:700, cursor:'pointer',
                background: bdMode===k?'rgba(99,102,241,0.12)':'rgba(255,255,255,0.04)',
                borderColor: bdMode===k?'#6366f1':'rgba(255,255,255,0.08)',
                color: bdMode===k?'white':'#64748b'
              }}
            >{l}</button>
          ))}
        </div>

        {bdRows.length === 0 ? (
          <p style={{fontSize:'0.75rem',color:'#64748b',textAlign:'center',padding:'12px 0'}}>
            No data for this period.
          </p>
        ) : bdRows.map(r => (
          <div key={r.key} className="breakdown-row" onClick={() => setFilterKey(filterKey===r.key?null:r.key)}>
            <div className="breakdown-icon" style={{background:r.bg}}>{r.icon}</div>
            <div className="breakdown-meta">
              <div className="breakdown-name" style={{color:filterKey===r.key?'#a5b4fc':undefined}}>{r.label}</div>
              <div className="breakdown-bar-bg">
                <div className="breakdown-bar-fill" style={{width:`${r.pct}%`,background:r.fill}} />
              </div>
            </div>
            <div style={{textAlign:'right',flexShrink:0}}>
              <div className="breakdown-amount">${r.amt.toFixed(2)}</div>
              <div className="breakdown-pct">{r.pct}%</div>
            </div>
          </div>
        ))}
      </div>

      {/* Active filter bar */}
      {filterKey && (
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'9px 14px',marginBottom:10,background:'rgba(99,102,241,0.1)',border:'1px solid rgba(99,102,241,0.25)',borderRadius:13}}>
          <span style={{fontSize:'0.76rem',fontWeight:700,color:'white'}}>Showing: {filterKey}</span>
          <button onClick={()=>setFilterKey(null)} style={{background:'none',border:'none',color:'#6366f1',fontFamily:'var(--font-body)',fontSize:'0.72rem',fontWeight:700,cursor:'pointer'}}>✕ Clear</button>
        </div>
      )}

      {/* Transaction list */}
      {Object.keys(grouped).length === 0 ? (
        <div style={{textAlign:'center',padding:'40px 16px',color:'#64748b'}}>
          <div style={{fontSize:'2.4rem',marginBottom:10}}>📊</div>
          <p style={{fontSize:'0.82rem',fontWeight:600}}>No transactions for this period.</p>
        </div>
      ) : Object.entries(grouped).map(([month, { items, total }]) => (
        <div key={month} style={{marginBottom:20}}>
          <div style={{fontSize:'0.67rem',fontWeight:800,textTransform:'uppercase',letterSpacing:'0.07em',color:'#64748b',marginBottom:9,padding:'0 2px'}}>
            {month} · ${total.toFixed(2)} total
          </div>
          {items.map(e => {
            const info = CATEGORIES[e.items?.[0]?.category] || CATEGORIES['other'];
            return (
              <div key={e.id} className="glass-card" style={{padding:'13px',marginBottom:8,cursor:'pointer',display:'flex',alignItems:'center',gap:12}}
                onClick={()=>setDetailExp(e)}>
                <div style={{width:44,height:44,borderRadius:14,background:`${info.color}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.15rem',flexShrink:0}}>
                  {info.icon}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:'0.87rem',fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.merchant}</div>
                  <div style={{fontSize:'0.63rem',color:'#64748b',marginTop:3,textTransform:'capitalize'}}>
                    {e.items?.[0]?.category || 'expense'}
                  </div>
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <div style={{fontSize:'0.9rem',fontWeight:800,color:'#f43f5e'}}>−${e.amount.toFixed(2)}</div>
                  <div style={{fontSize:'0.61rem',color:'#64748b',marginTop:3}}>{relDate(e.date)}</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" style={{flexShrink:0,opacity:0.4}}>
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
            );
          })}
        </div>
      ))}

      {/* Transaction detail sheet */}
      {detailExp && (
        <div className="confirm-overlay" onClick={()=>setDetailExp(null)}>
          <div className="confirm-box" style={{maxWidth:400,padding:'20px'}} onClick={e=>e.stopPropagation()}>
            {/* Header */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
              <div>
                <div style={{fontSize:'1.05rem',fontWeight:800,marginBottom:3}}>{detailExp.merchant}</div>
                <div style={{fontSize:'0.7rem',color:'#64748b',fontWeight:600}}>
                  {new Date(detailExp.date+'T12:00').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}
                  {' · '}Total: ${detailExp.amount.toFixed(2)}
                </div>
              </div>
              <button onClick={()=>setDetailExp(null)} style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#94a3b8',flexShrink:0}}>
                <X size={16}/>
              </button>
            </div>

            {/* Line items */}
            <div style={{marginBottom:16}}>
              {(detailExp.items||[]).map((item,i) => {
                const info = CATEGORIES[item.category] || CATEGORIES['other'];
                return (
                  <div key={i} className="txn-detail-item">
                    <div className="txn-detail-ico" style={{background:`${info.color}18`}}>{info.icon}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:'0.84rem',fontWeight:600}}>{item.name}</div>
                      <div style={{fontSize:'0.62rem',color:'#64748b',marginTop:2,textTransform:'capitalize'}}>{item.category}</div>
                    </div>
                    <div style={{fontSize:'0.86rem',fontWeight:800}}>${item.amount.toFixed(2)}</div>
                  </div>
                );
              })}
            </div>

            {/* Period note */}
            <div className="period-note">
              <div style={{fontSize:'0.68rem',color:'#94a3b8',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6}}>
                📅 {periodLabel()}
              </div>
              <div style={{fontSize:'0.92rem',fontWeight:800}}>${merchantTotal.toFixed(2)} at {detailExp.merchant}</div>
              <div style={{fontSize:'0.65rem',color:'#64748b',marginTop:2}}>{merchantVisits} visit{merchantVisits!==1?'s':''} this period</div>
            </div>

            {/* Delete + Close */}
            <div style={{display:'flex',gap:8,marginTop:14}}>
              <button
                onClick={()=>{onDelete(detailExp.id);setDetailExp(null);}}
                style={{flex:1,padding:'11px',background:'rgba(244,63,94,0.08)',border:'1px solid rgba(244,63,94,0.2)',borderRadius:13,color:'#f43f5e',fontFamily:'var(--font-body)',fontSize:'0.82rem',fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}
              >
                <Trash2 size={14}/> Delete
              </button>
              <button
                onClick={()=>setDetailExp(null)}
                style={{flex:2,padding:'11px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:13,color:'#94a3b8',fontFamily:'var(--font-body)',fontSize:'0.82rem',fontWeight:700,cursor:'pointer'}}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
