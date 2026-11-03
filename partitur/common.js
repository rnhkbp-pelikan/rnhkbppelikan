import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.58.0/+esm';
export { createClient };

export const SITE_NAME = 'Partitur RNHKBP-PELIKAN';
export const SUPABASE_URL = 'https://didowuqjuxipzfqdngnq.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_dpLZqudFvFqxtTO8UNjNEg_M9e93YpW';
// Isi setelah deploy Google Apps Script (lihat README.md, langkah 3).
export const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyrXbC4iuhBboRa_W9S4Pcs-iHiYMP_Wcm_TLt3KhpmHl4BcCV8Q2D9NvKx8FJhE41-/exec';

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

export const $ = (id) => document.getElementById(id);
export const escapeHtml = (v = '') => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* abaikan */ } }
};

export function getDriveFileId(input) {
  const value = String(input || '').trim();
  const m = value.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([a-zA-Z0-9_-]+)/) || value.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  return /^[a-zA-Z0-9_-]{15,}$/.test(value) ? value : '';
}
export const driveViewUrl = (id) => `https://drive.google.com/file/d/${encodeURIComponent(id)}/view`;
export const drivePreviewUrl = (id) => `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview`;
export const driveDownloadUrl = (id) => `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`;
export const driveThumbUrl = (id) => `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w480`;
