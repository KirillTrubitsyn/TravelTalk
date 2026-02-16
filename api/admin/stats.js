import { supabaseRequest, validateAdminToken } from '../_supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const isValid = await validateAdminToken(req);
  if (!isValid) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const days = parseInt(req.query.days) || 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  try {
    // Fetch all data in parallel
    const [codesRes, usersRes, translationsRes, dialogsRes, sessionsRes] = await Promise.all([
      supabaseRequest('invite_codes?select=id,code,name,is_active,created_at,last_used_at&order=created_at.desc'),
      supabaseRequest('users?select=id,name,invite_code_id,created_at&order=created_at.desc'),
      supabaseRequest(`translations?select=id,user_id,mode,source_lang,target_lang,created_at&created_at=gte.${since}&order=created_at.desc`),
      supabaseRequest(`dialog_sessions?select=id,user_id,source_lang,target_lang,created_at&created_at=gte.${since}&order=created_at.desc`),
      supabaseRequest(`sessions?select=id,user_id,created_at,expires_at&order=created_at.desc&limit=100`)
    ]);

    const codes = codesRes.ok ? await codesRes.json() : [];
    const users = usersRes.ok ? await usersRes.json() : [];
    const translations = translationsRes.ok ? await translationsRes.json() : [];
    const dialogs = dialogsRes.ok ? await dialogsRes.json() : [];
    const sessions = sessionsRes.ok ? await sessionsRes.json() : [];

    // Build user name map
    const userMap = {};
    users.forEach(u => { userMap[u.id] = u.name; });

    // Total stats
    const totalTranslations = translations.length;
    const totalDialogs = dialogs.length;

    // By mode
    const byMode = {};
    translations.forEach(t => {
      byMode[t.mode] = (byMode[t.mode] || 0) + 1;
    });

    // By user
    const byUser = {};
    translations.forEach(t => {
      const name = userMap[t.user_id] || 'Unknown';
      if (!byUser[name]) byUser[name] = { translations: 0, dialogs: 0 };
      byUser[name].translations++;
    });
    dialogs.forEach(d => {
      const name = userMap[d.user_id] || 'Unknown';
      if (!byUser[name]) byUser[name] = { translations: 0, dialogs: 0 };
      byUser[name].dialogs++;
    });

    // By day (last N days)
    const byDay = {};
    translations.forEach(t => {
      const day = t.created_at.substring(0, 10);
      byDay[day] = (byDay[day] || 0) + 1;
    });
    dialogs.forEach(d => {
      const day = d.created_at.substring(0, 10);
      byDay[day] = (byDay[day] || 0) + 1;
    });

    // Language pairs
    const langPairs = {};
    translations.forEach(t => {
      const pair = `${t.source_lang} → ${t.target_lang}`;
      langPairs[pair] = (langPairs[pair] || 0) + 1;
    });

    // Active sessions count
    const now = new Date().toISOString();
    const activeSessions = sessions.filter(s => s.expires_at > now).length;

    return res.status(200).json({
      period_days: days,
      totals: {
        codes: codes.length,
        active_codes: codes.filter(c => c.is_active).length,
        users: users.length,
        translations: totalTranslations,
        dialogs: totalDialogs,
        active_sessions: activeSessions
      },
      by_mode: byMode,
      by_user: byUser,
      by_day: byDay,
      lang_pairs: langPairs
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
