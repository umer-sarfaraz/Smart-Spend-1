import React, { useState } from 'react';
import { CATEGORIES } from '../utils/parser';
import { Plus, Camera, TrendingUp, AlertTriangle, X, Check } from 'lucide-react';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function Dashboard({
  expenses, budget, onOpenScan, onOpenManual, onSelectCategory,
  shoppingList = [], onToggleShoppingItem, onAddShoppingItem, onViewFullChecklist,
  customStores = [], onAddCustomStore, onSaveBudget, showToast
}) {
  const [quickAddName, setQuickAddName] = useState('');
  const [editBudgetOpen, setEditBudgetOpen] = useState(false);
  const [editBudgetVal, setEditBudgetVal] = useState(budget.toString());

  const safeShoppingList = (Array.isArray(shoppingList) ? shoppingList : []).filter(
    item => item && typeof item === 'object' && typeof item.name === 'string'
  );

  // Filter expenses to current month only
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentMonthLabel = `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;
  const monthlyExpenses = expenses.filter(exp => exp.date && exp.date.startsWith(currentMonthKey));

  const totalSpent = monthlyExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const percentSpent = Math.min(Math.round((totalSpent / budget) * 100), 100);
  const remainingBudget = Math.max(budget - totalSpent, 0);

  // Category breakdown from current month
  const categoryTotals = monthlyExpenses.reduce((acc, exp) => {
    exp.items.forEach(item => {
      const cat = item.category || 'other';
      acc[cat] = (acc[cat] || 0) + item.amount;
    });
    return acc;
  }, {});

  // SVG Ring
  const radius = 64;
  const stroke = 12;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentSpent / 100) * circumference;

  const getProgressColor = (percent) => {
    if (percent < 50) return '#10b981';
    if (percent < 85) return '#f59e0b';
    return '#f43f5e';
  };
  const ringColor = getProgressColor(percentSpent);

  const handleQuickAdd = (nameInput) => {
    if (!nameInput.trim()) return;
    onAddShoppingItem({ name: nameInput.trim(), checked: false, store: 'Walmart', category: 'other' });
    setQuickAddName('');
    if (showToast) showToast(`"${nameInput.trim()}" added to list ✓`);
  };

  const handleSaveBudget = () => {
    const val = parseFloat(editBudgetVal);
    if (!isNaN(val) && val > 0) {
      onSaveBudget(val);
      if (showToast) showToast('Monthly budget updated!');
    }
    setEditBudgetOpen(false);
  };

  return (
    <div className="dashboard-view">

      {/* Budget Ring Card */}
      <div className="glass-card budget-ring-container">
        <h2 className="section-title" style={{ alignSelf: 'flex-start' }}>
          <TrendingUp size={18} className="text-primary" /> {currentMonthLabel} Budget
        </h2>

        <div style={{ position: 'relative', width: 160, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg height={160} width={160} className="budget-glow-ring">
            <circle
              stroke="rgba(255, 255, 255, 0.04)"
              fill="transparent"
              strokeWidth={stroke}
              r={normalizedRadius}
              cx={radius + stroke}
              cy={radius + stroke}
            />
            <circle
              stroke={ringColor}
              fill="transparent"
              strokeWidth={stroke}
              strokeDasharray={circumference + ' ' + circumference}
              style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.8s ease-in-out' }}
              strokeLinecap="round"
              r={normalizedRadius}
              cx={radius + stroke}
              cy={radius + stroke}
              transform={`rotate(-90 ${radius + stroke} ${radius + stroke})`}
            />
          </svg>

          <div
            className="budget-stats-center"
            onClick={() => { setEditBudgetVal(budget.toString()); setEditBudgetOpen(true); }}
            style={{ cursor: 'pointer' }}
            title="Tap to edit budget"
          >
            <h3>${totalSpent.toFixed(2)}</h3>
            <p style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
              of ${budget} <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>✏️</span>
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-around', marginTop: 18, borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: 14 }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>REMAINING</p>
            <p style={{ fontFamily: 'var(--font-title)', fontSize: '1.1rem', fontWeight: 800, color: '#10b981' }}>
              ${remainingBudget.toFixed(2)}
            </p>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.06)' }}></div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>USAGE</p>
            <p style={{ fontFamily: 'var(--font-title)', fontSize: '1.1rem', fontWeight: 800, color: ringColor }}>
              {percentSpent}%
            </p>
          </div>
        </div>

        {/* No spending this month yet */}
        {monthlyExpenses.length === 0 && (
          <p style={{ fontSize: '0.72rem', color: '#64748b', textAlign: 'center', marginTop: '8px', fontStyle: 'italic' }}>
            No expenses logged this month yet. Tap Scan Bill or Add Manually to start!
          </p>
        )}
      </div>

      {/* Budget warning */}
      {percentSpent >= 85 && (
        <div className="tip-banner" style={{ background: 'linear-gradient(135deg, rgba(244,63,94,0.08), rgba(244,63,94,0.04))', borderColor: 'rgba(244,63,94,0.2)', color: '#fca5a5' }}>
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong>Budget alert!</strong> You've used {percentSpent}% of your {currentMonthLabel} budget.
          </div>
        </div>
      )}

      {/* Quick Action Buttons */}
      <div className="glass-card" style={{ display: 'flex', gap: '12px', padding: '16px', marginBottom: 0 }}>
        <button onClick={onOpenScan} className="solid-btn" style={{ flex: 1, padding: '12px 14px', borderRadius: '14px' }}>
          <Camera size={18} />
          <span>Scan Bill</span>
        </button>
        <button onClick={onOpenManual} className="outline-btn" style={{ flex: 1, padding: '12px 14px', borderRadius: '14px' }}>
          <Plus size={18} />
          <span>Add Manually</span>
        </button>
      </div>

      {/* Grocery Checklist Widget */}
      <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="section-title" style={{ marginBottom: 0, fontSize: '0.92rem' }}>
            🛒 Grocery Checklist
          </h2>
          <button
            onClick={onViewFullChecklist}
            className="outline-btn"
            style={{ width: 'auto', padding: '4px 10px', fontSize: '0.65rem', borderRadius: '10px' }}
          >
            View All
          </button>
        </div>

        {/* Quick Add Bar */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <input
            type="text"
            placeholder="Type item name, press Add..."
            value={quickAddName}
            onChange={(e) => setQuickAddName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleQuickAdd(quickAddName); } }}
            className="input-element"
            style={{ padding: '8px 12px', fontSize: '0.78rem', flex: 1 }}
          />
          <button
            type="button"
            onClick={() => handleQuickAdd(quickAddName)}
            className="solid-btn"
            style={{ width: 'auto', padding: '8px 12px', fontSize: '0.78rem', borderRadius: '10px' }}
          >
            Add
          </button>
        </div>

        {/* Active checklist items preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {safeShoppingList.filter(item => !item.checked).length > 0 ? (
            safeShoppingList
              .map((item, idx) => ({ ...item, originalIndex: idx }))
              .filter(item => !item.checked)
              .slice(0, 4)
              .map((item) => (
                <div
                  key={item.originalIndex}
                  onClick={() => onToggleShoppingItem(item.originalIndex)}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 10px', background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.04)', borderRadius: '10px',
                    cursor: 'pointer', fontSize: '0.78rem', transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '1.5px solid var(--slate-text)' }} />
                    <span style={{ fontWeight: 700 }}>{item.name}</span>
                  </div>
                  <span style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 700 }}>
                    {item.store || 'Walmart'}
                  </span>
                </div>
              ))
          ) : (
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontStyle: 'italic', textAlign: 'center', padding: '8px 0' }}>
              No active shopping items. Type above to add!
            </div>
          )}

          {safeShoppingList.filter(item => !item.checked).length > 4 && (
            <div
              onClick={onViewFullChecklist}
              style={{ fontSize: '0.68rem', color: 'var(--primary)', textAlign: 'center', fontWeight: 800, cursor: 'pointer', paddingTop: '4px' }}
            >
              + {safeShoppingList.filter(item => !item.checked).length - 4} more items — tap to view full list
            </div>
          )}
        </div>
      </div>

      {/* Sector Breakdown */}
      <div className="glass-card">
        <h2 className="section-title">
          <TrendingUp size={18} className="text-emerald" /> {currentMonthLabel} Breakdown
        </h2>
        <p style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '12px', marginTop: '-6px' }}>
          💡 Tap any category to view its detailed item timeline
        </p>
        <div className="category-bars">
          {Object.entries(CATEGORIES).map(([key, value]) => {
            const amount = categoryTotals[key] || 0;
            const percentage = totalSpent > 0 ? (amount / totalSpent) * 100 : 0;
            return (
              <div
                className="cat-bar-item" key={key}
                onClick={() => onSelectCategory(key)}
                style={{ cursor: 'pointer', padding: '4px', borderRadius: '8px', transition: 'background 0.2s ease' }}
              >
                <div className="cat-bar-meta">
                  <span className="cat-bar-title">
                    <span>{value.icon}</span><span>{value.label}</span>
                  </span>
                  <span style={{ color: amount > 0 ? '#fff' : '#64748b' }}>
                    ${amount.toFixed(2)} ({percentage.toFixed(0)}%)
                  </span>
                </div>
                <div className="cat-bar-bg">
                  <div className="cat-bar-fill" style={{ width: `${percentage}%`, background: value.gradient }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Inline Budget Edit Drawer */}
      {editBudgetOpen && (
        <div className="drawer-overlay" onClick={() => setEditBudgetOpen(false)}>
          <div className="drawer-sheet" onClick={e => e.stopPropagation()}>
            <div className="drawer-drag-handle" />
            <div className="drawer-header">
              <h3>✏️ Edit Monthly Budget</h3>
              <button onClick={() => setEditBudgetOpen(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '12px' }}>
              Set the maximum you plan to spend this month.
            </p>
            <input
              type="number"
              step="1"
              min="1"
              value={editBudgetVal}
              onChange={e => setEditBudgetVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSaveBudget(); }}
              className="input-element"
              style={{ fontSize: '1.4rem', fontFamily: 'var(--font-title)', fontWeight: 800, marginBottom: '14px' }}
              autoFocus
            />
            <button className="solid-btn" onClick={handleSaveBudget}>
              <Check size={18} /> Save Budget
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
