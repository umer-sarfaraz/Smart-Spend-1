import React, { useState, useRef, useEffect } from 'react';
import { Save, Download, Trash2, Info, Upload, BookOpen, Plus, X, AlertTriangle, Check, LogOut, Pencil } from 'lucide-react';
import confetti from 'canvas-confetti';
import { CATEGORIES } from '../utils/parser';
import { AVATARS, ACCENT_COLORS } from '../utils/profiles';
import { currentMonthKey, postedRecurringIds, recurringSplit } from '../utils/recurring';
import { categoryBudgetStatus, categoryDailyLeft, categorySlack, daysLeftInMonth, monthPaceProjector } from '../utils/categoryBudget';

export default function Settings({
  budget, onSaveBudget, onResetData, expenses, onSaveAllExpenses,
  customSuggestions = [], onSaveCustomSuggestions, customStores = [], showToast,
  stores = [], onUpdateStores,
  profile, onSignOut, onUpdateProfile,
  recurring = [], onUpdateRecurring,
  catBudgets = {}, onUpdateCatBudgets,
  nameMap = {}, onUpdateNameMap,
  focusCatBudget = null, onFocusCatBudgetDone,
  focusRecurring = false, onFocusRecurringDone
}) {
  const [nmOpen, setNmOpen] = useState(false);
  const [budgetVal, setBudgetVal] = useState(budget);

  // Recurring expenses section
  const [recOpen, setRecOpen] = useState(false);
  const [recName, setRecName] = useState('');
  const [recAmount, setRecAmount] = useState('');
  const [recCat, setRecCat] = useState('rent');
  const [recDay, setRecDay] = useState('1');
  const recCardRef = useRef(null);
  // Briefly highlights the specific bill row tapped on Home's Upcoming module
  // (Spendee-style: show the user exactly what their tap landed on).
  const [recHighlightId, setRecHighlightId] = useState(null);

  const addRecurring = () => {
    const amt = parseFloat(recAmount);
    if (!recName.trim() || !amt || amt <= 0) {
      if (showToast) showToast('Enter a name and amount', 'error');
      return;
    }
    onUpdateRecurring([...recurring, {
      id: `r_${Date.now()}`,
      name: recName.trim(),
      merchant: recName.trim(),
      amount: amt,
      category: recCat,
      dayOfMonth: Math.min(28, Math.max(1, parseInt(recDay) || 1)),
    }]);
    setRecName(''); setRecAmount(''); setRecDay('1');
    if (showToast) showToast('Recurring expense added — it will post automatically each month 🔁');
  };

  // Category budgets section
  const [cbOpen, setCbOpen] = useState(false);
  const [cbCat, setCbCat] = useState('bakery');
  const [cbAmount, setCbAmount] = useState('');
  const cbCardRef = useRef(null);
  // Briefly highlights the add-row the tapped category was pre-selected into
  // (Spendee-style: show the user exactly what their tap landed on).
  const [cbHighlight, setCbHighlight] = useState(false);

  // Deep-link arrival from Home's "Set a limit": open the section, pre-select
  // the tapped category (the "Use $N" suggestion then shows automatically),
  // scroll it into view, and consume the flag so it doesn't re-fire.
  useEffect(() => {
    if (!focusCatBudget) return;
    setCbOpen(true);
    if (CATEGORIES[focusCatBudget]) {
      setCbCat(focusCatBudget);
      // Home only offers "Set a limit" for categories with no limit yet, so the
      // add-row — not an existing row — is where the tap lands. Tint it briefly.
      setCbHighlight(true);
      setTimeout(() => setCbHighlight(false), 2400);
    }
    setTimeout(() => cbCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    if (onFocusCatBudgetDone) onFocusCatBudgetDone();
  }, [focusCatBudget]); // eslint-disable-line react-hooks/exhaustive-deps

  // Deep-link arrival from Home's "Upcoming" module: open the Recurring
  // Expenses section and scroll it into view (Spendee-style one-tap-to-manage),
  // then consume the flag so it doesn't re-fire.
  useEffect(() => {
    if (!focusRecurring) return;
    setRecOpen(true);
    // When a specific bill row was tapped (focusRecurring carries its id rather
    // than just `true`), tint that row briefly so the eye lands on it.
    if (typeof focusRecurring === 'string') {
      setRecHighlightId(focusRecurring);
      setTimeout(() => setRecHighlightId(null), 2400);
    }
    setTimeout(() => recCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    if (onFocusRecurringDone) onFocusRecurringDone();
  }, [focusRecurring]); // eslint-disable-line react-hooks/exhaustive-deps

  const addCatBudget = () => {
    const amt = parseFloat(cbAmount);
    if (!amt || amt <= 0) {
      if (showToast) showToast('Enter a limit amount', 'error');
      return;
    }
    onUpdateCatBudgets({ ...catBudgets, [cbCat]: amt });
    setCbAmount('');
    if (showToast) showToast(`${CATEGORIES[cbCat]?.label || cbCat} budget set ✓`);
  };

  // This-month spend per category, for YNAB-style progress on each budget row.
  // Same calc as Insights' Category Budgets card so the two never disagree.
  const cbMonthTotals = (() => {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const t = {};
    (expenses || []).filter(e => e.date && e.date.startsWith(monthKey)).forEach(e =>
      (e.items || []).forEach(i => {
        const c = i.category || 'other';
        t[c] = (t[c] || 0) + i.amount;
      })
    );
    return t;
  })();

  // Category limits are monthly by definition, so the pace projector applies here
  // unconditionally. Shared with Home via utils/categoryBudget.js, so a category
  // that reads "on pace to go over" on Home reads the same way here.
  const cbPace = monthPaceProjector();

  // YNAB-style "roll with the punches": when a category is over its limit, point
  // to the budgeted categories that still have room this month so the user can
  // re-prioritize (move the overage) instead of treating the budget as broken.
  // Top 2 by remaining room; an over-limit category can never appear here.
  // Shared with Home via utils/categoryBudget.js — same list, same order.
  const cbSlack = categorySlack(catBudgets, cbMonthTotals);

  // Days remaining in the month (incl. today) — the divisor behind the per-row
  // "left / day" figure below. Computed once, so every row uses the same day count
  // as Home's whole-budget LEFT / DAY.
  const cbDaysLeft = daysLeftInMonth();

  // Rocket Money–style "upcoming bills" status for each recurring expense: has it
  // already posted to this month's ledger (same guard as App.jsx's auto-post), or
  // how many days until it's next due. Returns a small {text, color} per row.
  // Which bills have already posted this month. Shared with Home and App.jsx via
  // utils/recurring.js, so the per-row status, the paid/left summary below and the
  // auto-post rule can never disagree about the same bill.
  const recPostedIds = postedRecurringIds(expenses, currentMonthKey());

  const recStatus = (() => {
    const today = new Date().getDate();
    return (r) => {
      if (recPostedIds.has(r.id)) return { text: '✓ Added this month', color: '#34D399' };
      const days = (r.dayOfMonth || 1) - today;
      if (days > 0) return {
        text: days === 1 ? 'Due tomorrow' : `Due in ${days} days`,
        color: days <= 3 ? '#f59e0b' : '#8A93A0',
      };
      return { text: 'Due this month', color: '#8A93A0' };
    };
  })();

  // Rocket Money–style "total recurring spend" at a glance: the combined monthly
  // cost of every tracked recurring bill — Rocket's signature headline number, how
  // much of the month is already committed to bills/subscriptions before any other
  // spending. Sums all recurring amounts regardless of whether each has posted yet
  // this month, so it reflects the full standing monthly commitment (distinct from
  // Home's "Upcoming" total, which is only the bills still left to post).
  const recTotal = recurring.reduce((s, r) => s + (Number(r.amount) || 0), 0);

  // Copilot Money–style "paid / left to pay" split of the month's recurring bills.
  // Copilot's Recurrings tab leads with how much of the month's commitment has
  // already gone out vs. how much is still to come — a flat monthly total answers
  // "how committed am I?" but not "how much of that has already happened?".
  // Uses the same recPostedIds guard as each row's status, so the summary always
  // agrees with the rows beneath it. Null when there are no bills at all.
  const recProgress = (() => {
    if (!recurring.length) return null;
    const { paid, left, leftCount } = recurringSplit(recurring, recPostedIds);
    if (paid <= 0 && left <= 0) return null;
    return { paid, left, leftCount, pct: recTotal > 0 ? Math.min(100, (paid / recTotal) * 100) : 0 };
  })();

  // Rocket Money–style untracked-subscription detection. Rocket's most iconic move
  // is scanning transaction history and surfacing the recurring charges you never
  // told it about. This does the same locally, and deliberately conservatively — a
  // false "is this a subscription?" nudge is worse than a missed one, so a merchant
  // only qualifies when every signal lines up:
  //   • charged in >= 3 of the last 4 calendar months (current month included)
  //   • at most one charge in any of those months (a weekly grocery run isn't a bill)
  //   • every charge is a single line item (multi-item receipts are shopping trips)
  //   • all amounts within 12% (and $2) of the median — subscriptions bill a flat rate
  //   • all charges land within 5 days of the median day of month
  //   • >= $3, never auto-posted (no recurringId), and not already a tracked bill
  // Read-only: tapping one prefills the add-row below; the user still confirms with +.
  const recSuggestions = (() => {
    const now = new Date();
    const keys = [];
    for (let i = 0; i < 4; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const tracked = new Set(
      recurring.flatMap(r => [norm(r.name), norm(r.merchant)]).filter(Boolean)
    );
    const groups = {};
    (expenses || []).forEach(e => {
      if (!e || e.recurringId || !e.date || !e.merchant) return;
      const mk = e.date.slice(0, 7);
      if (!keys.includes(mk)) return;
      const amt = Number(e.amount) || 0;
      if (amt < 3) return;
      const k = norm(e.merchant);
      if (!k || tracked.has(k)) return;
      if (!groups[k]) groups[k] = { label: e.merchant, charges: [] };
      groups[k].charges.push({
        mk,
        amt,
        day: parseInt(e.date.slice(8, 10), 10) || 1,
        items: (e.items || []).length,
        category: (e.items && e.items[0] && e.items[0].category) || 'other',
      });
    });
    const med = (arr) => { const s = [...arr].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
    const out = [];
    Object.values(groups).forEach(g => {
      const months = new Set(g.charges.map(c => c.mk));
      if (months.size < 3) return;                    // not seen often enough
      if (g.charges.length !== months.size) return;   // more than one hit in some month
      if (g.charges.some(c => c.items > 1)) return;   // a shopping trip, not a bill
      const amts = g.charges.map(c => c.amt);
      const mAmt = med(amts);
      if (amts.some(a => Math.abs(a - mAmt) > Math.max(2, mAmt * 0.12))) return;
      const days = g.charges.map(c => c.day);
      const mDay = med(days);
      if (days.some(d => Math.abs(d - mDay) > 5)) return;
      out.push({
        label: g.label,
        amount: mAmt,
        day: Math.min(28, Math.max(1, mDay)),
        months: months.size,
        category: g.charges[0].category,
      });
    });
    return out.sort((a, b) => b.amount - a.amount).slice(0, 2);
  })();

  // Prefills the Recurring add-row from a detected suggestion. Nothing is saved —
  // the user still taps "Add Recurring" to confirm.
  const prefillRecurring = (s) => {
    setRecName(s.label);
    setRecAmount(s.amount.toFixed(2));
    setRecCat(CATEGORIES[s.category] ? s.category : 'other');
    setRecDay(String(s.day));
    if (showToast) showToast('Filled in below — tap Add Recurring to confirm');
  };

  // Monarch-style limit suggestion: avg monthly spend for the selected category
  // over the last 3 full calendar months (current partial month excluded), so the
  // user never has to pick a limit blind. Only months with spend count toward the avg.
  const cbSuggested = (() => {
    const now = new Date();
    const keys = [];
    for (let i = 1; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    const totals = {};
    (expenses || []).forEach(e => {
      if (!e.date || !keys.includes(e.date.slice(0, 7))) return;
      (e.items || []).forEach(i => {
        if ((i.category || 'other') === cbCat) {
          const mk = e.date.slice(0, 7);
          totals[mk] = (totals[mk] || 0) + i.amount;
        }
      });
    });
    const vals = Object.values(totals);
    if (vals.length === 0) return null;
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return avg >= 1 ? { avg, months: vals.length } : null;
  })();

  // Profile editing state
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [profName, setProfName] = useState(profile?.name || '');
  const [profAvatar, setProfAvatar] = useState(profile?.avatar || '😀');
  const [profColor, setProfColor] = useState(profile?.color || '#A99BFA');

  const handleSaveProfile = () => {
    if (!profName.trim()) return;
    onUpdateProfile({ name: profName.trim(), avatar: profAvatar, color: profColor });
    setProfileEditOpen(false);
    if (showToast) showToast('Profile updated ✓');
  };

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
              confetti({ particleCount: 100, spread: 70, origin: { y: 0.8 }, colors: ['#A99BFA', '#34D399'] });
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
              <p style={{ fontSize: '0.88rem', color: '#F4F6F8', lineHeight: 1.55 }}>{confirmState.message}</p>
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

      {/* 0. Profile Card */}
      {profile && (
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              className="settings-profile-avatar"
              style={{ borderColor: profile.color, boxShadow: `0 0 16px ${profile.color}44` }}
            >
              {profile.avatar}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 800, fontSize: '1.05rem', fontFamily: 'var(--font-title)' }}>{profile.name}</p>
              <p style={{ fontSize: '0.7rem', color: '#8A93A0', marginTop: '2px' }}>Local profile · data stays on this phone</p>
            </div>
            <button
              className="outline-btn"
              style={{ width: 'auto', padding: '9px 12px', borderRadius: '12px', fontSize: '0.75rem' }}
              onClick={() => { setProfName(profile.name); setProfAvatar(profile.avatar); setProfColor(profile.color); setProfileEditOpen(!profileEditOpen); }}
            >
              <Pencil size={14} /> Edit
            </button>
          </div>

          {profileEditOpen && (
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label>Display Name</label>
                <input
                  type="text"
                  className="input-element"
                  value={profName}
                  maxLength={20}
                  onChange={(e) => setProfName(e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', color: '#8A93A0', fontWeight: 700, display: 'block', marginBottom: '8px' }}>Avatar</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {AVATARS.map(a => (
                    <button
                      key={a}
                      onClick={() => setProfAvatar(a)}
                      style={{
                        width: '40px', height: '40px', borderRadius: '12px', fontSize: '1.2rem',
                        background: 'rgba(255,255,255,0.04)', cursor: 'pointer',
                        border: profAvatar === a ? `2px solid ${profColor}` : '2px solid rgba(255,255,255,0.08)'
                      }}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', color: '#8A93A0', fontWeight: 700, display: 'block', marginBottom: '8px' }}>Accent Color</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {ACCENT_COLORS.map(c => (
                    <button
                      key={c.value}
                      onClick={() => setProfColor(c.value)}
                      title={c.name}
                      style={{
                        width: '32px', height: '32px', borderRadius: '50%', background: c.value, cursor: 'pointer',
                        border: profColor === c.value ? '3px solid #fff' : '3px solid transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                    >
                      {profColor === c.value && <Check size={14} color="#fff" strokeWidth={3} />}
                    </button>
                  ))}
                </div>
              </div>
              <button className="solid-btn" style={{ padding: '12px', borderRadius: '12px', fontSize: '0.85rem' }} onClick={handleSaveProfile}>
                <Save size={16} /> Save Profile
              </button>
            </div>
          )}

          <button
            className="outline-btn"
            style={{ width: '100%', marginTop: '14px', padding: '12px', borderRadius: '12px', fontSize: '0.82rem' }}
            onClick={onSignOut}
          >
            <LogOut size={16} /> Switch Profile / Sign Out
          </button>
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

      {/* 1b. Recurring Expenses */}
      <div ref={recCardRef} className="glass-card" onClick={() => setRecOpen(!recOpen)} style={{ cursor: 'pointer' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: '0.95rem' }}>🔁 Recurring Expenses</p>
            <p style={{ fontSize: '0.72rem', color: '#8A93A0', marginTop: '2px' }}>Rent, utilities, subscriptions — auto-logged every month</p>
            {recurring.length > 0 && (
              <p style={{ fontSize: '0.74rem', fontWeight: 700, marginTop: '3px' }}>
                <span style={{ color: '#A99BFA' }}>${recTotal.toFixed(2)}</span>
                <span style={{ color: '#5A6270', fontWeight: 600 }}> /mo total</span>
              </p>
            )}
            {recProgress && (
              <div style={{ marginTop: 5, maxWidth: 200 }}>
                <div style={{ height: 4, borderRadius: 2, background: '#1B212B', overflow: 'hidden' }}>
                  <div style={{ width: `${recProgress.pct}%`, height: '100%', background: '#34D399', borderRadius: 2, transition: 'width 0.4s ease' }} />
                </div>
                <p style={{ fontSize: '0.66rem', marginTop: 4, fontWeight: 600 }}>
                  <span style={{ color: '#34D399' }}>${recProgress.paid.toFixed(2)} paid</span>
                  <span style={{ color: '#5A6270' }}>
                    {recProgress.left > 0.005
                      ? ` · $${recProgress.left.toFixed(2)} left (${recProgress.leftCount} bill${recProgress.leftCount > 1 ? 's' : ''})`
                      : ' · all bills in'}
                  </span>
                </p>
              </div>
            )}
            {recSuggestions.length > 0 && (
              <p style={{ fontSize: '0.7rem', color: '#A99BFA', fontWeight: 600, marginTop: '3px' }}>
                {recSuggestions.length} possible subscription{recSuggestions.length > 1 ? 's' : ''} found
              </p>
            )}
          </div>
          <span style={{ fontSize: '0.8rem', color: '#8A93A0', fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>
            {recurring.length} {recOpen ? '▲' : '→'}
          </span>
        </div>
        {recOpen && (
          <div style={{ marginTop: 14 }} onClick={e => e.stopPropagation()}>
            {recurring.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 8px', margin: '0 -8px', borderBottom: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, background: r.id === recHighlightId ? 'rgba(169,155,250,0.12)' : 'transparent', transition: 'background 0.6s ease' }}>
                <span style={{ fontSize: '1rem' }}>{CATEGORIES[r.category]?.icon || '📦'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                  <div style={{ fontSize: '0.64rem', color: '#5A6270' }}>Day {r.dayOfMonth} of each month · {CATEGORIES[r.category]?.label}</div>
                  {(() => { const s = recStatus(r); return (
                    <div style={{ fontSize: '0.64rem', color: s.color, marginTop: 2 }}>{s.text}</div>
                  ); })()}
                </div>
                <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>${r.amount.toFixed(2)}</span>
                <button
                  onClick={() => onUpdateRecurring(recurring.filter(x => x.id !== r.id))}
                  style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', padding: 4, display: 'flex' }}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            {recSuggestions.length > 0 && (
              <div style={{ marginTop: 12, padding: '10px 12px', background: '#1B212B', borderRadius: 12 }}>
                <div style={{ fontSize: '0.7rem', color: '#8A93A0', fontWeight: 600, marginBottom: 8 }}>
                  Looks recurring — not tracked yet
                </div>
                {recSuggestions.map((s, i) => (
                  <div key={s.label + i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: i ? 10 : 0 }}>
                    <span style={{ fontSize: '0.95rem' }}>{CATEGORIES[s.category]?.icon || '📦'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</div>
                      <div style={{ fontSize: '0.64rem', color: '#5A6270', marginTop: 1 }}>
                        ${s.amount.toFixed(2)} · {s.months} of the last 4 months · around day {s.day}
                      </div>
                    </div>
                    <button
                      onClick={() => prefillRecurring(s)}
                      style={{ background: 'none', border: 'none', color: '#A99BFA', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', padding: '4px 2px', flexShrink: 0 }}
                    >
                      Add it →
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              <input
                className="input-element"
                placeholder="Name (e.g. Rent, Internet, Netflix)…"
                value={recName}
                onChange={e => setRecName(e.target.value)}
                style={{ padding: '10px 12px', fontSize: '0.84rem' }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="input-element"
                  type="number"
                  placeholder="Amount $"
                  value={recAmount}
                  onChange={e => setRecAmount(e.target.value)}
                  style={{ flex: 1.2, padding: '10px 12px', fontSize: '0.84rem' }}
                />
                <select
                  className="input-element"
                  value={recCat}
                  onChange={e => setRecCat(e.target.value)}
                  style={{ flex: 1.6, padding: '10px 8px', fontSize: '0.78rem' }}
                >
                  {Object.entries(CATEGORIES).map(([k, v]) => (
                    <option key={k} value={k}>{v.icon} {v.label}</option>
                  ))}
                </select>
                <input
                  className="input-element"
                  type="number"
                  min="1" max="28"
                  placeholder="Day"
                  title="Day of month it posts"
                  value={recDay}
                  onChange={e => setRecDay(e.target.value)}
                  style={{ flex: 0.7, padding: '10px 8px', fontSize: '0.84rem' }}
                />
              </div>
              <button className="solid-btn" style={{ padding: '11px', borderRadius: '12px', fontSize: '0.82rem' }} onClick={addRecurring}>
                <Plus size={15} /> Add Recurring
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 1c. Category Budgets */}
      <div ref={cbCardRef} className="glass-card" onClick={() => setCbOpen(!cbOpen)} style={{ cursor: 'pointer' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: '0.95rem' }}>🎯 Category Budgets</p>
            <p style={{ fontSize: '0.72rem', color: '#8A93A0', marginTop: '2px' }}>Monthly limit per category — bars show this month's spend</p>
          </div>
          <span style={{ fontSize: '0.8rem', color: '#8A93A0', fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>
            {Object.keys(catBudgets).length} {cbOpen ? '▲' : '→'}
          </span>
        </div>
        {cbOpen && (
          <div style={{ marginTop: 14 }} onClick={e => e.stopPropagation()}>
            {Number(budget) > 0 && Object.keys(catBudgets).length > 0 && (() => {
              // YNAB-style "Ready to Assign": show how the per-category limits stack up
              // against the overall monthly budget, so over-/under-allocation is visible here.
              const totalLimits = Object.values(catBudgets).reduce((s, v) => s + (Number(v) || 0), 0);
              const leftToBudget = Number(budget) - totalLimits;
              const over = leftToBudget < -0.5;
              const fully = Math.abs(leftToBudget) <= 0.5;
              return (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, padding: '9px 11px', marginBottom: 12, borderRadius: 12, background: '#1B212B' }}>
                  <span style={{ fontSize: '0.72rem', color: '#8A93A0' }}>
                    ${totalLimits.toFixed(0)} of ${Number(budget).toFixed(0)} budget
                  </span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: over ? '#f59e0b' : '#34D399' }}>
                    {over
                      ? `$${Math.abs(leftToBudget).toFixed(0)} over budget`
                      : fully
                        ? 'Fully allocated'
                        : `$${leftToBudget.toFixed(0)} unallocated`}
                  </span>
                </div>
              );
            })()}
            {Object.entries(catBudgets).map(([key, amt]) => {
              const spent = cbMonthTotals[key] || 0;
              const pct = amt > 0 ? Math.min(100, Math.round(spent / amt * 100)) : 0;
              // Same state machine, colours and wording as Home's Breakdown rows.
              const st = categoryBudgetStatus(spent, amt, cbPace);
              const barColor = !st ? '#5A6270'
                : st.state === 'over' ? '#f43f5e'
                  : st.state === 'ok' ? '#34D399'
                    : '#f59e0b';
              return (
                <div key={key} style={{ padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1rem' }}>{CATEGORIES[key]?.icon || '📦'}</span>
                    <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 700 }}>{CATEGORIES[key]?.label || key}</span>
                    <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>${amt.toFixed(2)}/mo</span>
                    <button
                      onClick={() => {
                        const next = { ...catBudgets };
                        delete next[key];
                        onUpdateCatBudgets(next);
                      }}
                      style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', padding: 4, display: 'flex' }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 7 }}>
                    <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.05)' }}>
                      <div style={{ height: '100%', borderRadius: 3, width: `${Math.max(2, pct)}%`, background: barColor, transition: 'width 0.4s ease' }} />
                    </div>
                    {/* Monarch-style planned / actual / remaining: the limit is on
                        the row above (planned), spent is actual, and the shared
                        status phrase is remaining — in Home's exact words. */}
                    <span style={{ fontSize: '0.66rem', fontWeight: 700, flexShrink: 0 }}>
                      <span style={{ color: '#5A6270' }}>${spent.toFixed(0)} spent</span>
                      {st && (
                        <>
                          <span style={{ color: '#5A6270' }}> · </span>
                          <span style={{ color: st.color }}>{st.shortText}</span>
                        </>
                      )}
                    </span>
                  </div>
                  {/* Spendee-style "know how much you can spend daily": the row
                      says how much is left, this says how far that stretches. Uses
                      Home's exact LEFT / DAY vocabulary and day count, so the
                      per-category figure and the whole-budget one read the same
                      way. Never shown for an over-limit row — `left` is 0 there —
                      so this and "Cover it from…" below are mutually exclusive. */}
                  {(() => {
                    const dl = st && categoryDailyLeft(st.left, cbDaysLeft);
                    if (!dl) return null;
                    return (
                      <p style={{ fontSize: '0.66rem', color: '#5A6270', marginTop: 5 }}>
                        <span style={{ color: '#34D399', fontWeight: 700 }}>${dl.perDay.toFixed(2)}</span>
                        {' left / day · '}
                        {dl.daysLeft} {dl.daysLeft === 1 ? 'day' : 'days'} left
                      </p>
                    );
                  })()}
                  {spent > amt && cbSlack.length > 0 && (
                    <p style={{ fontSize: '0.66rem', color: '#5A6270', marginTop: 5 }}>
                      Cover it from{' '}
                      {cbSlack.map((s, i) => (
                        <span key={s.k}>
                          {i > 0 && ' or '}
                          <span style={{ color: '#8A93A0', fontWeight: 700 }}>{CATEGORIES[s.k]?.label || s.k}</span>
                          {' '}
                          <span style={{ color: '#34D399', fontWeight: 700 }}>(${s.left.toFixed(0)} left)</span>
                        </span>
                      ))}
                    </p>
                  )}
                </div>
              );
            })}
            {/* Negative margins cancel the padding exactly, so the row sits in
                the same place whether or not the arrival tint is showing. */}
            <div style={{ display: 'flex', gap: 8, margin: '4px -8px -8px', padding: 8, borderRadius: 12, background: cbHighlight ? 'rgba(169,155,250,0.12)' : 'transparent', transition: 'background 0.6s ease' }}>
              <select
                className="input-element"
                value={cbCat}
                onChange={e => setCbCat(e.target.value)}
                style={{ flex: 1.6, padding: '10px 8px', fontSize: '0.78rem' }}
              >
                {Object.entries(CATEGORIES).map(([k, v]) => (
                  <option key={k} value={k}>{v.icon} {v.label}</option>
                ))}
              </select>
              <input
                className="input-element"
                type="number"
                placeholder="Limit $/mo"
                value={cbAmount}
                onChange={e => setCbAmount(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addCatBudget(); }}
                style={{ flex: 1, padding: '10px 12px', fontSize: '0.84rem' }}
              />
              <button className="solid-btn" style={{ width: 'auto', padding: '10px 14px', borderRadius: 12 }} onClick={addCatBudget}>
                <Plus size={15} />
              </button>
            </div>
            {cbSuggested && catBudgets[cbCat] == null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <span style={{ flex: 1, fontSize: '0.7rem', color: '#5A6270' }}>
                  You've averaged ${cbSuggested.avg.toFixed(0)}/mo {cbSuggested.months > 1 ? `over the last ${cbSuggested.months} months` : 'last month'}
                </span>
                <button
                  onClick={() => setCbAmount(String(Math.ceil(cbSuggested.avg)))}
                  style={{ background: '#1B212B', border: '1px solid rgba(169,155,250,0.35)', color: '#A99BFA', fontSize: '0.7rem', fontWeight: 700, padding: '4px 10px', borderRadius: 999, cursor: 'pointer', flexShrink: 0 }}
                >
                  Use ${Math.ceil(cbSuggested.avg)}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 1d. Scan Name Memory */}
      <div className="glass-card" onClick={() => setNmOpen(!nmOpen)} style={{ cursor: 'pointer' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: '0.95rem' }}>🧠 Scan Name Memory</p>
            <p style={{ fontSize: '0.72rem', color: '#8A93A0', marginTop: '2px' }}>Names you've corrected after scans — auto-applied to future receipts</p>
          </div>
          <span style={{ fontSize: '0.8rem', color: '#8A93A0', fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>
            {Object.keys(nameMap).length} {nmOpen ? '▲' : '→'}
          </span>
        </div>
        {nmOpen && (
          <div style={{ marginTop: 14 }} onClick={e => e.stopPropagation()}>
            {Object.keys(nameMap).length === 0 ? (
              <p style={{ fontSize: '0.74rem', color: '#5A6270', fontStyle: 'italic' }}>
                Nothing learned yet. After a scan, rename an item in the review screen and save — the correction will be remembered and applied automatically next time.
              </p>
            ) : Object.entries(nameMap).map(([raw, m]) => (
              <div key={raw} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '0.95rem', flexShrink: 0 }}>{CATEGORIES[m.category]?.icon || '📦'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.68rem', color: '#5A6270', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>{raw}</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>→ {m.name}</div>
                </div>
                <button
                  onClick={() => {
                    const next = { ...nameMap };
                    delete next[raw];
                    onUpdateNameMap(next);
                  }}
                  style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', padding: 4, display: 'flex', flexShrink: 0 }}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Stores Management */}
      <div className="glass-card" onClick={() => setStoresOpen(!storesOpen)} style={{ cursor: 'pointer' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: '0.95rem' }}>🏪 Manage Stores</p>
            <p style={{ fontSize: '0.72rem', color: '#8A93A0', marginTop: '2px' }}>Add or remove store names used across the app</p>
          </div>
          <span style={{ fontSize: '0.8rem', color: '#8A93A0', fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>
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
        <p style={{ fontSize: '0.75rem', color: '#8A93A0', marginBottom: '14px', lineHeight: '1.4' }}>
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
        <p style={{ fontSize: '0.75rem', color: '#8A93A0', marginBottom: '14px', lineHeight: '1.4' }}>
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
                <span style={{ fontSize: '0.62rem', color: '#5A6270' }}>({item.store || 'Walmart'})</span>
                <button
                  type="button"
                  onClick={() => {
                    const updated = customSuggestions.filter((_, i) => i !== idx);
                    onSaveCustomSuggestions(updated);
                    if (showToast) showToast(`"${item.name}" removed from dictionary`, 'info');
                  }}
                  style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', padding: '0 2px', fontSize: '0.72rem', display: 'flex', alignItems: 'center' }}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: '0.75rem', color: '#5A6270', fontStyle: 'italic', marginBottom: '16px' }}>
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
              confetti({ particleCount: 30, spread: 40, origin: { y: 0.8 }, colors: ['#A99BFA', '#34D399'] });
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
                style={{ flex: 1, background: 'linear-gradient(135deg, #f43f5e, #f43f5e)' }}
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
