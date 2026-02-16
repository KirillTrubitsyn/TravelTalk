import { validateSession, supabaseRequest } from '../_supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await validateSession(req);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { source_lang, target_lang } = req.body;
  if (!source_lang || !target_lang) {
    return res.status(400).json({ error: 'source_lang and target_lang are required' });
  }

  try {
    const result = await supabaseRequest('dialog_sessions', {
      method: 'POST',
      body: {
        user_id: session.user_id,
        source_lang,
        target_lang
      }
    });

    if (!result.ok) {
      return res.status(500).json({ error: 'Failed to create dialog session' });
    }

    const data = await result.json();
    return res.status(200).json({ session_id: data[0].id });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
