import { supabaseRequest, validateAdminSecret, validateAdminToken } from '../_supabase.js';

async function checkAdmin(req) {
  if (validateAdminSecret(req)) return true;
  return await validateAdminToken(req);
}

export default async function handler(req, res) {
  const isAdmin = await checkAdmin(req);
  if (!isAdmin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const result = await supabaseRequest(
        'users?select=id,name,device_id,created_at,invite_code_id,invite_codes(code,name)&order=created_at.desc'
      );
      if (!result.ok) return res.status(500).json({ error: 'Database error' });
      const users = await result.json();
      return res.status(200).json({ users });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'PATCH') {
    const { id, name } = req.body;
    if (!id) return res.status(400).json({ error: 'id is required' });

    const updates = {};
    if (name !== undefined) updates.name = name;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    try {
      const result = await supabaseRequest(`users?id=eq.${id}`, {
        method: 'PATCH',
        body: updates
      });
      if (!result.ok) return res.status(500).json({ error: 'Update failed' });
      const data = await result.json();
      return res.status(200).json({ user: data[0] });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'DELETE') {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'id query param is required' });

    try {
      // Delete sessions first
      await supabaseRequest(`sessions?user_id=eq.${id}`, {
        method: 'DELETE',
        prefer: 'return=minimal'
      });
      // Delete user
      await supabaseRequest(`users?id=eq.${id}`, {
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
