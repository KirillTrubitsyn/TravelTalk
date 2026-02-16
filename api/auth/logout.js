import { supabaseRequest } from '../_supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(200).json({ ok: true });
  }

  const token = authHeader.slice(7);

  try {
    await supabaseRequest(`sessions?token=eq.${encodeURIComponent(token)}`, {
      method: 'DELETE'
    });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(200).json({ ok: true });
  }
}
