import { validateSession, supabaseRequest } from '../_supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await validateSession(req);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const inviteCodeId = session.users?.invite_code_id;
  if (!inviteCodeId) {
    return res.status(400).json({ error: 'No invite code linked' });
  }

  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'Missing phrase id' });
  }

  try {
    const result = await supabaseRequest(
      `custom_phrases?id=eq.${encodeURIComponent(id)}&invite_code_id=eq.${inviteCodeId}`,
      { method: 'DELETE', prefer: 'return=minimal' }
    );

    if (!result.ok) {
      return res.status(500).json({ error: 'Database error' });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
