import React, { useState } from 'react';
import { Plus, ChevronLeft, Check, Pencil } from 'lucide-react';
import { AVATARS, ACCENT_COLORS, createProfile, updateProfile, deleteProfile } from '../utils/profiles';

// ──────────────────────────────────────────────────────────────
// ProfileGate — the "sign-in" screen shown before the app.
// "Who's spending?" profile picker + friendly add-profile flow.
// Pure local-first: no passwords, no network.
// ──────────────────────────────────────────────────────────────
export default function ProfileGate({ profiles, onSelect, onProfilesChanged }) {
  const [mode, setMode] = useState(profiles.length === 0 ? 'create' : 'pick'); // pick | create | manage
  const [editingId, setEditingId] = useState(null);

  // Create / edit form state
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [color, setColor] = useState(ACCENT_COLORS[0].value);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const resetForm = () => {
    setName('');
    setAvatar(AVATARS[0]);
    setColor(ACCENT_COLORS[0].value);
    setEditingId(null);
    setConfirmDeleteId(null);
  };

  const startCreate = () => {
    resetForm();
    setMode('create');
  };

  const startEdit = (p) => {
    setEditingId(p.id);
    setName(p.name);
    setAvatar(p.avatar);
    setColor(p.color);
    setMode('create');
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    if (editingId) {
      updateProfile(editingId, { name: name.trim(), avatar, color });
      onProfilesChanged();
      resetForm();
      setMode('pick');
    } else {
      const profile = createProfile({ name, avatar, color });
      onProfilesChanged();
      resetForm();
      onSelect(profile); // straight into the app — friendliest path
    }
  };

  const handleDelete = (id) => {
    deleteProfile(id);
    onProfilesChanged();
    setConfirmDeleteId(null);
    if (profiles.length <= 1) setMode('create');
  };

  // ── CREATE / EDIT PROFILE ──────────────────────────────────
  if (mode === 'create') {
    const isFirst = profiles.length === 0;
    return (
      <div className="profile-gate">
        <div className="profile-gate-inner">
          {!isFirst && (
            <button className="gate-back-btn" onClick={() => { resetForm(); setMode('pick'); }}>
              <ChevronLeft size={18} /> Back
            </button>
          )}

          <div style={{ textAlign: 'center', marginBottom: '6px' }}>
            <div className="gate-avatar-preview" style={{ borderColor: color, boxShadow: `0 0 24px ${color}55` }}>
              {avatar}
            </div>
            <h2 className="gate-title">
              {editingId ? 'Edit profile' : isFirst ? 'Welcome to SmartSpend! 👋' : 'New profile'}
            </h2>
            <p className="gate-subtitle">
              {editingId
                ? 'Update your name, avatar or color.'
                : isFirst
                  ? "Let's set up your profile. Everything stays private on this phone — no account or internet needed."
                  : 'Add a family member with their own budget and lists.'}
            </p>
          </div>

          <div className="gate-field">
            <label className="gate-label">Your name</label>
            <input
              className="gate-input"
              type="text"
              value={name}
              maxLength={20}
              placeholder="e.g. Umer"
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
            />
          </div>

          <div className="gate-field">
            <label className="gate-label">Pick an avatar</label>
            <div className="gate-avatar-grid">
              {AVATARS.map(a => (
                <button
                  key={a}
                  className={`gate-avatar-cell ${avatar === a ? 'selected' : ''}`}
                  style={avatar === a ? { borderColor: color, boxShadow: `0 0 12px ${color}66` } : undefined}
                  onClick={() => setAvatar(a)}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div className="gate-field">
            <label className="gate-label">Accent color</label>
            <div className="gate-color-row">
              {ACCENT_COLORS.map(c => (
                <button
                  key={c.value}
                  className={`gate-color-dot ${color === c.value ? 'selected' : ''}`}
                  style={{ background: c.value }}
                  title={c.name}
                  onClick={() => setColor(c.value)}
                >
                  {color === c.value && <Check size={14} color="#fff" strokeWidth={3} />}
                </button>
              ))}
            </div>
          </div>

          <button
            className="solid-btn gate-cta"
            style={{ background: color, opacity: name.trim() ? 1 : 0.45 }}
            disabled={!name.trim()}
            onClick={handleSubmit}
          >
            {editingId ? 'Save changes' : isFirst ? "Let's go 🚀" : 'Create profile'}
          </button>
        </div>
      </div>
    );
  }

  // ── PROFILE PICKER ("sign-in") ─────────────────────────────
  return (
    <div className="profile-gate">
      <div className="profile-gate-inner">
        <div style={{ textAlign: 'center', marginBottom: '10px' }}>
          <h1 className="gate-logo">SmartSpend</h1>
          <h2 className="gate-title">Who's spending? 💸</h2>
          <p className="gate-subtitle">Pick your profile — each person gets their own private budget, ledger and checklists.</p>
        </div>

        <div className="gate-profile-grid">
          {profiles.map(p => (
            <div key={p.id} className="gate-profile-card-wrap">
              <button
                className="gate-profile-card"
                style={{ '--p-color': p.color }}
                onClick={() => (mode === 'manage' ? startEdit(p) : onSelect(p))}
              >
                <span className="gate-profile-avatar" style={{ borderColor: p.color, boxShadow: `0 0 18px ${p.color}44` }}>
                  {p.avatar}
                  {mode === 'manage' && <span className="gate-edit-badge"><Pencil size={12} /></span>}
                </span>
                <span className="gate-profile-name">{p.name}</span>
              </button>
              {mode === 'manage' && (
                confirmDeleteId === p.id ? (
                  <button className="gate-delete-confirm" onClick={() => handleDelete(p.id)}>Confirm delete?</button>
                ) : (
                  <button className="gate-delete-link" onClick={() => setConfirmDeleteId(p.id)}>Remove</button>
                )
              )}
            </div>
          ))}

          <div className="gate-profile-card-wrap">
            <button className="gate-profile-card add" onClick={startCreate}>
              <span className="gate-profile-avatar add-avatar"><Plus size={26} /></span>
              <span className="gate-profile-name" style={{ color: '#94a3b8' }}>Add profile</span>
            </button>
          </div>
        </div>

        <button
          className="gate-manage-btn"
          onClick={() => { setConfirmDeleteId(null); setMode(mode === 'manage' ? 'pick' : 'manage'); }}
        >
          {mode === 'manage' ? 'Done' : 'Manage profiles'}
        </button>

        <p className="gate-privacy-note">🔒 100% local — profiles never leave this device</p>
      </div>
    </div>
  );
}
