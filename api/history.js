import { createClient } from '@supabase/supabase-js';
import { hasValidSession } from './_session.js';

const TABLE = 'magangjogja_history';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end('Method Not Allowed');
  }

  if (!hasValidSession(req)) {
    return res.status(401).json({ ok: false, error: 'Sesi admin tidak valid.' });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return res.status(503).json({ ok: false, error: 'Supabase belum dikonfigurasi.' });
  }

  try {
    const limit = Math.min(Math.max(Number(req.query?.limit) || 20, 1), 100);
    const offset = Math.max(Number(req.query?.offset) || 0, 0);
    const { data, error } = await supabase
      .from(TABLE)
      .select('id, created_at, action, section, description, changes, snapshot')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit);

    if (error) throw error;
    const rows = data || [];
    const history = rows.slice(0, limit);
    return res.status(200).json({ ok: true, history, hasMore: rows.length > limit });
  } catch (error) {
    console.error('Supabase HISTORY GET failed:', error);
    return res.status(500).json({ ok: false, error: 'Gagal mengambil riwayat perubahan.' });
  }
}
