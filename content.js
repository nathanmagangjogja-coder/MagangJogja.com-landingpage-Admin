/* ============================================================
   content.js — data + live-sync layer for magangjogja.com
   ------------------------------------------------------------
   Scope is deliberately narrow: only 3 things are admin-editable —
   1) logo, 2) Formasi Magang (positions, incl. how many there are),
   3) Fasilitas (facilities, incl. how many there are).
   Everything else on the page (header, syarat & ketentuan, kontak,
   design, layout) is left completely alone.

   magangjogja.html on disk is NEVER modified. This script only
   reads/writes text, image src on the elements that already exist
   in the original file, targeted through the unique data-id
   attributes Elementor already generated for them. It's injected
   into the response at the edge by middleware.js — see that file.

   Content itself lives server-side (Vercel KV), reached through
   /api/content and /api/auth, so every visitor sees the same
   content in real time.

   Used by:
   - magangjogja.html (public site, script injected by middleware.js)
     -> calls applyContentToPage() on load.
   - admin.html (editor) -> uses loadContent/saveContent/resetContent/
     checkAdminPassword to let a non-technical admin edit that content.
   ============================================================ */

const CONTENT_API = '/api/content';
const AUTH_API = '/api/auth';

const DEFAULT_CONTENT = {
  logo: 'assets/logo.png',
  positions: [
    { icon: 'assets/icon-administrasi.png', label: 'Administrasi' },
    { icon: 'assets/icon-UI-UX.png', label: 'UI/UX Designer' },
    { icon: 'assets/icon-programmer.png', label: 'Programmer Frontend/Backend' },
    { icon: 'assets/icon-hr.png', label: 'Human Resource' },
    { icon: 'assets/icon-social-media.png', label: 'Social Media Specialist' },
    { icon: 'assets/icon-photographer.png', label: 'Photographer/Videographer' },
    { icon: 'assets/icon-content-writer.png', label: 'Content Writer' },
    { icon: 'assets/icon-megaphone.png', label: 'Marketing & Sales' },
    { icon: 'assets/icon-desain-grafis.png', label: 'Desain Grafis' },
    { icon: 'assets/icon-digital-marketing.png', label: 'Digital Market' },
    { icon: 'assets/icon-speaker.png', label: 'Marcomm/Public Relation' },
    { icon: 'assets/icon-chat.png', label: 'Host / Presenter' },
    { icon: 'assets/icon-tiktok.png', label: 'TikTok Creator' },
    { icon: 'assets/icon-voice-over.png', label: 'Voice Over Talent' },
    { icon: 'assets/icon-phone.png', label: 'Content Planner' },
    { icon: 'assets/icon-project-manager.png', label: 'Project Manager' },
    { icon: 'assets/icon-las.png', label: 'LAS' },
    { icon: 'assets/icon-animasi.png', label: 'Animasi' }
  ],
  facilities: [
    'Bimbingan dari staff / asisten kami',
    'Ada pelatihan diluar jam kerja',
    'Mendapatkan sertifikat + seragam magangjogja.com',
    'Koneksi Internet Free (bagi yang WFO)',
    'Bagi yang jauh dari luar kota diberikan info kost murah',
    'Free drink (Coffee & Tea)',
    'Mendapat surat rekomendasi',
    'Mendapatkan kesempatan untuk bergabung dan bekerjasama di project-project team kami',
    'Networking & Experience'
  ]
};

function mergeWithDefaults(parsed){
  if (!parsed) return JSON.parse(JSON.stringify(DEFAULT_CONTENT));
  return {
    logo: typeof parsed.logo === 'string' && parsed.logo ? parsed.logo : DEFAULT_CONTENT.logo,
    positions: Array.isArray(parsed.positions) ? parsed.positions : DEFAULT_CONTENT.positions.map(p => Object.assign({}, p)),
    facilities: Array.isArray(parsed.facilities) ? parsed.facilities : DEFAULT_CONTENT.facilities.slice()
  };
}

// Fetches the current content from the active server mode.
// Falls back to DEFAULT_CONTENT if the API isn't reachable yet.
async function loadContent(){
  try {
    const res = await fetch(CONTENT_API, { cache: 'no-store' });
    if (!res.ok) throw new Error('API returned ' + res.status);
    const data = await res.json();
    return mergeWithDefaults(data.content);
  } catch (err) {
    console.warn('loadContent: falling back to defaults —', err.message);
    return JSON.parse(JSON.stringify(DEFAULT_CONTENT));
  }
}

// Saves content server-side. Requires the admin password (checked
// again on the server against process.env.ADMIN_PASSWORD).
async function readApiError(res, fallback){
  let data = {};
  try { data = await res.json(); } catch {}
  if (res.status === 401) return data.error || 'Kata sandi salah.';
  if (res.status === 404) return 'API tidak ditemukan.';
  if (res.status >= 500) return data.error || 'Terjadi kesalahan pada server.';
  return data.error || fallback;
}

async function saveContent(state, password){
  try {
    const res = await fetch(CONTENT_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, content: state })
    });
    if (!res.ok) return { ok: false, status: res.status, error: await readApiError(res, 'Gagal menyimpan.') };
    return { ok: true };
  } catch (err) {
    return { ok: false, status: 0, error: 'Tidak bisa terhubung ke server. Pastikan server sedang berjalan.' };
  }
}

async function resetContent(password){
  try {
    const res = await fetch(CONTENT_API, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    if (!res.ok) return { ok: false, status: res.status, error: await readApiError(res, 'Gagal reset.') };
    return { ok: true };
  } catch (err) {
    return { ok: false, status: 0, error: 'Tidak bisa terhubung ke server. Pastikan server sedang berjalan.' };
  }
}

async function checkAdminPassword(password){
  try {
    const res = await fetch(AUTH_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    let data = {};
    try { data = await res.json(); } catch {}
    if (res.status === 401) return { ok: false, status: 401, error: data.error || 'Kata sandi salah.' };
    if (res.status === 404) return { ok: false, status: 404, error: 'API tidak ditemukan.' };
    if (!res.ok) return { ok: false, status: res.status, error: data.error || 'Terjadi kesalahan pada server.' };
    return { ok: !!data.ok, status: res.status, error: data.ok ? '' : 'Kata sandi salah.' };
  } catch (err) {
    return { ok: false, status: 0, error: 'Tidak bisa terhubung ke server. Pastikan server sedang berjalan.' };
  }
}

/* ============================================================
   LIVE SYNC — only runs on magangjogja.html (the real site).
   ============================================================ */

const FACILITY_WIDGET_IDS = ['d19212d', '7154917', '968e992', '60afa81', '4d8c7dd', '9277030', 'a67e183', '2aead5e', '8c9ade3'];

// Each position lives in one column; the column also holds the icon
// widget and the label widget. The last two columns (a68bb2d, 654d989)
// are empty placeholders already in the original file — content.js
// reuses them as the first 2 "extra" slots instead of creating new markup.
const POSITION_SLOTS = [
  { col: '63ece06', icon: 'a180e9e', label: '5591196' },
  { col: 'ec4d76e', icon: '3e8df0d', label: 'd6a62f5' },
  { col: 'f500ee8', icon: '05074f6', label: 'c9fe3b8' },
  { col: '861e302', icon: '20d97fd', label: '69075de' },
  { col: '33d7973', icon: 'bae9c1e', label: 'dcd9acd' },
  { col: '18b5674', icon: 'a63f391', label: '2eade3d' },
  { col: '15712fc', icon: 'f490548', label: 'ea80b3b' },
  { col: '40d34e1', icon: 'b5f3c41', label: '7bf9a4d' },
  { col: 'c214df6', icon: 'd9f87ef', label: 'e4ce1a3' },
  { col: '86d074b', icon: '74d4a85', label: '90535c9' },
  { col: 'cca9cf3', icon: '6335772', label: '4034b08' },
  { col: '11b5758', icon: 'f62568e', label: 'cd4ff85' },
  { col: 'aa42332', icon: '2146208', label: '225c3d5' },
  { col: '1caa7e3', icon: '66139eb', label: '6e0d7c2' },
  { col: 'a7a1495', icon: 'baa354e', label: '5e70168' },
  { col: '1660059', icon: 'c889785', label: 'b06714d' },
  { col: 'b2116f9', icon: 'b7cf796', label: '3989c87' },
  { col: '4ba5427', icon: '293cd0f', label: 'cd580d5' },
  { col: 'a68bb2d', icon: null, label: null, empty: true },
  { col: '654d989', icon: null, label: null, empty: true }
];

function byDataId(id){
  return document.querySelector(`[data-id="${id}"]`);
}

function syncFixedList(ids, items, updateFn){
  ids.forEach((id, i) => {
    const el = byDataId(id);
    if (!el) return;
    if (i < items.length){
      el.style.display = '';
      updateFn(el, items[i]);
    } else {
      el.style.display = 'none';
    }
  });
  if (items.length > ids.length){
    const template = byDataId(ids[ids.length - 1]);
    if (template){
      let anchor = template;
      for (let i = ids.length; i < items.length; i++){
        const clone = template.cloneNode(true);
        clone.removeAttribute('data-id');
        clone.style.display = '';
        anchor.after(clone);
        anchor = clone;
        updateFn(clone, items[i]);
      }
    }
  }
}

function applyIconToWidget(container, iconValue){
  if (!container) return;
  const wrapper = container.querySelector('.jet-inline-svg__wrapper');
  if (!wrapper) return;
  const looksLikeImage = /\.(png|jpe?g|svg|webp|gif)$/i.test(iconValue) || iconValue.startsWith('http') || iconValue.startsWith('assets/');
  if (looksLikeImage){
    let img = wrapper.querySelector('img');
    if (!img){
      wrapper.innerHTML = '';
      img = document.createElement('img');
      img.style.maxWidth = '120px';
      img.style.display = 'block';
      img.style.margin = '0 auto';
      wrapper.appendChild(img);
    }
    img.src = iconValue;
    img.alt = '';
  } else {
    wrapper.innerHTML = `<span style="font-size:64px;line-height:1;display:block;text-align:center;">${iconValue}</span>`;
  }
}

function fillEmptyPositionColumn(col){
  const wrap = col.querySelector('.elementor-widget-wrap');
  if (wrap && !wrap.querySelector('.jet-inline-svg__wrapper')){
    wrap.innerHTML =
      '<div class="jet-inline-svg__wrapper" style="height:130px;display:flex;align-items:center;justify-content:center;"></div>' +
      '<div class="elementor-heading-title boxe-generated" style="text-align:center;color:#FFFFFF;font-family:\'Comic Helvetic\',sans-serif;font-size:1.3em;text-transform:uppercase;padding:15px 5px;background-color:#3CB683;border-radius:20px;min-height:56px;display:flex;align-items:center;justify-content:center;"></div>';
  }
  return wrap;
}

function syncPositions(positions){
  POSITION_SLOTS.forEach((slot, i) => {
    const col = byDataId(slot.col);
    if (!col) return;
    if (i >= positions.length){
      col.style.display = 'none';
      return;
    }
    col.style.display = '';
    const pos = positions[i];
    if (slot.empty){
      const wrap = fillEmptyPositionColumn(col);
      applyIconToWidget(wrap, pos.icon);
      const labelEl = wrap.querySelector('.boxe-generated');
      if (labelEl) labelEl.textContent = pos.label;
    } else {
      applyIconToWidget(byDataId(slot.icon), pos.icon);
      const labelEl = byDataId(slot.label);
      if (labelEl){
        const titleEl = labelEl.querySelector('.elementor-heading-title') || labelEl;
        titleEl.textContent = pos.label;
      }
    }
  });

  if (positions.length > POSITION_SLOTS.length){
    const templateSlot = POSITION_SLOTS[POSITION_SLOTS.length - 3];
    const template = byDataId(templateSlot.col);
    if (template){
      let anchor = byDataId(POSITION_SLOTS[POSITION_SLOTS.length - 1].col) || template;
      for (let i = POSITION_SLOTS.length; i < positions.length; i++){
        const clone = template.cloneNode(true);
        clone.removeAttribute('data-id');
        clone.style.display = '';
        anchor.after(clone);
        anchor = clone;
        const pos = positions[i];
        const wrap = clone.querySelector('.elementor-widget-wrap');
        applyIconToWidget(wrap, pos.icon);
        const labelWidget = clone.querySelector('.elementor-heading-title');
        if (labelWidget) labelWidget.textContent = pos.label;
      }
    }
  }
}

async function applyContentToPage(){
  const state = await loadContent();

  // ---- LOGO ----
  document.querySelectorAll('img[src="assets/logo.png"]').forEach(img => {
    img.src = state.logo;
  });

  // ---- FACILITIES ----
  syncFixedList(FACILITY_WIDGET_IDS, state.facilities, (el, text) => {
    const span = el.querySelector('h6 span');
    if (span) span.textContent = text;
  });

  // ---- POSITIONS ----
  syncPositions(state.positions);
}

// Auto-run on the public site only (elements from magangjogja.html present).
if (typeof document !== 'undefined'){
  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('position')) {
      applyContentToPage();
    }
  });
}