import { validateSession, supabaseRequest } from '../_supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await validateSession(req);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);
  const offset = (page - 1) * limit;

  try {
    // Get dialog sessions with their messages
    const result = await supabaseRequest(
      `dialog_sessions?user_id=eq.${session.user_id}&select=id,source_lang,target_lang,created_at,dialog_messages(id,lang_code,role,text,detected_gender,seq_order,created_at)&order=created_at.desc&dialog_messages.order=seq_order.asc&limit=${limit}&offset=${offset}`
    );

    if (!result.ok) {
      return res.status(500).json({ error: 'Database error' });
    }

    const dialogs = await result.json();

    // Flatten: rename dialog_messages to messages
    const formatted = dialogs.map(d => ({
      id: d.id,
      source_lang: d.source_lang,
      target_lang: d.target_lang,
      created_at: d.created_at,
      messages: d.dialog_messages || []
    }));

    return res.status(200).json({ dialogs: formatted });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
