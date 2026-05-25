import React, { useState, useRef, useEffect } from 'react';
import { createWorker } from 'tesseract.js';
import { CATEGORIES, parseOcrTextOffline, parseWithGemini, parseTextWithGemini } from '../utils/parser';
import { Camera, FileImage, Sparkles, Check, X, Plus, Trash2 } from 'lucide-react';
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

export default function Scanner({ onClose, onSave }) {
  const [streamActive, setStreamActive] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Multi-scan state
  // parsedData holds the ACCUMULATED review data
  // scanMode: 'camera' | 'processing' | 'review'
  const [scanMode, setScanMode] = useState('camera');
  const [parsedData, setParsedData] = useState(null);
  const [scanCount, setScanCount] = useState(0);
  const [usedAI, setUsedAI] = useState(false);
  const [storeType, setStoreType] = useState('general');

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

  // Resize + compress image to max 1600px, JPEG quality 0.82
  // Keeps text legible for Gemini while staying well under Vercel's 10MB limit
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

  // ─── NEW PROCESSING PIPELINE ────────────────────────────────────────────────
  // Tier 1: Tesseract OCR  → raw text  (dedicated OCR engine)
  // Tier 2: Gemini Text AI → JSON      (text reasoning, most accurate)
  // Tier 3: Offline regex  → JSON      (no network needed)
  // Tier 4: Gemini Vision  → JSON      (fallback if OCR failed completely)
  // Tier 5: Empty form                 (manual entry)
  const processCapturedImage = async (base64, mimeType) => {
    stopCamera();
    setScanMode('processing');
    setUsedAI(false);

    try {
      // ── TIER 1: OCR the image with Tesseract ─────────────────────────────
      let rawText = '';
      try {
        setStatusMessage('Reading receipt text...');
        const worker = await createWorker('eng', 1, {
          logger: m => {
            if (m.status === 'recognizing text') {
              setStatusMessage(`Reading text... ${Math.round((m.progress || 0) * 100)}%`);
            }
          }
        });
        const { data: { text } } = await worker.recognize(`data:${mimeType};base64,${base64}`);
        await worker.terminate();
        rawText = text.trim();
      } catch (ocrErr) {
        console.warn('Tesseract OCR error:', ocrErr.message);
      }

      let newResult = null;

      if (rawText.length > 40) {
        // ── TIER 2: Send OCR text to Gemini for intelligent parsing ──────
        // Gemini reads TEXT far better than images for complex receipt layouts
        try {
          setStatusMessage('AI reading receipt...');
          newResult = await parseTextWithGemini(rawText, storeType);
          setUsedAI(true);
        } catch (textErr) {
          console.warn('Gemini text parse failed:', textErr.message);

          // ── TIER 3: Offline regex parser on OCR text ─────────────────
          setStatusMessage('Parsing offline...');
          newResult = parseOcrTextOffline(rawText);
          if (!newResult.items.length ||
              (newResult.items.length === 1 && newResult.items[0].name === 'General Purchase')) {
            newResult.items = [{ name: '', amount: 0, category: 'other' }];
          }
        }
      }

      if (!newResult) {
        // ── TIER 4: No OCR text → fall back to Gemini Vision directly ───
        try {
          setStatusMessage('Trying AI vision...');
          newResult = await parseWithGemini(base64, mimeType, storeType);
          setUsedAI(true);
        } catch (visionErr) {
          console.warn('Gemini vision failed:', visionErr.message);
          // ── TIER 5: Completely failed → empty form for manual entry ──
          newResult = {
            merchant: 'Scanned Receipt',
            date: new Date().toISOString().split('T')[0],
            isGasMeter: false,
            items: [{ name: '', amount: 0, category: 'other' }]
          };
        }
      }

      const newCount = scanCount + 1;
      setScanCount(newCount);
      setParsedData(prev => {
        if (prev && newCount > 1) return { ...prev, items: [...prev.items, ...newResult.items] };
        return newResult;
      });
      setScanMode('review');

    } catch (err) {
      console.error('Processing pipeline failed:', err);
      setStatusMessage('Scan failed — fill in manually below.');
      setParsedData(prev => prev || {
        merchant: 'Scanned Receipt',
        date: new Date().toISOString().split('T')[0],
        isGasMeter: false,
        items: [{ name: '', amount: 0, category: 'other' }]
      });
      setScanMode('review');
    }
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
    if (validItems.length === 0) return;
    onSave({
      id: Date.now().toString(),
      merchant: parsedData.merchant?.trim() || 'Scanned Bill',
      date: parsedData.date,
      isGasMeter: parsedData.isGasMeter,
      amount: validItems.reduce((s, i) => s + i.amount, 0),
      items: validItems
    });
    try { confetti({ particleCount: 100, spread: 70, origin: { y: 0.8 }, colors: ['#6366f1', '#10b981', '#fbbf24', '#f43f5e'] }); } catch {}
    onClose();
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-sheet" style={{ maxHeight: '92%' }} onClick={e => e.stopPropagation()}>
        <div className="drawer-drag-handle" />

        <div className="drawer-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles className="text-primary" size={18} /> Smart Bill Scanner
            {scanCount > 0 && (
              <span style={{ fontSize: '0.68rem', background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', padding: '2px 8px', borderRadius: '20px', fontWeight: 700 }}>
                {scanCount} section{scanCount > 1 ? 's' : ''} scanned
              </span>
            )}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* ===== CAMERA VIEW ===== */}
        {scanMode === 'camera' && (
          <div>
            {/* Multi-scan context banner */}
            {parsedData && scanCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px', marginBottom: '10px', fontSize: '0.75rem', color: '#34d399' }}>
                <Check size={14} style={{ flexShrink: 0 }} />
                <span>Section {scanCount} saved — {parsedData.items.length} items so far. Point camera at the next section and capture.</span>
              </div>
            )}

            {/* Store Type Selector */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>
                Bill type — helps AI read it correctly
              </div>
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
                {STORE_TYPES.map(s => (
                  <button key={s.id} onClick={() => setStoreType(s.id)}
                    style={{
                      flexShrink: 0,
                      display: 'flex', alignItems: 'center', gap: '5px',
                      padding: '6px 12px', borderRadius: '50px', cursor: 'pointer',
                      fontSize: '0.75rem', fontWeight: 700,
                      border: `1px solid ${storeType === s.id ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.08)'}`,
                      background: storeType === s.id ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.03)',
                      color: storeType === s.id ? '#a5b4fc' : '#64748b',
                      transition: 'all 0.15s',
                    }}>
                    {s.icon} {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Camera viewport — full size now that demo is removed */}
            {!cameraError ? (
              <div className="scanner-viewport" style={{ height: '320px' }}>
                <video ref={videoRef} autoPlay playsInline muted className="scanner-video" />
                <div className="scanner-grid-box" />
                <div className="scanner-laser-line" />
              </div>
            ) : (
              <div className="scanner-viewport" style={{ height: '180px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px', gap: '10px' }}>
                <Camera size={36} className="text-primary" />
                <p style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 700, textAlign: 'center' }}>Camera Permissions Blocked</p>
                <p style={{ fontSize: '0.7rem', color: '#94a3b8', lineHeight: '1.4', textAlign: 'center', maxWidth: '240px' }}>Allow camera access in your browser Settings, or upload an image instead.</p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
              {streamActive && (
                <button onClick={handleCapture} className="solid-btn" style={{ flex: 2 }}>
                  <Camera size={18} /> {scanCount > 0 ? 'Capture Next Section' : 'Capture Photo'}
                </button>
              )}
              <button onClick={() => fileInputRef.current?.click()} className="outline-btn" style={{ flex: 1 }}>
                <FileImage size={18} /> Upload
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>
          </div>
        )}

        {/* ===== PROCESSING VIEW ===== */}
        {scanMode === 'processing' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: '16px' }}>
            <div className="loading-ring" style={{ width: '40px', height: '40px', borderTopColor: '#6366f1' }} />
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                {scanCount > 0 ? `Reading Section ${scanCount + 1}...` : 'Extracting Bill Details'}
              </p>
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>{statusMessage}</p>
            </div>
          </div>
        )}

        {/* ===== REVIEW VIEW ===== */}
        {scanMode === 'review' && parsedData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* AI vs OCR badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', background: usedAI ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)', border: `1px solid ${usedAI ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`, borderRadius: '10px', fontSize: '0.72rem', fontWeight: 700, color: usedAI ? '#34d399' : '#fbbf24' }}>
              <span>{usedAI ? '✦ Gemini AI' : '⚠ Offline Parser'}</span>
              <span style={{ fontWeight: 400, opacity: 0.8 }}>{usedAI ? '— OCR + AI text analysis' : '— No internet or AI unavailable, check items'}</span>
            </div>

            {/* Multi-scan tip */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 14px', background: scanCount > 1 ? 'rgba(99,102,241,0.06)' : 'rgba(16,185,129,0.06)', border: `1px solid ${scanCount > 1 ? 'rgba(99,102,241,0.2)' : 'rgba(16,185,129,0.2)'}`, borderRadius: '12px', fontSize: '0.75rem', lineHeight: 1.5 }}>
              <Sparkles size={14} style={{ flexShrink: 0, marginTop: 1, color: scanCount > 1 ? '#a5b4fc' : '#34d399' }} />
              <div style={{ color: scanCount > 1 ? '#a5b4fc' : '#34d399' }}>
                {scanCount > 1
                  ? `${scanCount} sections combined — ${parsedData.items.length} items total. Review below, or tap "Scan More" to add another section.`
                  : 'Scan complete! Verify the items below. Have a long bill? Tap "Scan More" to add another section.'}
              </div>
            </div>

            {/* Editable Merchant */}
            <div className="input-group">
              <label>Store Name / Merchant</label>
              <input type="text" value={parsedData.merchant} onChange={e => setParsedData({ ...parsedData, merchant: e.target.value })} className="input-element" />
            </div>

            {/* Editable Date */}
            <div className="input-group">
              <label>Transaction Date</label>
              <input type="date" value={parsedData.date} onChange={e => setParsedData({ ...parsedData, date: e.target.value })} className="input-element" />
            </div>

            {/* Items list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--slate-text)' }}>
                Extracted Items ({parsedData.items.length})
              </label>

              {parsedData.items.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={item.name}
                      placeholder="Item name"
                      onChange={e => handleItemChange(idx, 'name', e.target.value)}
                      className="input-element"
                      style={{ flex: 2, padding: '8px', fontSize: '0.85rem' }}
                    />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.amount}
                      onChange={e => handleItemChange(idx, 'amount', parseFloat(e.target.value) || 0)}
                      className="input-element"
                      style={{ flex: 1, padding: '8px', fontSize: '0.85rem', fontFamily: 'var(--font-title)', fontWeight: 700 }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', padding: '8px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="cat-chips-scroll" style={{ paddingBottom: 0 }}>
                    {Object.entries(CATEGORIES).map(([key, value]) => (
                      <div
                        key={key}
                        onClick={() => handleItemChange(idx, 'category', key)}
                        className={`cat-chip ${item.category === key ? 'selected' : ''}`}
                        style={{ padding: '4px 10px', fontSize: '0.7rem', borderColor: item.category === key ? value.color : 'rgba(255,255,255,0.08)', background: item.category === key ? `${value.color}20` : 'rgba(255,255,255,0.04)' }}
                      >
                        <span>{value.icon}</span><span>{value.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Add item manually */}
              <button onClick={handleAddItem} className="outline-btn" style={{ padding: '8px', fontSize: '0.78rem', borderRadius: '12px', marginTop: '2px' }}>
                <Plus size={14} /> Add Item Manually
              </button>
            </div>

            {/* Total */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#94a3b8' }}>TOTAL</span>
              <span style={{ fontFamily: 'var(--font-title)', fontSize: '1.4rem', fontWeight: 800, color: '#10b981' }}>
                ${parsedData.items.reduce((s, i) => s + (i.amount || 0), 0).toFixed(2)}
              </span>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleReviewSave} className="solid-btn" style={{ flex: 2 }}>
                <Check size={18} /> Confirm & Save
              </button>
              <button onClick={handleScanMore} className="outline-btn" style={{ flex: 1, fontSize: '0.78rem' }}>
                <Camera size={14} /> Scan More
              </button>
            </div>
            <button onClick={handleStartOver} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.72rem', cursor: 'pointer', textAlign: 'center', paddingBottom: '4px' }}>
              Start over
            </button>

          </div>
        )}
      </div>
    </div>
  );
}
