import { supabaseRequest, validateAdminSecret } from '../_supabase.js';

export default async function handler(req, res) {
  if (!validateAdminSecret(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const result = await supabaseRequest(
        'invite_codes?select=*,users(id,name,device_id,created_at)&order=created_at.desc'
      );
      if (!result.ok) return res.status(500).json({ error: 'Database error' });
      const codes = await result.json();
      return res.status(200).json({ codes });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'POST') {
    const { code, name, description, uses_remaining, device_limit } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    // Auto-generate code if not provided
    const finalCode = code || generateCode();

    try {
      const result = await supabaseRequest('invite_codes', {
        method: 'POST',
        body: {
          code: finalCode.toUpperCase(),
          name,
          description: description || '',
          uses_remaining: uses_remaining === undefined ? null : uses_remaining,
          device_limit: device_limit || 3
        }
      });
      if (!result.ok) {
        const err = await result.json();
        return res.status(400).json({ error: err.message || 'Failed to create code' });
      }
      const data = await result.json();
      return res.status(200).json({ code: data[0] });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'PATCH') {
    const { id, ...updates } = req.body;
    if (!id) return res.status(400).json({ error: 'id is required' });

    try {
      const result = await supabaseRequest(`invite_codes?id=eq.${id}`, {
        method: 'PATCH',
        body: updates
      });
      if (!result.ok) return res.status(500).json({ error: 'Update failed' });
      const data = await result.json();
      return res.status(200).json({ code: data[0] });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'DELETE') {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'id query param is required' });

    try {
      // Delete users first (cascade should handle this, but be explicit)
      await supabaseRequest(`sessions?user_id=in.(select id from users where invite_code_id = '${id}')`, {
        method: 'DELETE',
        prefer: 'return=minimal'
      });
      await supabaseRequest(`users?invite_code_id=eq.${id}`, {
        method: 'DELETE',
        prefer: 'return=minimal'
      });
      await supabaseRequest(`invite_codes?id=eq.${id}`, {
        method: 'DELETE',
        prefer: 'return=minimal'
      });
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'TT-';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
