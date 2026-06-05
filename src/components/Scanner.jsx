import React, { useState, useRef, useEffect } from 'react';
import { CATEGORIES, parseWithGemini } from '../utils/parser';
import { Camera, FileImage, Sparkles, Check, X, Plus, Trash2, ArrowLeft, Edit3 } from 'lucide-react';
import confetti from 'canvas-confetti';

// Store types for AI prompt tailoring
const STORE_TYPES = [
  { id: 'general',          label: 'Any Store',         icon: '🏬' },
  { id: 'restaurant_depot', label: 'Restaurant Depot',  icon: '🏭' },
  { id: 'costco',           label: 'Costco',            icon: '📦' },
  { id: 'walmart',          label: 'Walmart',           icon: '🛒' },
  { id: 'lotte',            label: 'Lotte Plaza',       icon: '🏮' },
  { id: 'halal',            label: 'Halal Store',       icon: '🥩' },
  { id: 'gas',              label: 'Gas Station',       icon: '⛽' },
];

export default function Scanner({ onSave, onOpenManual, stores = [], showToast }) {
  const [streamActive, setStreamActive] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // scanMode: 'camera' | 'processing' | 'review'
  const [scanMode, setScanMode] = useState('camera');
  const [parsedData, setParsedData] = useState(null);
  const [scanCount, setScanCount] = useState(0);
  const [usedAI, setUsedAI] = useState(false);
  const [lastErrorMsg, setLastErrorMsg] = useState('');
  const [storeType, setStoreType] = useState('general');

  // Category picker state: which item's picker is open
  const [openPicker, setOpenPicker] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      setCameraError(false);
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStreamActive(true);
      } else {
        setTimeout(() => {
          if (videoRef.current) { videoRef.current.srcObject = stream; setStreamActive(true); }
        }, 100);
      }
    } catch (err) {
      console.warn('Camera blocked:', err);
      setCameraError(true);
      setStreamActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
    }
  };

  // Keep image under ~1MB so it fits well within Vercel's 4.5MB body limit
  const compressImage = (dataUrl) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const MAX = 1600;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
        else { width = Math.round(width * MAX / height); height = MAX; }
      }
      const c = document.createElement('canvas');
      c.width = width; c.height = height;
      c.getContext('2d').drawImage(img, 0, 0, width, height);
      resolve(c.toDataURL('image/jpeg', 0.82).split(',')[1]);
    };
    img.src = dataUrl;
  });

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64 = await compressImage(canvas.toDataURL('image/jpeg'));
    processCapturedImage(base64, 'image/jpeg');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = await compressImage(reader.result);
      processCapturedImage(base64, 'image/jpeg');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // ─── PROCESSING PIPELINE ─────────────────────────────────────────────────────
  // Tier 1: Gemini Vision (image → JSON directly)  — primary, reads actual photo
  // Tier 2: Blank manual form with error message   — fallback when AI fails
  const processCapturedImage = async (base64, mimeType) => {
    stopCamera();
    setScanMode('processing');
    setUsedAI(false);
    setLastErrorMsg('');

    let newResult = null;

    // ── TIER 1: Gemini Vision reads the image directly ────────────────────────
    try {
      setStatusMessage('AI reading receipt...');
      newResult = await parseWithGemini(base64, mimeType, storeType);
      setUsedAI(true);
    } catch (visionErr) {
      console.warn('Gemini Vision failed:', visionErr.message);
      const friendly = friendlyError(visionErr.message);
      setLastErrorMsg(friendly);
      setStatusMessage(`Scan failed: ${friendly}`);
    }

    // ── TIER 2: Blank form (clean slate for manual entry) ─────────────────────
    if (!newResult) {
      newResult = {
        merchant: 'Scanned Receipt',
        date: new Date().toISOString().split('T')[0],
        isGasMeter: false,
        items: [{ name: '', amount: 0, category: 'other' }]
      };
    }

    const newCount = scanCount + 1;
    setScanCount(newCount);
    setParsedData(prev => {
      if (prev && newCount > 1) return { ...prev, items: [...prev.items, ...newResult.items] };
      return newResult;
    });
    setScanMode('review');
  };

  const friendlyError = (msg = '') => {
    if (/413|too large|payload/i.test(msg))        return 'Image too large — try closer photo';
    if (/503|not configured/i.test(msg))            return 'AI service not set up on server';
    if (/429|quota|rate limit/i.test(msg))          return 'AI quota reached — try again later';
    if (/no items|empty/i.test(msg))                return 'AI found no items — try better lighting';
    if (/fetch|network|failed to fetch/i.test(msg)) return 'Network error — check connection';
    if (/json parse/i.test(msg))                    return 'AI response malformed — try again';
    return msg.length > 70 ? msg.slice(0, 70) + '…' : msg;
  };

  const handleItemChange = (index, field, value) => {
    if (!parsedData) return;
    const updated = { ...parsedData, items: [...parsedData.items] };
    updated.items[index] = { ...updated.items[index], [field]: value };
    setParsedData(updated);
  };

  const handleAddItem = () => {
    setParsedData(prev => ({ ...prev, items: [...prev.items, { name: '', amount: 0, category: 'other' }] }));
  };

  const handleRemoveItem = (index) => {
    setParsedData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  // "Scan More" — keep existing items, go back to camera
  const handleScanMore = () => {
    setScanMode('camera');
    startCamera();
  };

  // Start over from scratch
  const handleStartOver = () => {
    setParsedData(null);
    setScanCount(0);
    setScanMode('camera');
    startCamera();
  };

  const handleReviewSave = () => {
    if (!parsedData) return;
    const validItems = parsedData.items.filter(i => i.name.trim() && i.amount > 0);
    if (validItems.length === 0) {
      if (showToast) showToast('Add at least one item with a name and amount', 'error');
      return;
    }
    onSave({
      id: Date.now().toString(),
      merchant: parsedData.merchant?.trim() || 'Scanned Bill',
      date: parsedData.date,
      isGasMeter: parsedData.isGasMeter,
      amount: validItems.reduce((s, i) => s + i.amount, 0),
      items: validItems
    });
    try {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.8 }, colors: ['#6366f1', '#10b981', '#fbbf24', '#f43f5e'] });
    } catch {}
    if (showToast) showToast('Receipt saved ✓');
    // Reset back to idle camera view
    setParsedData(null);
    setScanCount(0);
    setScanMode('camera');
    startCamera();
  };

  // ── IDLE / CAMERA VIEW ────────────────────────────────────────────────────────
  const renderCameraView = () => (
    <div>
      {/* Multi-scan context banner */}
      {parsedData && scanCount > 0 && (
        <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'10px 14px',background:'rgba(16,185,129,0.06)',border:'1px solid rgba(16,185,129,0.2)',borderRadius:'12px',marginBottom:'10px',fontSize:'0.75rem',color:'#34d399'}}>
          <Check size={14} style={{flexShrink:0}} />
          <span>Section {scanCount} saved — {parsedData.items.length} items so far. Point camera at the next section and capture.</span>
        </div>
      )}

      {/* Store Type Selector */}
      <div style={{marginBottom:'12px'}}>
        <div style={{fontSize:'0.65rem',fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:'8px'}}>
          Bill type — helps AI read it correctly
        </div>
        <div style={{display:'flex',gap:'6px',overflowX:'auto',paddingBottom:'4px',scrollbarWidth:'none'}}>
          {STORE_TYPES.map(s => (
            <button
              key={s.id}
              onClick={() => setStoreType(s.id)}
              style={{
                flexShrink:0, display:'flex', alignItems:'center', gap:'5px',
                padding:'6px 12px', borderRadius:'50px', cursor:'pointer',
                fontSize:'0.75rem', fontWeight:700,
                border:`1px solid ${storeType === s.id ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.08)'}`,
                background: storeType === s.id ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.03)',
                color: storeType === s.id ? '#a5b4fc' : '#64748b',
                transition:'all 0.15s',
              }}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Viewfinder hero */}
      <div className="scan-hero" style={{height:300}}>
        {!cameraError ? (
          <>
            <video ref={videoRef} autoPlay playsInline muted className="scanner-video" style={{width:'100%',height:'100%',objectFit:'cover'}} />
            <div className="scan-line" />
            <div className="vf-corner vf-tl" />
            <div className="vf-corner vf-tr" />
            <div className="vf-corner vf-bl" />
            <div className="vf-corner vf-br" />
          </>
        ) : (
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'10px',padding:'20px'}}>
            <Camera size={44} style={{color:'#6366f1'}} />
            <p style={{fontSize:'0.8rem',color:'#fff',fontWeight:700,textAlign:'center'}}>Camera Permissions Blocked</p>
            <p style={{fontSize:'0.7rem',color:'#94a3b8',lineHeight:'1.4',textAlign:'center',maxWidth:'240px'}}>
              Allow camera access in your browser Settings, or upload an image instead.
            </p>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} style={{display:'none'}} />

      {/* Action buttons */}
      <div style={{display:'flex',gap:'10px',marginBottom:'12px'}}>
        {streamActive && (
          <button onClick={handleCapture} className="solid-btn" style={{flex:2}}>
            <Camera size={18} /> {scanCount > 0 ? 'Capture Next Section' : 'Scan Receipt'}
          </button>
        )}
        <button onClick={() => fileInputRef.current?.click()} className="outline-btn" style={{flex:1}}>
          <FileImage size={18} /> Upload
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} style={{display:'none'}} />
      </div>

      {/* Add manually button */}
      <button className="add-manually-btn" onClick={onOpenManual}>
        <Edit3 size={18} />
        Add Manually
      </button>
    </div>
  );

  // ── PROCESSING VIEW ───────────────────────────────────────────────────────────
  const renderProcessingView = () => (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'60px 0',gap:'16px'}}>
      <div className="loading-ring" style={{width:'44px',height:'44px',borderTopColor:'#6366f1'}} />
      <div style={{textAlign:'center'}}>
        <p style={{fontWeight:700,fontSize:'0.95rem'}}>
          {scanCount > 0 ? `Reading Section ${scanCount + 1}...` : 'Extracting Bill Details'}
        </p>
        <p style={{fontSize:'0.75rem',color:'#64748b',marginTop:'4px'}}>{statusMessage}</p>
      </div>
    </div>
  );

  // ── REVIEW VIEW ───────────────────────────────────────────────────────────────
  const renderReviewView = () => {
    if (!parsedData) return null;
    const total = parsedData.items.reduce((s, i) => s + (i.amount || 0), 0);

    return (
      <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>
        {/* Back button + title */}
        <div className="review-header">
          <button className="review-back-btn" onClick={handleStartOver}>
            <ArrowLeft size={16} />
          </button>
          <div style={{flex:1}}>
            <h3 style={{fontFamily:'var(--font-title)',fontSize:'1.05rem',fontWeight:800}}>
              Review Receipt
              {scanCount > 0 && (
                <span style={{fontSize:'0.68rem',background:'rgba(99,102,241,0.15)',color:'#a5b4fc',padding:'2px 8px',borderRadius:'20px',fontWeight:700,marginLeft:8}}>
                  {scanCount} section{scanCount > 1 ? 's' : ''} scanned
                </span>
              )}
            </h3>
          </div>
        </div>

        {/* AI success / failure badge */}
        <div style={{display:'flex',alignItems:'flex-start',gap:'6px',padding:'7px 12px',background:usedAI?'rgba(16,185,129,0.08)':'rgba(245,158,11,0.08)',border:`1px solid ${usedAI?'rgba(16,185,129,0.25)':'rgba(245,158,11,0.25)'}`,borderRadius:'10px',fontSize:'0.72rem',fontWeight:700,color:usedAI?'#34d399':'#fbbf24'}}>
          <span style={{flexShrink:0}}>{usedAI ? '✦ Gemini AI' : '⚠ Scan Failed'}</span>
          <span style={{fontWeight:400,opacity:0.85,lineHeight:1.4}}>
            {usedAI
              ? '— Items extracted automatically, review & confirm'
              : lastErrorMsg
                ? `— ${lastErrorMsg}`
                : '— Could not read receipt, fill in items manually'}
          </span>
        </div>

        {/* Editable Merchant */}
        <div className="input-group">
          <label>Store Name / Merchant</label>
          <input
            type="text"
            value={parsedData.merchant}
            onChange={e => setParsedData({...parsedData, merchant: e.target.value})}
            className="input-element"
          />
        </div>

        {/* Editable Date */}
        <div className="input-group">
          <label>Transaction Date</label>
          <input
            type="date"
            value={parsedData.date}
            onChange={e => setParsedData({...parsedData, date: e.target.value})}
            className="input-element"
          />
        </div>

        {/* Items list */}
        <div style={{display:'flex',flexDirection:'column',gap:'2px'}}>
          <label style={{fontSize:'0.8rem',fontWeight:600,color:'var(--slate-text)',marginBottom:'6px'}}>
            Items ({parsedData.items.length})
          </label>

          {parsedData.items.map((item, idx) => (
            <div key={idx} className="review-item-row">
              {/* Category emoji button with popup */}
              <div style={{position:'relative'}}>
                <div
                  className={`cat-emoji-btn${openPicker === idx ? ' open' : ''}`}
                  onClick={() => setOpenPicker(openPicker === idx ? null : idx)}
                >
                  {CATEGORIES[item.category]?.icon || '📦'}
                </div>
                {openPicker === idx && (
                  <div className="cat-picker-popup" onClick={e => e.stopPropagation()}>
                    {Object.entries(CATEGORIES).map(([key, val]) => (
                      <div
                        key={key}
                        className={`cat-picker-opt${item.category === key ? ' selected' : ''}`}
                        onClick={() => { handleItemChange(idx, 'category', key); setOpenPicker(null); }}
                      >
                        <span style={{fontSize:'1.2rem'}}>{val.icon}</span>
                        <span style={{fontSize:'0.58rem',fontWeight:700,color:'#94a3b8',lineHeight:1.2,textAlign:'center'}}>{val.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <input
                type="text"
                value={item.name}
                placeholder="Item name"
                onChange={e => handleItemChange(idx, 'name', e.target.value)}
                className="ri-name-input"
              />
              <input
                type="number"
                step="0.01"
                min="0"
                value={item.amount}
                onChange={e => handleItemChange(idx, 'amount', parseFloat(e.target.value) || 0)}
                className="ri-amount-input"
              />
              <button
                type="button"
                onClick={() => handleRemoveItem(idx)}
                style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',color:'#f87171',padding:'8px',borderRadius:'8px',cursor:'pointer',display:'flex',alignItems:'center',flexShrink:0}}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          <button onClick={handleAddItem} className="outline-btn" style={{padding:'8px',fontSize:'0.78rem',borderRadius:'12px',marginTop:'6px'}}>
            <Plus size={14} /> Add Item
          </button>
        </div>

        {/* Total */}
        <div className="review-total-card">
          <span style={{fontSize:'0.82rem',fontWeight:700,color:'#94a3b8'}}>TOTAL</span>
          <span style={{fontFamily:'var(--font-title)',fontSize:'1.4rem',fontWeight:800,color:'#10b981'}}>
            ${total.toFixed(2)}
          </span>
        </div>

        {/* Action buttons */}
        <div style={{display:'flex',gap:'8px'}}>
          <button onClick={handleReviewSave} className="solid-btn" style={{flex:2}}>
            <Check size={18} /> Save to Ledger
          </button>
          <button onClick={handleScanMore} className="outline-btn" style={{flex:1,fontSize:'0.78rem'}}>
            <Camera size={14} /> Scan More
          </button>
        </div>
        <button
          onClick={handleStartOver}
          style={{background:'none',border:'none',color:'#64748b',fontSize:'0.72rem',cursor:'pointer',textAlign:'center',paddingBottom:'4px'}}
        >
          Start over
        </button>
      </div>
    );
  };

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'4px'}} onClick={() => openPicker !== null && setOpenPicker(null)}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'14px'}}>
        <Sparkles size={18} style={{color:'#6366f1'}} />
        <h2 style={{fontFamily:'var(--font-title)',fontSize:'1.15rem',fontWeight:800}}>Smart Bill Scanner</h2>
      </div>

      {scanMode === 'camera' && renderCameraView()}
      {scanMode === 'processing' && renderProcessingView()}
      {scanMode === 'review' && renderReviewView()}
    </div>
  );
}
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            