import React, { useState, useMemo } from 'react';
import { CATEGORIES } from '../utils/parser';
import { TrendingUp, ShoppingCart, X, Trash2, Search, CalendarDays } from 'lucide-react';
import EmptyState from './EmptyState';

const CAT_GRAD = {
  vegetables:'#34D399', fruits:'#f43f5e', dairy:'#8A93A0', meat:'#fb7185',
  bakery:'#f59e0b', dining:'#f97316', fuel:'#f59e0b', utilities:'#A99BFA',
  shopping:'#2dd4bf', entertainment:'#f472b6', fitness:'#a3e635',
  education:'#22d3ee', rent:'#A99BFA', other:'#9ca3af'
};

export default function Reports({ expenses, onDelete }) {
  const [period, setPeriod]       = useState('monthly');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo,   setCustomTo]   = useState('');
  const [bdMode,     setBdMode]     = useState('category');
  const [filterKey,  setFilterKey]  = useState(null);
  const [detailExp,  setDetailExp]  = useState(null);
  const [search,     setSearch]     = useState('');

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
        bg: `${CATEGORIES[key]?.color||'#A99BFA'}18`,
        fill: CAT_GRAD[key]||'#A99BFA', amt,
        pct: periodTotal > 0 ? Math.round(amt/periodTotal*100) : 0
      }));
    } else {
      const t = {};
      pool.forEach(e => { t[e.merchant]=(t[e.merchant]||0)+e.amount; });
      const colors = ['#A99BFA','#34D399','#f59e0b','#f43f5e','#A99BFA','#0ea5e9','#f97316'];
      return Object.entries(t).sort((a,b)=>b[1]-a[1]).map(([key,amt],i) => ({
        key, label: key, icon: '🏪',
        bg: 'rgba(169, 155, 250,0.1)', fill: colors[i%colors.length], amt,
        pct: periodTotal > 0 ? Math.round(amt/periodTotal*100) : 0
      }));
    }
  }, [pool, bdMode, periodTotal]);

  // ── Filtered transaction list ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let out = pool;
    if (filterKey) {
      out = bdMode === 'category'
        ? out.filter(e => e.items.some(i => (i.category || 'other') === filterKey))
        : out.filter(e => e.merchant === filterKey);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      out = out.filter(e =>
        e.merchant?.toLowerCase().includes(q) ||
        e.items?.some(i => i.name?.toLowerCase().includes(q)) ||
        e.amount?.toFixed(2).includes(q)
      );
    }
    return out;
  }, [pool, filterKey, bdMode, search]);

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

  const hasAnyData = expenses.length > 0;
  const narrowFiltersActive = search.trim() !== '' || filterKey !== null;
  const clearNarrowFilters = () => { setSearch(''); setFilterKey(null); };

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

      {/* Search box */}
      <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',marginBottom:10,background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14}}>
        <Search size={15} style={{color:'#5A6270',flexShrink:0}} />
        <input
          type="text"
          placeholder="Search store, item or amount…"
          value={search}
          onChange={e=>setSearch(e.target.value)}
          style={{flex:1,background:'none',border:'none',outline:'none',color:'#F4F6F8',fontSize:'0.84rem',fontFamily:'var(--font-body)'}}
        />
        {search && (
          <button onClick={()=>setSearch('')} style={{background:'none',border:'none',color:'#5A6270',cursor:'pointer',display:'flex',padding:2}}>
            <X size={14}/>
          </button>
        )}
      </div>

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
          <span style={{fontSize:'0.62rem',color:'#5A6270',fontWeight:700}}>Tap row to filter ↓</span>
        </div>

        {/* By Category / By Store toggle */}
        <div style={{display:'flex',gap:6,marginBottom:12}}>
          {[['category','By Category'],['store','By Store']].map(([k,l]) => (
            <button key={k}
              onClick={() => { setBdMode(k); setFilterKey(null); }}
              style={{
                flex:1, padding:'7px', borderRadius:11, border:'1.5px solid',
                fontFamily:'var(--font-body)', fontSize:'0.72rem', fontWeight:700, cursor:'pointer',
                background: bdMode===k?'rgba(169, 155, 250,0.12)':'rgba(255,255,255,0.04)',
                borderColor: bdMode===k?'#A99BFA':'rgba(255,255,255,0.08)',
                color: bdMode===k?'white':'#5A6270'
              }}
            >{l}</button>
          ))}
        </div>

        {bdRows.length === 0 ? (
          <p style={{fontSize:'0.75rem',color:'#5A6270',textAlign:'center',padding:'12px 0'}}>
            No data for this period.
          </p>
        ) : bdRows.map(r => (
          <div key={r.key} className="breakdown-row" onClick={() => setFilterKey(filterKey===r.key?null:r.key)}>
            <div className="breakdown-icon" style={{background:r.bg}}>{r.icon}</div>
            <div className="breakdown-meta">
              <div className="breakdown-name" style={{color:filterKey===r.key?'#CDC5FC':undefined}}>{r.label}</div>
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
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'9px 14px',marginBottom:10,background:'rgba(169, 155, 250,0.1)',border:'1px solid rgba(169, 155, 250,0.25)',borderRadius:13}}>
          <span style={{fontSize:'0.76rem',fontWeight:700,color:'white'}}>Showing: {filterKey}</span>
          <button onClick={()=>setFilterKey(null)} style={{background:'none',border:'none',color:'#A99BFA',fontFamily:'var(--font-body)',fontSize:'0.72rem',fontWeight:700,cursor:'pointer'}}>✕ Clear</button>
        </div>
      )}

      {/* Transaction list */}
      {Object.keys(grouped).length === 0 ? (
        !hasAnyData ? (
          <EmptyState
            icon={<ShoppingCart size={22} />}
            title="No expenses yet"
            message="Scan a receipt or add an expense to start tracking your spending."
          />
        ) : narrowFiltersActive ? (
          <EmptyState
            icon={<Search size={22} />}
            title="No transactions match your filters"
            message="Try a different search, or clear the category/store filter."
            showClear
            onClear={clearNarrowFilters}
          />
        ) : (
          <EmptyState
            icon={<CalendarDays size={22} />}
            title="Nothing this period"
            message="No transactions in the selected period — try another period above."
          />
        )
      ) : Object.entries(grouped).map(([month, { items, total }]) => (
        <div key={month} style={{marginBottom:20}}>
          <div style={{fontSize:'0.67rem',fontWeight:800,textTransform:'uppercase',letterSpacing:'0.07em',color:'#5A6270',marginBottom:9,padding:'0 2px'}}>
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
                  <div style={{fontSize:'0.63rem',color:'#5A6270',marginTop:3,textTransform:'capitalize'}}>
                    {e.items?.[0]?.category || 'expense'}
                  </div>
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <div style={{fontSize:'0.9rem',fontWeight:800,color:'#f43f5e'}}>−${e.amount.toFixed(2)}</div>
                  <div style={{fontSize:'0.61rem',color:'#5A6270',marginTop:3}}>{relDate(e.date)}</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5A6270" strokeWidth="2" strokeLinecap="round" style={{flexShrink:0,opacity:0.4}}>
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
                <div style={{fontSize:'0.7rem',color:'#5A6270',fontWeight:600}}>
                  {new Date(detailExp.date+'T12:00').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}
                  {' · '}Total: ${detailExp.amount.toFixed(2)}
                </div>
              </div>
              <button onClick={()=>setDetailExp(null)} style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#8A93A0',flexShrink:0}}>
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
                      <div style={{fontSize:'0.62rem',color:'#5A6270',marginTop:2,textTransform:'capitalize'}}>{item.category}</div>
                    </div>
                    <div style={{fontSize:'0.86rem',fontWeight:800}}>${item.amount.toFixed(2)}</div>
                  </div>
                );
              })}
            </div>

            {/* Period note */}
            <div className="period-note">
              <div style={{fontSize:'0.68rem',color:'#8A93A0',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6}}>
                📅 {periodLabel()}
              </div>
              <div style={{fontSize:'0.92rem',fontWeight:800}}>${merchantTotal.toFixed(2)} at {detailExp.merchant}</div>
              <div style={{fontSize:'0.65rem',color:'#5A6270',marginTop:2}}>{merchantVisits} visit{merchantVisits!==1?'s':''} this period</div>
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
                style={{flex:2,padding:'11px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:13,color:'#8A93A0',fontFamily:'var(--font-body)',fontSize:'0.82rem',fontWeight:700,cursor:'pointer'}}
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
