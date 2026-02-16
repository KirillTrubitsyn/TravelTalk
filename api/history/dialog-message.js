import { validateSession, supabaseRequest } from '../_supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await validateSession(req);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { dialog_session_id, messages } = req.body;
  if (!dialog_session_id || !messages || !messages.length) {
    return res.status(400).json({ error: 'dialog_session_id and messages are required' });
  }

  try {
    const rows = messages.map(m => ({
      dialog_session_id,
      lang_code: m.lang_code,
      role: m.role,
      text: (m.text || '').substring(0, 5000),
      detected_gender: m.detected_gender || null,
      seq_order: m.seq_order
    }));

    await supabaseRequest('dialog_messages', {
      method: 'POST',
      body: rows,
      prefer: 'return=minimal'
    });

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
