import { createClient } from '@supabase/supabase-js';
import { passwordMatches } from './_session.js';

const TABLE = 'magangjogja_content';
const HISTORY_TABLE = 'magangjogja_history';
const ROW_ID = 1;

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

const clone = value => JSON.parse(JSON.stringify(value));

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function same(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function diffValues(before, after, path = '', changes = []) {
  if (same(before, after)) return changes;

  const beforeObj = before && typeof before === 'object';
  const afterObj = after && typeof after === 'object';

  if (beforeObj && afterObj && !Array.isArray(before) && !Array.isArray(after)) {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const key of keys) {
      const nextPath = path ? `${path}.${key}` : key;
      diffValues(before[key], after[key], nextPath, changes);
    }
    return changes;
  }

  if (Array.isArray(before) && Array.isArray(after)) {
    const length = Math.max(before.length, after.length);
    for (let i = 0; i < length; i++) {
      const nextPath = `${path}[${i}]`;
      if (i >= before.length) {
        changes.push({ field: nextPath, before: null, after: clone(after[i]) });
      } else if (i >= after.length) {
        changes.push({ field: nextPath, before: clone(before[i]), after: null });
      } else {
        diffValues(before[i], after[i], nextPath, changes);
      }
    }
    return changes;
  }

  changes.push({ field: path || 'content', before: clone(before), after: clone(after) });
  return changes;
}

function changedSections(changes) {
  const sections = new Set();
  for (const change of changes) {
    const root = String(change.field).split(/[.[\]]/)[0];
    if (root === 'logo' || root === 'positions' || root === 'facilities') sections.add(root);
  }
  return sections;
}

function historyDescription(sections) {
  const names = [];
  if (sections.has('logo')) names.push('Logo');
  if (sections.has('positions')) names.push('Formasi Magang');
  if (sections.has('facilities')) names.push('Fasilitas');
  if (names.length === 1) return `${names[0]} diubah`;
  if (names.length > 1) return `${names.slice(0, -1).join(', ')}, dan ${names[names.length - 1]} diubah`;
  return 'Content diubah';
}

async function readCurrent(supabase) {
  const { data, error } = await supabase.from(TABLE).select('data').eq('id', ROW_ID).maybeSingle();
  if (error) throw error;
  return data?.data || clone(DEFAULT_CONTENT);
}

async function insertHistory(supabase, record) {
  const { error } = await supabase.from(HISTORY_TABLE).insert(record);
  if (error) throw error;
}

export default async function handler(req, res) {
  const supabase = getSupabase();

  if (!supabase) {
    return res.status(503).json({ error: 'Supabase belum dikonfigurasi. Atur SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di environment production.' });
  }

  if (req.method === 'GET') {
    try {
      const content = await readCurrent(supabase);
      return res.status(200).json({ content });
    } catch (error) {
      console.error('Supabase GET failed:', error);
      return res.status(500).json({ error: 'Gagal mengambil konten dari Supabase.' });
    }
  }

  if (req.method !== 'POST' && req.method !== 'DELETE') {
    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).end('Method Not Allowed');
  }

  const { password } = req.body || {};
  if (!passwordMatches(password)) {
    return res.status(401).json({ ok: false, error: 'Kata sandi salah.' });
  }

  try {
    const before = await readCurrent(supabase);

    if (req.method === 'POST') {
      const { content } = req.body || {};
      if (!content || typeof content !== 'object' || Array.isArray(content)) {
        return res.status(400).json({ ok: false, error: 'Konten tidak valid.' });
      }

      const changes = diffValues(before, content);
      if (changes.length === 0) return res.status(200).json({ ok: true, changed: false });

      const sections = changedSections(changes);
      const section = sections.size > 1 ? 'multiple' : [...sections][0] || 'multiple';
      const description = historyDescription(sections);
      const snapshot = clone(content);

      const { error } = await supabase.from(TABLE).upsert({ id: ROW_ID, data: content, updated_at: new Date().toISOString() });
      if (error) throw error;

      await insertHistory(supabase, {
        action: 'update',
        section,
        description,
        changes,
        snapshot
      });

      return res.status(200).json({ ok: true, changed: true });
    }

    const after = clone(DEFAULT_CONTENT);
    const changes = diffValues(before, after);
    if (changes.length === 0) return res.status(200).json({ ok: true, changed: false });

    const { error } = await supabase.from(TABLE).upsert({ id: ROW_ID, data: after, updated_at: new Date().toISOString() });
    if (error) throw error;

    await insertHistory(supabase, {
      action: 'reset',
      section: 'multiple',
      description: 'Content dikembalikan ke konfigurasi default',
      changes,
      snapshot: after
    });

    return res.status(200).json({ ok: true, changed: true });
  } catch (error) {
    console.error(`Supabase ${req.method} failed:`, error);
    return res.status(500).json({ ok: false, error: req.method === 'DELETE' ? 'Gagal mereset konten di Supabase.' : 'Gagal menyimpan konten ke Supabase.' });
  }
}