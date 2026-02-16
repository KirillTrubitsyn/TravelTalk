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
  const mode = req.query.mode;

  try {
    let path = `translations?user_id=eq.${session.user_id}&select=id,mode,source_lang,target_lang,source_text,translated_text,metadata,created_at&order=created_at.desc&limit=${limit}&offset=${offset}`;
    if (mode) {
      path += `&mode=eq.${encodeURIComponent(mode)}`;
    }

    const result = await supabaseRequest(path, {
      headers: { 'Prefer': 'count=exact' }
    });

    if (!result.ok) {
      return res.status(500).json({ error: 'Database error' });
    }

    const translations = await result.json();
    const totalHeader = result.headers.get('content-range');
    const total = totalHeader ? parseInt(totalHeader.split('/')[1]) || 0 : translations.length;

    return res.status(200).json({
      translations,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
