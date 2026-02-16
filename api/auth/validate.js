import { validateSession } from '../_supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await validateSession(req);
    if (!session) {
      return res.status(200).json({ valid: false });
    }

    return res.status(200).json({
      valid: true,
      user: {
        id: session.users.id,
        name: session.users.name
      }
    });
  } catch (e) {
    return res.status(200).json({ valid: false });
  }
}
