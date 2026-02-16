// Shared Supabase REST API helper for TravelTalk serverless functions
// This file is prefixed with _ so Vercel does NOT expose it as an endpoint

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

export async function supabaseRequest(path, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': options.prefer || 'return=representation',
    ...options.headers
  };
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  return res;
}

export async function validateSession(req) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;

  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);

  const res = await supabaseRequest(
    `sessions?token=eq.${encodeURIComponent(token)}&expires_at=gt.${new Date().toISOString()}&select=id,user_id,users(id,name,invite_code_id)`
  );
  if (!res.ok) return null;
  const sessions = await res.json();
  if (!sessions.length) return null;
  return sessions[0];
}

export function generateToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function validateAdminSecret(req) {
  const secret = req.headers['x-admin-secret'];
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret || !secret) return false;
  return secret === adminSecret;
}

// Admin token-based auth (stored in Supabase admin_tokens table)
export async function validateAdminToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  const token = authHeader.slice(7);

  const res = await supabaseRequest(
    `admin_tokens?token=eq.${encodeURIComponent(token)}&expires_at=gt.${new Date().toISOString()}&select=id`
  );
  if (!res.ok) return false;
  const tokens = await res.json();
  return tokens.length > 0;
}
