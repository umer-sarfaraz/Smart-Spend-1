import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import Dashboard from './components/Dashboard';
import History from './components/History';
import Settings from './components/Settings';
import Scanner from './components/Scanner';
import ManualForm from './components/ManualForm';
import ShoppingList from './components/ShoppingList';
import { Home, ShoppingBag, History as HistoryIcon, Settings as SettingsIcon } from 'lucide-react';
import confetti from 'canvas-confetti';

// Seeding standard high-fidelity mockup data for immediate beautiful layout on initial load!
const DEFAULT_EXPENSES = [
  {
    id: 'seed_1',
    merchant: 'Lotte Plaza Market',
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days ago
    isGasMeter: false,
    amount: 17.48,
    items: [
      { name: 'Organic Roma Tomatoes', amount: 3.49, category: 'vegetables' },
      { name: 'Fresh Gala Apples', amount: 4.99, category: 'fruits' },
      { name: 'Large White Eggs 12ct', amount: 2.99, category: 'dairy' },
      { name: 'Head & Shoulders Shampoo', amount: 6.00, category: 'shopping' }
    ]
  },
  {
    id: 'seed_2',
    merchant: 'Chevron Fuel Station',
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 5 days ago
    isGasMeter: true,
    amount: 45.00,
    items: [
      { name: 'Unleaded Fuel (12.8 Gal @ $3.51/gal)', amount: 45.00, category: 'fuel' }
    ]
  },
  {
    id: 'seed_3',
    merchant: 'City Power & Water Co.',
    date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 10 days ago
    isGasMeter: false,
    amount: 85.00,
    items: [
      { name: 'Monthly Home Electricity Charge', amount: 85.00, category: 'utilities' }
    ]
  }
];

export default function App() {
  // 1. Core States loaded from secure Local Phone Storage
  const [expenses, setExpenses] = useState(() => {
    const cached = localStorage.getItem('smartspend_expenses');
    try {
      const parsed = cached ? JSON.parse(cached) : null;
      return Array.isArray(parsed) ? parsed : DEFAULT_EXPENSES;
    } catch {
      return DEFAULT_EXPENSES;
    }
  });

  const [budget, setBudget] = useState(() => {
    const cached = localStorage.getItem('smartspend_budget');
    if (!cached) return 500;
    const parsed = parseFloat(cached);
    return isNaN(parsed) ? 500 : parsed;
  });

  // Shopping list checklist state
  const [shoppingList, setShoppingList] = useState(() => {
    const cached = localStorage.getItem('smartspend_shopping_list');
    try {
      const parsed = cached ? JSON.parse(cached) : null;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  // Dynamic custom stores state
  const [customStores, setCustomStores] = useState(() => {
    const cached = localStorage.getItem('smartspend_custom_stores');
    try {
      const parsed = cached ? JSON.parse(cached) : null;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  // Self-Learning Custom Suggestions Catalog state
  const [customSuggestions, setCustomSuggestions] = useState(() => {
    const cached = localStorage.getItem('smartspend_custom_suggestions');
    try {
      const parsed = cached ? JSON.parse(cached) : null;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  // Navigation tab states
  const [activeTab, setActiveTab] = useState('dashboard');

  // Toast notification system
  const [toast, setToast] = useState(null);
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  // First-run welcome card
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem('smartspend_welcomed'));
  const dismissWelcome = () => {
    localStorage.setItem('smartspend_welcomed', '1');
    setShowWelcome(false);
  };
  
  // Drawer visibility states
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);

  // Lifted Ledger states (allows deep-linking category breakdowns!)
  const [historyViewMode, setHistoryViewMode] = useState('receipts');
  const [historyCategoryFilter, setHistoryCategoryFilter] = useState('all');

  // 2. Automated Shared List URL Import Listener on startup!
  // Supports composite encoding: Name:Category:Store
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const importList = params.get('importList');
    
    if (importList) {
      try {
        const decoded = decodeURIComponent(importList);
        const rawItems = decoded.split(',');
        
        const formattedItems = rawItems.map(rawItem => {
          const parts = rawItem.split(':');
          
          if (parts.length >= 3) {
            return {
              name: parts[0].trim(),
              category: parts[1].trim(),
              store: parts[2].trim(),
              checked: false
            };
          } else {
            return {
              name: rawItem.trim(),
              category: 'other',
              store: 'Walmart',
              checked: false
            };
          }
        });

        // Register any new dynamic store names parsed from partner's shared link!
        formattedItems.forEach(item => {
          const defaultStores = ['Walmart', 'Costco', 'Lotte', 'Halal Store', 'Home Depot', 'Restaurant Depot'];
          if (item.store && !defaultStores.includes(item.store) && !customStores.includes(item.store)) {
            setCustomStores(prev => [...prev, item.store]);
          }
        });

        setShoppingList(formattedItems);
        setActiveTab('shopping'); // Switch directly to checklist!
        
        // Clean URL query bar instantly so it remains clean
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Confetti explosion!
        // Confetti explosion!
        try {
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.75 },
            colors: ['#6366f1', '#10b981', '#fbbf24']
          });
        } catch (err) {
          console.warn('Confetti blocked or failed:', err);
        }

        alert('🛒 Success! Store-assigned grocery checklist imported from partner.');
      } catch (err) {
        console.error('Failed to parse share list:', err);
      }
    }
  }, []);

  // 3. Persist states in LocalStorage whenever changed
  useEffect(() => {
    localStorage.setItem('smartspend_expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('smartspend_budget', budget.toString());
  }, [budget]);

  useEffect(() => {
    localStorage.setItem('smartspend_shopping_list', JSON.stringify(shoppingList));
  }, [shoppingList]);

  useEffect(() => {
    localStorage.setItem('smartspend_custom_stores', JSON.stringify(customStores));
  }, [customStores]);

  useEffect(() => {
    localStorage.setItem('smartspend_custom_suggestions', JSON.stringify(customSuggestions));
  }, [customSuggestions]);

  // 4. Handlers
  const handleSaveExpense = (newExpense) => {
    setExpenses([newExpense, ...expenses]);
  };

  const handleDeleteExpense = (id) => {
    setExpenses(expenses.filter(exp => exp.id !== id));
  };

  const handleResetData = () => {
    setExpenses([]);
    setBudget(500);
    setShoppingList([]);
    setCustomStores([]);
    setCustomSuggestions([]);
    localStorage.removeItem('smartspend_expenses');
    localStorage.removeItem('smartspend_budget');
    localStorage.removeItem('smartspend_shopping_list');
    localStorage.removeItem('smartspend_custom_stores');
    localStorage.removeItem('smartspend_custom_suggestions');
  };

  // Checklist Actions
  const handleAddShoppingItem = (itemObj) => {
    try {
      if (!itemObj) return;
      const newItem = typeof itemObj === 'string'
        ? { name: itemObj, checked: false, category: 'other', store: 'Walmart' }
        : itemObj;
        
      if (!newItem || !newItem.name) return;
      
      const currentList = Array.isArray(shoppingList) ? shoppingList : [];
      setShoppingList([newItem, ...currentList]); // Prepend so new items appear at top

      // ================= DYNAMIC SELF-LEARNING ENGINE =================
      const cleanName = newItem.name.toLowerCase().trim();
      const defaultItemNames = [
        'eggs', 'milk 1 gallon', 'lays chips', 'organic roma tomatoes', 'fresh gala apples',
        'organic bananas', 'honey wheat bread', 'premium wheat container', 'halal chicken',
        'fresh atlantic salmon', 'cheddar cheese', 'butter', 'rice bag', 'shampoo', 'soap bar',
        'toilet paper 24-pack', 'coffee beans', 'lipton tea bags', 'mineral water case',
        'soda cans 12-pack', 'gym membership', 'monthly home rent', 'school tuition fees'
      ];

      if (!defaultItemNames.includes(cleanName)) {
        const suggestionsArray = Array.isArray(customSuggestions) ? customSuggestions : [];
        const alreadyExists = suggestionsArray.some(sug => sug && sug.name && sug.name.toLowerCase().trim() === cleanName);
        if (!alreadyExists) {
          const updatedSuggestions = [...suggestionsArray, {
            name: newItem.name,
            category: newItem.category || 'other',
            store: newItem.store || 'Walmart'
          }];
          setCustomSuggestions(updatedSuggestions);
        }
      }
    } catch (err) {
      console.error('Error in handleAddShoppingItem:', err);
    }
  };

  const handleToggleShoppingItem = (idx) => {
    try {
      const currentList = Array.isArray(shoppingList) ? shoppingList : [];
      const updated = [...currentList];
      if (updated[idx]) {
        updated[idx].checked = !updated[idx].checked;
        setShoppingList(updated);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteShoppingItem = (idx) => {
    try {
      // Use functional update so rapid/batched calls each see the latest state
      setShoppingList(prev => (Array.isArray(prev) ? prev : []).filter((_, i) => i !== idx));
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearShoppingList = () => {
    setShoppingList([]);
  };

  const handleUpdateShoppingItem = (idx, updatedFields) => {
    try {
      const currentList = Array.isArray(shoppingList) ? shoppingList : [];
      const updated = [...currentList];
      const oldItem = updated[idx];
      if (!oldItem) return;
      const newItem = { ...oldItem, ...updatedFields };
      updated[idx] = newItem;
      setShoppingList(updated);

      // ================= DYNAMIC SELF-LEARNING ENGINE =================
      if (updatedFields.name) {
        const cleanName = updatedFields.name.toLowerCase().trim();
        const defaultItemNames = [
          'eggs', 'milk 1 gallon', 'lays chips', 'organic roma tomatoes', 'fresh gala apples',
          'organic bananas', 'honey wheat bread', 'premium wheat container', 'halal chicken',
          'fresh atlantic salmon', 'cheddar cheese', 'butter', 'rice bag', 'shampoo', 'soap bar',
          'toilet paper 24-pack', 'coffee beans', 'lipton tea bags', 'mineral water case',
          'soda cans 12-pack', 'gym membership', 'monthly home rent', 'school tuition fees'
        ];

        if (!defaultItemNames.includes(cleanName)) {
          const suggestionsArray = Array.isArray(customSuggestions) ? customSuggestions : [];
          const alreadyExists = suggestionsArray.some(sug => sug && sug.name && sug.name.toLowerCase().trim() === cleanName);
          if (!alreadyExists) {
            const updatedSuggestions = [...suggestionsArray, {
              name: newItem.name,
              category: newItem.category || 'other',
              store: newItem.store || 'Walmart'
            }];
            setCustomSuggestions(updatedSuggestions);
          }
        }
      }
    } catch (err) {
      console.error('Error in handleUpdateShoppingItem:', err);
    }
  };

  const handleAddCustomStore = (newStore) => {
    if (!customStores.includes(newStore)) {
      setCustomStores([...customStores, newStore]);
    }
  };

  // Dashboard Click Router: Switches view directly to categories drill down!
  const handleSelectCategoryFromDashboard = (categoryKey) => {
    setHistoryViewMode('items');
    setHistoryCategoryFilter(categoryKey);
    setActiveTab('history');
  };

  return (
    <div className="app-container">
      {/* App Header */}
      <header className="app-header">
        <div className="logo-section">
          <h1>SmartSpend</h1>
          <p>Local-First Expense Tracker</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>AI Active</span>
        </div>
      </header>

      {/* Main View Port content based on Navigation */}
      <main className="app-content">
        {activeTab === 'dashboard' && (
          <>
            <Dashboard
              expenses={expenses}
              budget={budget}
              onOpenScan={() => setIsScanOpen(true)}
              onOpenManual={() => setIsManualOpen(true)}
              onSelectCategory={handleSelectCategoryFromDashboard}
              shoppingList={shoppingList}
              onToggleShoppingItem={handleToggleShoppingItem}
              onAddShoppingItem={handleAddShoppingItem}
              onViewFullChecklist={() => setActiveTab('shopping')}
              customStores={customStores}
              onAddCustomStore={handleAddCustomStore}
              onSaveBudget={setBudget}
              showToast={showToast}
            />
          </>
        )}

        {activeTab === 'shopping' && (
          <ShoppingList
            listItems={shoppingList}
            onAddItem={handleAddShoppingItem}
            onToggleItem={handleToggleShoppingItem}
            onDeleteItem={handleDeleteShoppingItem}
            onClearList={handleClearShoppingList}
            onUpdateItem={handleUpdateShoppingItem}
            customStores={customStores}
            onAddCustomStore={handleAddCustomStore}
            customSuggestions={customSuggestions}
            showToast={showToast}
          />
        )}

        {activeTab === 'history' && (
          <History
            expenses={expenses}
            onDelete={handleDeleteExpense}
            viewMode={historyViewMode}
            setViewMode={setHistoryViewMode}
            activeCategoryFilter={historyCategoryFilter}
            setActiveCategoryFilter={setHistoryCategoryFilter}
          />
        )}

        {activeTab === 'settings' && (
          <Settings
            budget={budget}
            onSaveBudget={setBudget}
            expenses={expenses}
            onResetData={handleResetData}
            onSaveAllExpenses={setExpenses}
            customSuggestions={customSuggestions}
            onSaveCustomSuggestions={setCustomSuggestions}
            customStores={customStores}
            showToast={showToast}
          />
        )}
      </main>

      {/* Floating Overlays bottom sheets drawers */}
      {isScanOpen && (
        <Scanner
          onClose={() => setIsScanOpen(false)}
          onSave={handleSaveExpense}
        />
      )}

      {isManualOpen && (
        <ManualForm
          onClose={() => setIsManualOpen(false)}
          onSave={handleSaveExpense}
          customStores={customStores}
          onAddCustomStore={handleAddCustomStore}
          customSuggestions={customSuggestions}
          showToast={showToast}
        />
      )}

      {/* First-Run Welcome Modal */}
      {showWelcome && (
        <div className="welcome-modal-overlay">
          <div className="welcome-modal-box">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.8rem', marginBottom: '8px' }}>👋</div>
              <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.25rem', fontWeight: 800, marginBottom: '8px' }}>
                Welcome to SmartSpend!
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: '1.55' }}>
                Your private, local-first household budget tracker. Everything stays on your phone — no account or sign-up needed.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '4px 0' }}>
              <div className="welcome-feature-row"><span style={{ fontSize: '1.1rem' }}>📊</span><span>Tap the <strong>budget ring</strong> on Home to set your monthly spending limit</span></div>
              <div className="welcome-feature-row"><span style={{ fontSize: '1.1rem' }}>📷</span><span>Tap <strong>Scan Bill</strong> to photograph any receipt — it reads items automatically</span></div>
              <div className="welcome-feature-row"><span style={{ fontSize: '1.1rem' }}>🛒</span><span>Build a <strong>grocery checklist</strong> and share it with family over WhatsApp in one tap</span></div>
              <div className="welcome-feature-row"><span style={{ fontSize: '1.1rem' }}>⚙️</span><span>Visit <strong>Settings</strong> to set your monthly budget and manage your data</span></div>
            </div>
            <button onClick={dismissWelcome} className="solid-btn" style={{ padding: '14px', fontSize: '0.95rem', borderRadius: '16px' }}>
              Let's get started 🚀
            </button>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div className={`app-toast ${toast.type}`}>
          {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'} {toast.message}
        </div>
      )}

      {/* Bottom Nav Bar Controls */}
      <nav className="bottom-nav">
        <button 
          onClick={() => setActiveTab('dashboard')} 
          className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
        >
          <Home size={22} />
          <span style={{ fontSize: '0.62rem', fontWeight: 700, marginTop: '3px' }}>Home</span>
          {activeTab === 'dashboard' && <div className="nav-item-indicator" />}
        </button>

        <button
          onClick={() => setActiveTab('shopping')}
          className={`nav-item ${activeTab === 'shopping' ? 'active' : ''}`}
        >
          <ShoppingBag size={22} />
          <span style={{ fontSize: '0.62rem', fontWeight: 700, marginTop: '3px' }}>Checklist</span>
          {activeTab === 'shopping' && <div className="nav-item-indicator" />}
        </button>

        <button 
          onClick={() => setActiveTab('history')} 
          className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
        >
          <HistoryIcon size={22} />
          <span style={{ fontSize: '0.62rem', fontWeight: 700, marginTop: '3px' }}>Ledger</span>
          {activeTab === 'history' && <div className="nav-item-indicator" />}
        </button>

        <button 
          onClick={() => setActiveTab('settings')} 
          className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
        >
          <SettingsIcon size={22} />
          <span style={{ fontSize: '0.62rem', fontWeight: 700, marginTop: '3px' }}>Settings</span>
          {activeTab === 'settings' && <div className="nav-item-indicator" />}
        </button>
      </nav>
    </div>
  );
}
