import crypto from 'node:crypto';

const COOKIE_NAME = 'mj_admin_session';
const MAX_AGE = 8 * 60 * 60;

function expectedPassword() {
  return process.env.ADMIN_PASSWORD || 'magang2026';
}

function sign(value) {
  return crypto.createHmac('sha256', expectedPassword()).update(value).digest('hex');
}

export function passwordMatches(value) {
  if (typeof value !== 'string') return false;
  const a = Buffer.from(value, 'utf8');
  const b = Buffer.from(expectedPassword(), 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function createSessionCookie() {
  const expires = Math.floor(Date.now() / 1000) + MAX_AGE;
  const payload = String(expires);
  const token = `${payload}.${sign(payload)}`;
  const secure = process.env.VERCEL ? '; Secure' : '';
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${secure}`;
}

export function hasValidSession(req) {
  const cookieHeader = req.headers?.cookie || '';
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  if (!match) return false;
  const [expires, signature] = String(match[1]).split('.');
  if (!expires || !signature || !/^\d+$/.test(expires)) return false;
  if (Number(expires) < Math.floor(Date.now() / 1000)) return false;
  const expected = sign(expires);
  const a = Buffer.from(signature, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}