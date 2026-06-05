import React, { useState, useRef } from 'react';
import { Save, Download, Trash2, Info, Upload, BookOpen, Plus, X, AlertTriangle, Check } from 'lucide-react';
import confetti from 'canvas-confetti';
import { CATEGORIES } from '../utils/parser';

export default function Settings({
  budget, onSaveBudget, onResetData, expenses, onSaveAllExpenses,
  customSuggestions = [], onSaveCustomSuggestions, customStores = [], showToast,
  stores = [], onUpdateStores
}) {
  const [budgetVal, setBudgetVal] = useState(budget);

  // In-app confirm modal state
  const [confirmState, setConfirmState] = useState(null); // { message, onConfirm }

  // Stores section
  const [storesOpen, setStoresOpen] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');

  const importFileRef = useRef(null);

  const showConfirm = (message, onConfirm) => {
    setConfirmState({ message, onConfirm });
  };
  const dismissConfirm = () => setConfirmState(null);

  const handleSaveBudget = (e) => {
    e.preventDefault();
    onSaveBudget(parseFloat(budgetVal) || 1000);
    if (showToast) showToast('Monthly budget updated ✓');
  };

  const addStore = () => {
    if (newStoreName.trim() && !stores.includes(newStoreName.trim())) {
      onUpdateStores([...stores, newStoreName.trim()]);
      setNewStoreName('');
      if (showToast) showToast('Store added ✓');
    }
  };

  // 1. CSV EXPORTER
  const handleExportCSV = () => {
    if (expenses.length === 0) {
      if (showToast) showToast('No expense records to export yet', 'error');
      return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Date,Store/Merchant,Item Name,Item Cost,Item Category\r\n';

    expenses.forEach(exp => {
      exp.items.forEach(item => {
        const cleanMerchant = exp.merchant.replace(/"/g, '""');
        const cleanItemName = item.name.replace(/"/g, '""');
        csvContent += `"${exp.date}","${cleanMerchant}","${cleanItemName}",${item.amount},"${item.category}"\r\n`;
      });
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SmartSpend_Backup_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (showToast) showToast('Backup CSV downloaded ✓');
  };

  // 2. CSV IMPORTER
  const handleImportCSV = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const csvText = reader.result;
        const lines = csvText.split('\n');

        const reconstructed = {};

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const matches = line.match(/"([^"]*)"/g);

          if (matches && matches.length >= 4) {
            const date = matches[0].replace(/"/g, '');
            const merchant = matches[1].replace(/"/g, '');
            const itemName = matches[2].replace(/"/g, '');

            const splitParts = line.split(',');
            const amount = parseFloat(splitParts[splitParts.length - 2]);
            const category = splitParts[splitParts.length - 1].replace(/"/g, '').trim();

            const groupKey = `${date}_${merchant}`;

            if (!reconstructed[groupKey]) {
              reconstructed[groupKey] = {
                id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 5),
                merchant: merchant,
                date: date,
                isGasMeter: category === 'fuel',
                amount: 0,
                items: []
              };
            }

            reconstructed[groupKey].items.push({ name: itemName, amount: amount, category: category });
            reconstructed[groupKey].amount += amount;
          }
        }

        const finalExpenses = Object.values(reconstructed);

        if (finalExpenses.length === 0) {
          throw new Error('No valid transactions found in CSV file.');
        }

        showConfirm(
          `Found ${finalExpenses.length} transaction${finalExpenses.length !== 1 ? 's' : ''} in this backup. Merge them with your current history?`,
          () => {
            onSaveAllExpenses([...finalExpenses, ...expenses]);
            try {
              confetti({ particleCount: 100, spread: 70, origin: { y: 0.8 }, colors: ['#6366f1', '#10b981'] });
            } catch (err) {}
            if (showToast) showToast(`${finalExpenses.length} bills restored from backup ✓`);
          }
        );
      } catch (err) {
        console.error(err);
        if (showToast) showToast("Could not read backup — make sure it's a valid SmartSpend CSV", 'error');
      }
    };
    reader.readAsText(file);
    // Reset file input so the same file can be re-selected
    e.target.value = '';
  };

  const triggerReset = () => {
    showConfirm(
      'This will permanently delete ALL your expense records and cannot be undone. Are you sure?',
      () => {
        onResetData();
        if (showToast) showToast('All data cleared', 'info');
      }
    );
  };

  return (
    <div className="settings-view" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* In-app Confirm Modal */}
      {confirmState && (
        <div className="confirm-overlay" onClick={dismissConfirm}>
          <div className="confirm-box" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '18px' }}>
              <AlertTriangle size={22} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: '0.88rem', color: '#e2e8f0', lineHeight: 1.55 }}>{confirmState.message}</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={dismissConfirm} className="outline-btn" style={{ flex: 1, padding: '11px', fontSize: '0.82rem', borderRadius: '12px' }}>
                Cancel
              </button>
              <button
                onClick={() => { confirmState.onConfirm(); dismissConfirm(); }}
                className="solid-btn"
                style={{ flex: 1, padding: '11px', fontSize: '0.82rem', borderRadius: '12px', background: 'linear-gradient(135deg, #f43f5e, #e11d48)' }}
              >
                <Check size={16} /> Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. Monthly Budget Configuration */}
      <div className="glass-card">
        <h2 className="section-title">📊 Spending Target</h2>
        <form onSubmit={handleSaveBudget} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
            <label>Monthly Budget Limit ($)</label>
            <input
              type="number"
              value={budgetVal}
              onChange={(e) => setBudgetVal(e.target.value)}
              className="input-element"
              style={{ fontFamily: 'var(--font-title)', fontWeight: 800 }}
            />
          </div>
          <button type="submit" className="solid-btn" style={{ width: 'auto', padding: '14px' }}>
            <Save size={18} />
          </button>
        </form>
      </div>

      {/* 2. Stores Management */}
      <div className="glass-card" onClick={() => setStoresOpen(!storesOpen)} style={{ cursor: 'pointer' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: '0.95rem' }}>🏪 Manage Stores</p>
            <p style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>Add or remove store names used across the app</p>
          </div>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>
            {stores.length} stores {storesOpen ? '▲' : '→'}
          </span>
        </div>
        {storesOpen && (
          <div style={{ marginTop: 14 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                className="input-element"
                placeholder="Add new store name…"
                value={newStoreName}
                onChange={e => setNewStoreName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addStore();
                  }
                }}
                style={{ flex: 1, padding: '10px 12px', fontSize: '0.84rem' }}
              />
              <button
                className="solid-btn"
                style={{ width: 'auto', padding: '10px 14px', borderRadius: 12 }}
                onClick={addStore}
              >
                ＋
              </button>
            </div>
            {stores.map((s, i) => (
              <div key={i} className="store-list-item">
                <span style={{ fontSize: '1rem' }}>🏪</span>
                <span className="store-list-name">{s}</span>
                {stores.length > 1 && (
                  <button
                    className="store-remove-btn"
                    onClick={() => onUpdateStores(stores.filter((_, j) => j !== i))}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Portability Data Utilities (Backup & Restore) */}
      <div className="glass-card">
        <h2 className="section-title">📂 Data Backup & Excel Sync</h2>
        <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '14px', lineHeight: '1.4' }}>
          Own your expense records. Back up your transactions directly as a CSV spreadsheet, or import a saved backup sheet to restore your database.
        </p>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleExportCSV} className="outline-btn" style={{ flex: 1, padding: '12px 14px', fontSize: '0.82rem' }}>
            <Download size={16} /> Export Backup
          </button>

          <button onClick={() => importFileRef.current?.click()} className="outline-btn" style={{ flex: 1, padding: '12px 14px', fontSize: '0.82rem' }}>
            <Upload size={16} /> Import Backup
          </button>
        </div>

        <input
          ref={importFileRef}
          type="file"
          accept=".csv"
          onChange={handleImportCSV}
          style={{ display: 'none' }}
        />
      </div>

      {/* 4. Learned Household Dictionary */}
      <div className="glass-card">
        <h2 className="section-title" style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BookOpen size={18} /> Learned Household Dictionary
        </h2>
        <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '14px', lineHeight: '1.4' }}>
          These are custom items SmartSpend has learned from your scanned photos or manual checklist edits. They pop up as quick suggestions forever!
        </p>

        {customSuggestions && customSuggestions.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px', maxHeight: '180px', overflowY: 'auto', padding: '4px' }}>
            {customSuggestions.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '20px', padding: '6px 12px', fontSize: '0.75rem'
                }}
              >
                <span>{item.name}</span>
                <span style={{ fontSize: '0.62rem', color: '#64748b' }}>({item.store || 'Walmart'})</span>
                <button
                  type="button"
                  onClick={() => {
                    const updated = customSuggestions.filter((_, i) => i !== idx);
                    onSaveCustomSuggestions(updated);
                    if (showToast) showToast(`"${item.name}" removed from dictionary`, 'info');
                  }}
                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0 2px', fontSize: '0.72rem', display: 'flex', alignItems: 'center' }}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', marginBottom: '16px' }}>
            No custom items learned yet. Add some on the checklist or scan them with your camera!
          </div>
        )}

        <form onSubmit={(e) => {
          e.preventDefault();
          const nameInput = e.target.elements.dictName.value.trim();
          const storeInput = e.target.elements.dictStore.value;
          const catInput = e.target.elements.dictCat.value;
          if (!nameInput) return;

          const alreadyExists = customSuggestions.some(sug => sug.name.toLowerCase().trim() === nameInput.toLowerCase().trim());
          if (!alreadyExists) {
            onSaveCustomSuggestions([...customSuggestions, { name: nameInput, store: storeInput, category: catInput }]);
            e.target.reset();
            if (showToast) showToast(`"${nameInput}" added to dictionary ✓`);
            try {
              confetti({ particleCount: 30, spread: 40, origin: { y: 0.8 }, colors: ['#6366f1', '#10b981'] });
            } catch (err) {}
          }
        }}>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
            <input
              name="dictName"
              placeholder="Item name (e.g. Basmati Rice)..."
              className="input-element"
              style={{ flex: 1, minWidth: '140px', padding: '8px 12px', fontSize: '0.78rem' }}
            />
            <button type="submit" className="solid-btn" style={{ width: 'auto', padding: '8px 16px', borderRadius: '12px', fontSize: '0.78rem' }}>
              <Plus size={14} /> Add
            </button>
          </div>
        </form>
      </div>

      {/* Confirm modal */}
      {confirmState && (
        <div className="confirm-overlay" onClick={dismissConfirm}>
          <div className="confirm-box" onClick={e => e.stopPropagation()}>
            <AlertTriangle size={24} style={{ color: '#f59e0b', margin: '0 auto 12px', display: 'block' }} />
            <p style={{ textAlign: 'center', fontWeight: 600, marginBottom: '20px', lineHeight: 1.5 }}>
              {confirmState.message}
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="outline-btn" onClick={dismissConfirm} style={{ flex: 1 }}>
                <X size={16} /> Cancel
              </button>
              <button
                className="solid-btn"
                onClick={() => { confirmState.onConfirm(); dismissConfirm(); }}
                style={{ flex: 1, background: 'linear-gradient(135deg, #ef4444, #f43f5e)' }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
