import { createSessionCookie, passwordMatches } from './_session.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const { password } = req.body || {};
  const ok = passwordMatches(password);

  if (!ok) return res.status(401).json({ ok: false });

  res.setHeader('Set-Cookie', createSessionCookie());
  return res.status(200).json({ ok: true });
}
