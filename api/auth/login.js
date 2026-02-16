import { supabaseRequest, generateToken } from '../_supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, device_id } = req.body;
  if (!code || !device_id) {
    return res.status(400).json({ error: 'Code and device_id are required' });
  }

  try {
    // 1. Find invite code
    const codeRes = await supabaseRequest(
      `invite_codes?code=eq.${encodeURIComponent(code.toUpperCase())}&is_active=eq.true&select=*`
    );
    if (!codeRes.ok) {
      return res.status(500).json({ error: 'Database error' });
    }
    const codes = await codeRes.json();
    if (!codes.length) {
      return res.status(401).json({ error: 'Неверный код приглашения' });
    }
    const inviteCode = codes[0];

    // 2. Check uses_remaining
    if (inviteCode.uses_remaining !== null && inviteCode.uses_remaining <= 0) {
      return res.status(401).json({ error: 'Код приглашения исчерпан' });
    }

    // Use invite code name as the user name
    const userName = inviteCode.name;

    // 3. Check existing user for this device + code
    const existingUserRes = await supabaseRequest(
      `users?invite_code_id=eq.${inviteCode.id}&device_id=eq.${encodeURIComponent(device_id)}&select=*`
    );
    const existingUsers = existingUserRes.ok ? await existingUserRes.json() : [];
    let user;

    if (existingUsers.length > 0) {
      // Reuse existing user, sync name from invite code
      user = existingUsers[0];
      if (user.name !== userName) {
        await supabaseRequest(`users?id=eq.${user.id}`, {
          method: 'PATCH',
          body: { name: userName }
        });
        user.name = userName;
      }
    } else {
      // 4. Check device limit
      const deviceCountRes = await supabaseRequest(
        `users?invite_code_id=eq.${inviteCode.id}&select=device_id`,
        { headers: { 'Prefer': 'count=exact' } }
      );
      const devices = deviceCountRes.ok ? await deviceCountRes.json() : [];
      const uniqueDevices = new Set(devices.map(d => d.device_id));

      if (uniqueDevices.size >= inviteCode.device_limit) {
        return res.status(403).json({ error: 'Достигнут лимит устройств для этого кода' });
      }

      // 5. Create new user
      const createUserRes = await supabaseRequest('users', {
        method: 'POST',
        body: {
          invite_code_id: inviteCode.id,
          name: userName,
          device_id
        }
      });
      if (!createUserRes.ok) {
        const err = await createUserRes.json();
        return res.status(500).json({ error: 'Failed to create user: ' + JSON.stringify(err) });
      }
      const newUsers = await createUserRes.json();
      user = newUsers[0];

      // 6. Decrement uses_remaining if applicable
      if (inviteCode.uses_remaining !== null) {
        await supabaseRequest(`invite_codes?id=eq.${inviteCode.id}`, {
          method: 'PATCH',
          body: { uses_remaining: inviteCode.uses_remaining - 1 }
        });
      }
    }

    // 7. Update last_used_at
    await supabaseRequest(`invite_codes?id=eq.${inviteCode.id}`, {
      method: 'PATCH',
      body: { last_used_at: new Date().toISOString() }
    });

    // 8. Create session (30 days)
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const sessionRes = await supabaseRequest('sessions', {
      method: 'POST',
      body: {
        user_id: user.id,
        token,
        expires_at: expiresAt
      }
    });
    if (!sessionRes.ok) {
      return res.status(500).json({ error: 'Failed to create session' });
    }

    return res.status(200).json({
      token,
      user: { id: user.id, name: user.name },
      expires_at: expiresAt
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
