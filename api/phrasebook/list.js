import { validateSession, supabaseRequest } from '../_supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
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

  try {
    const result = await supabaseRequest(
      `custom_phrases?invite_code_id=eq.${inviteCodeId}&select=id,category,source_lang,target_lang,source_text,target_text,created_at&order=created_at.desc`
    );

    if (!result.ok) {
      return res.status(500).json({ error: 'Database error' });
    }

    const phrases = await result.json();
    return res.status(200).json({ phrases });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
