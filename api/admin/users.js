import { supabaseRequest, validateAdminSecret, validateAdminToken } from '../_supabase.js';

async function checkAdmin(req) {
  if (validateAdminSecret(req)) return true;
  return await validateAdminToken(req);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const isAdmin = await checkAdmin(req);
  if (!isAdmin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const result = await supabaseRequest(
      'users?select=id,name,device_id,created_at,invite_codes(code,name)&order=created_at.desc'
    );
    if (!result.ok) return res.status(500).json({ error: 'Database error' });
    const users = await result.json();
    return res.status(200).json({ users });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
