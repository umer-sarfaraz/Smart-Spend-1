import React, { useState, useRef, useEffect } from 'react';
import { CATEGORIES, DEMO_PANTRY_ITEMS, scanPantryWithGemini } from '../utils/parser';
import { Camera, FileImage, Sparkles, Check, RefreshCw, Info, Calendar, ArrowRight, X, ShieldAlert, Library } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function Pantry({ expenses, budget, onSaveBudget }) {
  // 1. Core Persistent Inventory States
  const [scannedItems, setScannedItems] = useState(() => {
    const cached = localStorage.getItem('smartspend_pantry_inventory');
    return cached ? JSON.parse(cached) : [];
  });

  const [scanType, setScanType] = useState('fridge'); // 'fridge' or 'dry'
  const [hasRolledOver, setHasRolledOver] = useState(false);

  // Pop-up Drawer Scanner states
  const [showScanner, setShowScanner] = useState(false);
  const [streamActive, setStreamActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [cameraError, setCameraError] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // 2. Persist inventory changes permanently on phone
  useEffect(() => {
    localStorage.setItem('smartspend_pantry_inventory', JSON.stringify(scannedItems));
  }, [scannedItems]);

  // 3. Automatically start camera ONLY when pop-up drawer opens, and release completely on close!
  useEffect(() => {
    if (showScanner) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [showScanner, scanType]);

  // 4. Calculate leftover values matching real prices from ledger
  const calculateLeftoverValues = () => {
    let totalOriginal = 0;
    let totalLeftover = 0;

    const itemsWithValue = scannedItems.map(item => {
      let historicalCost = item.originalCost || 5.00; // default $5 fallback
      
      const matchingExpenseItem = expenses
        .flatMap(exp => exp.items)
        .find(expItem => expItem.name.toLowerCase().includes(item.name.toLowerCase()) || item.name.toLowerCase().includes(expItem.name.toLowerCase()));
      
      if (matchingExpenseItem) {
        historicalCost = matchingExpenseItem.amount;
      }

      const leftoverValue = parseFloat(((item.fullPercent / 100) * historicalCost).toFixed(2));
      totalOriginal += historicalCost;
      totalLeftover += leftoverValue;

      return {
        ...item,
        originalCost: historicalCost,
        leftoverValue: leftoverValue
      };
    });

    return {
      items: itemsWithValue,
      totalOriginal,
      totalLeftover
    };
  };

  const valuation = calculateLeftoverValues();

  const startCamera = async () => {
    try {
      setCameraError(false);
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false
        });
      } catch (err) {
        // Fallback to front camera or laptop default webcam!
        console.warn('Pantry rear camera failed, falling back to webcam:', err);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStreamActive(true);
      } else {
        // Safe DOM mount retry binding
        let retries = 0;
        const interval = setInterval(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            setStreamActive(true);
            clearInterval(interval);
          }
          retries++;
          if (retries > 10) clearInterval(interval);
        }, 100);
      }
    } catch (err) {
      console.warn('Pantry camera access blocked completely, fallback to simulator:', err);
      setCameraError(true);
      setStreamActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null; // Clean Safari hardware lock release!
    }
    setStreamActive(false);
  };

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg');
    const base64 = dataUrl.split(',')[1];
    
    processPantryImage(base64, 'image/jpeg');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const base64 = dataUrl.split(',')[1];
      processPantryImage(base64, file.type);
    };
    reader.readAsDataURL(file);
  };

  const handleTriggerDemo = (type) => {
    stopCamera();
    setIsProcessing(true);
    setScanType(type);
    setHasRolledOver(false);

    const steps = type === 'fridge' 
      ? [
          'Opening neural vision channels...',
          'Detecting refrigerator shelves...',
          'Extracting ingredients (Milk, Eggs, Tomatoes)...',
          'Analyzing organic volume layers...',
          'Finalizing inventory percentages...'
        ]
      : [
          'Calibrating dry container bounds...',
          'Reading dry package densities...',
          'Estimating powder dry weight...',
          'Finalizing wheat percentages...'
        ];

    let currentStep = 0;
    setStatusMessage(steps[0]);

    const timer = setInterval(() => {
      currentStep++;
      if (currentStep < steps.length) {
        setStatusMessage(steps[currentStep]);
      } else {
        clearInterval(timer);
        setScannedItems(DEMO_PANTRY_ITEMS[type]);
        setIsProcessing(false);
        setShowScanner(false); // Close drawer successfully!
        
        try {
          confetti({
            particleCount: 50,
            spread: 40,
            origin: { y: 0.8 },
            colors: ['#a3e635', '#10b981']
          });
        } catch (err) {
          console.warn(err);
        }
      }
    }, 450);
  };

  const processPantryImage = async (base64, mimeType) => {
    stopCamera();
    setIsProcessing(true);
    setHasRolledOver(false);

    const apiKey = localStorage.getItem('smartspend_gemini_key');

    try {
      if (apiKey) {
        setStatusMessage(scanType === 'fridge' ? 'AI Fridge Vision processing...' : 'AI Dry Package density scanning...');
        const response = await scanPantryWithGemini(base64, mimeType, apiKey, scanType);
        setScannedItems(response);
        setShowScanner(false);
      } else {
        setStatusMessage('AI Image extraction loading...');
        await new Promise(resolve => setTimeout(resolve, 800));
        setScannedItems(DEMO_PANTRY_ITEMS[scanType]);
        setShowScanner(false);
      }
    } catch (err) {
      console.error(err);
      alert('Pantry scan failed. Loading simulated demo.');
      setScannedItems(DEMO_PANTRY_ITEMS[scanType]);
      setShowScanner(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRolloverBudget = () => {
    if (valuation.totalLeftover <= 0 || hasRolledOver) return;

    const newBudget = budget + valuation.totalLeftover;
    onSaveBudget(newBudget);
    setHasRolledOver(true);

    try {
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#a3e635', '#10b981', '#60a5fa', '#818cf8']
      });
    } catch (err) {
      console.warn(err);
    }

    alert(`🎉 Budget rollover approved! Leftover value of $${valuation.totalLeftover.toFixed(2)} transferred. Target budget is now $${newBudget.toFixed(2)}!`);
  };

  // Helper to get item emoji
  const getItemEmoji = (name, cat) => {
    const clean = name.toLowerCase();
    if (clean.includes('milk')) return '🥛';
    if (clean.includes('egg')) return '🥚';
    if (clean.includes('tomato')) return '🍅';
    if (clean.includes('salmon') || clean.includes('fish')) return '🐟';
    if (clean.includes('bread')) return '🍞';
    if (clean.includes('wheat') || clean.includes('flour')) return '🌾';
    return CATEGORIES[cat]?.icon || '📦';
  };

  return (
    <div className="pantry-view" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Visual Header Banner */}
      <div className="tip-banner">
        <Sparkles size={18} className="text-emerald" style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          <strong>AI Pantry Rollover:</strong> Scan your fridge or wheat bags at the end of the month. The AI estimates remaining quantity and rolls over the cash value to next month's spending budget!
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 🏡 STATE A: INVENTORY DASHBOARD (Unscanned / Idle View)                  */}
      {/* ========================================================================= */}
      {scannedItems.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Main Glowing Scan Action Buttons */}
          <div className="glass-card" style={{ display: 'flex', gap: '12px', padding: '16px' }}>
            <button 
              onClick={() => { setScanType('fridge'); setShowScanner(true); }} 
              className="solid-btn" 
              style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #a3e635, #10b981)', borderRadius: '14px' }}
            >
              🧊 Scan Refrigerator
            </button>
            <button 
              onClick={() => { setScanType('dry'); setShowScanner(true); }} 
              className="outline-btn" 
              style={{ flex: 1, padding: '12px', borderColor: '#a3e635', color: '#a3e635', borderRadius: '14px' }}
            >
              🌾 Scan Dry Bag
            </button>
          </div>

          {/* Fridge & Dry Stocks Inventory Lists */}
          <div className="glass-card" style={{ padding: '16px' }}>
            <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '0.92rem', fontWeight: 800, marginBottom: '12px', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
              🧊 Refrigerator Inventory Status
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {DEMO_PANTRY_ITEMS.fridge.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '10px', fontSize: '0.78rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{getItemEmoji(item.name, item.category)}</span>
                    <span style={{ fontWeight: 700 }}>{item.name}</span>
                  </div>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Not audited yet</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card" style={{ padding: '16px' }}>
            <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '0.92rem', fontWeight: 800, marginBottom: '12px', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
              🌾 Dry Container Inventory Status
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {DEMO_PANTRY_ITEMS.dry.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '10px', fontSize: '0.78rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{getItemEmoji(item.name, item.category)}</span>
                    <span style={{ fontWeight: 700 }}>{item.name}</span>
                  </div>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Not audited yet</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 📊 STATE B: SCANNED RESULTS DETAILS PAGE (With Big clear Go Back button) */}
      {/* ========================================================================= */}
      {scannedItems.length > 0 && !isProcessing && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Detailed Calculations list */}
          <div className="glass-card" style={{ padding: '20px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 className="section-title" style={{ marginBottom: 0, fontSize: '0.92rem' }}>
                {scanType === 'fridge' ? '🧊 Refrigerator Leftovers' : '🌾 Dry Pantry Leftovers'}
              </h2>
              <span style={{ fontSize: '0.65rem', background: '#a3e63520', color: '#a3e635', fontWeight: 700, padding: '2px 8px', borderRadius: '10px' }}>
                Audited
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {valuation.items.map((item, idx) => {
                const itemCat = CATEGORIES[item.category || 'other'] || CATEGORIES.other;
                return (
                  <div 
                    key={idx}
                    style={{
                      padding: '12px 14px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      borderRadius: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{getItemEmoji(item.name, item.category)}</span>
                        <span>{item.name}</span>
                      </span>
                      <span style={{ fontFamily: 'var(--font-title)', fontSize: '0.92rem', fontWeight: 800, color: '#fff' }}>
                        ${item.leftoverValue.toFixed(2)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: 'var(--slate-text)', fontWeight: 600 }}>
                      <span>Remaining: {item.fullPercent}%</span>
                      <span>Audit Cost: ${item.originalCost.toFixed(2)}</span>
                    </div>

                    <div className="cat-bar-bg" style={{ height: '6px' }}>
                      <div 
                        className="cat-bar-fill" 
                        style={{ 
                          width: `${item.fullPercent}%`,
                          background: item.fullPercent > 30 ? 'linear-gradient(90deg, #a3e635, #10b981)' : 'linear-gradient(90deg, #f43f5e, #fb7185)'
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rollover budget Panel card */}
          <div className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(163, 230, 53, 0.08) 0%, rgba(16, 185, 129, 0.03) 100%)', borderColor: 'rgba(163, 230, 53, 0.25)', padding: '20px' }}>
            <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.05rem', fontWeight: 800, color: '#d9f99d', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              💰 Leftover Cash Rollover Engine
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', fontSize: '0.78rem', color: '#cbd5e1', lineHeight: '1.4' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Audited Items original value:</span>
                <span style={{ fontWeight: 700 }}>${valuation.totalOriginal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px' }}>
                <span>Estimated leftover value:</span>
                <span style={{ fontWeight: 800, color: '#a3e635' }}>${valuation.totalLeftover.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, paddingTop: '4px', fontSize: '0.82rem' }}>
                <span>Transfer next month bonus:</span>
                <span style={{ color: '#a3e635' }}>+${valuation.totalLeftover.toFixed(2)}</span>
              </div>
            </div>

            {hasRolledOver ? (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', color: '#10b981', background: 'rgba(16, 185, 129, 0.05)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.15)', fontSize: '0.82rem', fontWeight: 700 }}>
                <Check size={16} /> Rollover approved & transferred!
              </div>
            ) : (
              <button 
                onClick={handleRolloverBudget}
                className="solid-btn"
                style={{ 
                  background: 'linear-gradient(135deg, #a3e635, #10b981)',
                  boxShadow: '0 4px 14px rgba(163, 230, 53, 0.25)',
                  fontSize: '0.88rem' 
                }}
              >
                Approve Rollover Transfer <ArrowRight size={16} />
              </button>
            )}
          </div>

          {/* 🔙 Prominent Back / Reset Button */}
          <button 
            onClick={() => { setScannedItems([]); setHasRolledOver(false); }}
            className="outline-btn"
            style={{ padding: '14px', width: '100%', borderRadius: '14px', borderColor: 'rgba(255,255,255,0.08)', fontWeight: 800 }}
          >
            🔄 Reset & Scan Another Item
          </button>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 📷 STATE C: POP-UP OVERLAY SCANNER DRAWER (Only running when drawer open) */}
      {/* ========================================================================= */}
      {showScanner && (
        <div className="drawer-overlay" onClick={() => setShowScanner(false)}>
          <div className="drawer-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-drag-handle" />

            <div className="drawer-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Camera size={18} className="text-emerald" /> AI {scanType === 'fridge' ? 'Fridge' : 'Dry container'} Vision Scanner
              </h3>
              <button onClick={() => setShowScanner(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {!isProcessing && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                
                {/* Viewport viewport */}
                {!cameraError ? (
                  <div className="scanner-viewport" style={{ height: '200px' }}>
                    <video ref={videoRef} autoPlay playsInline muted className="scanner-video" />
                    <div className="scanner-grid-box" />
                    <div className="scanner-laser-line" />
                  </div>
                ) : (
                  <div className="scanner-viewport" style={{ height: '180px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px', gap: '10px' }}>
                    <ShieldAlert size={36} className="text-amber" style={{ color: 'var(--primary)' }} />
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 700, marginBottom: '4px' }}>Camera Permissions Blocked</p>
                      <p style={{ fontSize: '0.7rem', color: '#94a3b8', lineHeight: '1.4', maxWidth: '240px', margin: '0 auto' }}>
                        Please allow camera access in your mobile browser **Settings**, or run a simulated scan below!
                      </p>
                    </div>
                  </div>
                )}

                {/* Main Capture Buttons inside drawer */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  {streamActive && (
                    <button onClick={handleCapture} className="solid-btn" style={{ flex: 2, background: 'linear-gradient(135deg, #a3e635, #10b981)' }}>
                      <Camera size={18} /> Capture Pantry Photo
                    </button>
                  )}
                  <button onClick={() => fileInputRef.current?.click()} className="outline-btn" style={{ flex: 1 }}>
                    Upload Image
                  </button>
                </div>

                {/* Contextual Simulator Button inside drawer */}
                <button 
                  onClick={() => handleTriggerDemo(scanType)}
                  className="outline-btn"
                  style={{ width: '100%', padding: '12px', borderStyle: 'dashed', color: '#a3e635', borderColor: '#a3e635', fontWeight: 700 }}
                >
                  ✨ Run Offline {scanType === 'fridge' ? 'Fridge' : 'Dry Bag'} Simulator Scan
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />

              </div>
            )}

            {isProcessing && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: '16px' }}>
                <div className="loading-ring" style={{ width: '36px', height: '36px', borderTopColor: '#a3e635' }} />
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontWeight: 700, fontSize: '0.95rem' }}>AI Pantry Density Extraction</p>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>{statusMessage}</p>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
