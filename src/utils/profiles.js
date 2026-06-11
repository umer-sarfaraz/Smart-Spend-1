// ──────────────────────────────────────────────────────────────
// SmartSpend Local Profiles Engine
// Local-first multi-user system. Each profile gets its own
// namespaced localStorage keys so family members on a shared
// phone keep fully separate budgets, ledgers and checklists.
//
// AUTH-READY: this module is the single seam for swapping in
// real auth later (Supabase/Firebase). Replace getProfiles /
// setActiveProfileId with API calls and the rest of the app
// stays untouched.
// ──────────────────────────────────────────────────────────────

const PROFILES_KEY = 'smartspend_profiles';
const ACTIVE_KEY = 'smartspend_active_profile';

// Legacy single-user keys (pre-profiles versions of the app)
const LEGACY_KEYS = [
  'smartspend_expenses',
  'smartspend_budget',
  'smartspend_shopping_list',
  'smartspend_custom_stores',
  'smartspend_custom_suggestions',
  'smartspend_stores',
  'smartspend_pantry_inventory',
  'smartspend_welcomed'
];

export const AVATARS = ['😀','😎','🦊','🐼','🦁','🐸','🌸','⭐','🚀','💎','🍕','⚽','🎮','🎨','📚','💪'];

export const ACCENT_COLORS = [
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Sky', value: '#0ea5e9' },
  { name: 'Violet', value: '#a78bfa' }
];

export function getProfiles() {
  try {
    const p = JSON.parse(localStorage.getItem(PROFILES_KEY) || 'null');
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

export function saveProfiles(profiles) {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

export function getActiveProfileId() {
  return localStorage.getItem(ACTIVE_KEY) || null;
}

export function setActiveProfileId(id) {
  if (id) localStorage.setItem(ACTIVE_KEY, id);
  else localStorage.removeItem(ACTIVE_KEY);
}

export function getActiveProfile() {
  const id = getActiveProfileId();
  if (!id) return null;
  return getProfiles().find(p => p.id === id) || null;
}

// Per-profile namespaced storage key
export function pKey(profileId, key) {
  return `smartspend_${key}__${profileId}`;
}

export function loadP(profileId, key, fallback) {
  try {
    const raw = localStorage.getItem(pKey(profileId, key));
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function saveP(profileId, key, value) {
  localStorage.setItem(pKey(profileId, key), JSON.stringify(value));
}

export function removeP(profileId, key) {
  localStorage.removeItem(pKey(profileId, key));
}

// Create a profile. The very first profile inherits any legacy
// single-user data already on this device (seamless upgrade).
export function createProfile({ name, avatar, color }) {
  const profiles = getProfiles();
  const profile = {
    id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim(),
    avatar: avatar || '😀',
    color: color || '#6366f1',
    createdAt: new Date().toISOString()
  };

  if (profiles.length === 0) migrateLegacyData(profile.id);

  saveProfiles([...profiles, profile]);
  return profile;
}

export function updateProfile(id, fields) {
  const profiles = getProfiles().map(p => (p.id === id ? { ...p, ...fields } : p));
  saveProfiles(profiles);
  return profiles.find(p => p.id === id);
}

export function deleteProfile(id) {
  saveProfiles(getProfiles().filter(p => p.id !== id));
  // Wipe that profile's data
  LEGACY_KEYS.forEach(k => localStorage.removeItem(`${k}__${id}`));
  Object.keys(localStorage)
    .filter(k => k.endsWith(`__${id}`))
    .forEach(k => localStorage.removeItem(k));
  if (getActiveProfileId() === id) setActiveProfileId(null);
}

// Move pre-profiles data into the first profile's namespace
function migrateLegacyData(profileId) {
  LEGACY_KEYS.forEach(legacyKey => {
    const raw = localStorage.getItem(legacyKey);
    if (raw === null) return;
    const shortKey = legacyKey.replace('smartspend_', '');
    try {
      // budget + welcomed were stored as plain strings; normalize to JSON
      if (legacyKey === 'smartspend_budget') {
        saveP(profileId, shortKey, parseFloat(raw) || 500);
      } else if (legacyKey === 'smartspend_welcomed') {
        saveP(profileId, shortKey, true);
      } else {
        saveP(profileId, shortKey, JSON.parse(raw));
      }
      localStorage.removeItem(legacyKey);
    } catch {
      /* leave unparseable legacy data alone */
    }
  });
}

export function getGreeting(name) {
  const h = new Date().getHours();
  const part = h < 5 ? 'Up late' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return `${part}, ${name}`;
}
