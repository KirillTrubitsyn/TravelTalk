import { supabaseRequest, generateToken } from '../_supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  const adminPassword = process.env.ADMIN_SECRET;
  if (!adminPassword || password !== adminPassword) {
    return res.status(401).json({ error: 'Неверный пароль' });
  }

  try {
    // Generate admin token (8 hours TTL)
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();

    const tokenRes = await supabaseRequest('admin_tokens', {
      method: 'POST',
      body: { token, expires_at: expiresAt }
    });

    if (!tokenRes.ok) {
      return res.status(500).json({ error: 'Failed to create admin session' });
    }

    return res.status(200).json({
      success: true,
      token,
      expires_at: expiresAt
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
