import React from 'react';
import { X } from 'lucide-react';

// Shared, action-oriented empty state used across screens (History, Dashboard, …).
// Distinguishes a true "no data yet" zero-state from a "filters returned nothing"
// state at the call site, and can optionally offer a one-tap reset.
export default function EmptyState({ icon, title, message, showClear = false, onClear }) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '44px 24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '6px'
    }}>
      <div style={{
        width: 56,
        height: 56,
        borderRadius: 18,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.06)',
        color: 'var(--slate-text)',
        marginBottom: '6px'
      }}>
        {icon}
      </div>
      <p style={{ fontFamily: 'var(--font-title)', fontSize: '0.95rem', fontWeight: 700, color: 'var(--white-text)', margin: 0 }}>
        {title}
      </p>
      <p style={{ fontSize: '0.8rem', color: 'var(--slate-text)', margin: 0, maxWidth: 260, lineHeight: 1.5 }}>
        {message}
      </p>
      {showClear && (
        <button
          type="button"
          onClick={onClear}
          className="outline-btn"
          style={{ width: 'auto', padding: '8px 16px', fontSize: '0.8rem', borderRadius: '10px', marginTop: '10px' }}
        >
          <X size={14} /> Clear filters
        </button>
      )}
    </div>
  );
}
