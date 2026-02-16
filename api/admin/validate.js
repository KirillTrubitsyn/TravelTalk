import { validateAdminToken } from '../_supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const valid = await validateAdminToken(req);
    return res.status(200).json({ valid });
  } catch (e) {
    return res.status(200).json({ valid: false });
  }
}
