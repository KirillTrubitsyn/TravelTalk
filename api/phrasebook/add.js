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

  const { category, source_lang, target_lang, source_text, target_text } = req.body;
  if (!source_lang || !target_lang || !source_text || !target_text) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const result = await supabaseRequest('custom_phrases', {
      method: 'POST',
      body: {
        invite_code_id: inviteCodeId,
        category: category || 'custom',
        source_lang,
        target_lang,
        source_text: source_text.substring(0, 500),
        target_text: target_text.substring(0, 500)
      }
    });

    if (!result.ok) {
      return res.status(500).json({ error: 'Database error' });
    }

    const phrases = await result.json();
    return res.status(200).json({ phrase: phrases[0] });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
