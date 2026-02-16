-- TravelTalk: Supabase Schema
-- Run this in Supabase SQL Editor to set up all tables

-- ===== INVITE CODES =====
CREATE TABLE invite_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  uses_remaining INTEGER DEFAULT NULL,   -- NULL = unlimited
  device_limit INTEGER DEFAULT 3,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ
);

CREATE INDEX idx_invite_codes_code ON invite_codes(code);

-- ===== USERS =====
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invite_code_id UUID NOT NULL REFERENCES invite_codes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  device_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(invite_code_id, device_id)
);

CREATE INDEX idx_users_device_id ON users(device_id);
CREATE INDEX idx_users_invite_code_id ON users(invite_code_id);

-- ===== SESSIONS =====
CREATE TABLE sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);

-- ===== TRANSLATIONS =====
CREATE TABLE translations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL,
  source_lang TEXT NOT NULL,
  target_lang TEXT NOT NULL,
  source_text TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_translations_user_id ON translations(user_id);
CREATE INDEX idx_translations_created_at ON translations(created_at DESC);

-- ===== DIALOG SESSIONS =====
CREATE TABLE dialog_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_lang TEXT NOT NULL,
  target_lang TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ
);

CREATE INDEX idx_dialog_sessions_user_id ON dialog_sessions(user_id);
CREATE INDEX idx_dialog_sessions_created_at ON dialog_sessions(created_at DESC);

-- ===== DIALOG MESSAGES =====
CREATE TABLE dialog_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dialog_session_id UUID NOT NULL REFERENCES dialog_sessions(id) ON DELETE CASCADE,
  lang_code TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('source', 'translation')),
  text TEXT NOT NULL,
  detected_gender TEXT CHECK (detected_gender IN ('male', 'female') OR detected_gender IS NULL),
  seq_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_dialog_messages_session ON dialog_messages(dialog_session_id, seq_order);

-- ===== ROW LEVEL SECURITY =====
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dialog_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dialog_messages ENABLE ROW LEVEL SECURITY;

-- Service role has full access (bypasses RLS)
-- No anon policies: all access goes through our API with service_role key

-- ===== SEED: Example invite code (replace with your own) =====
-- INSERT INTO invite_codes (code, name, description, device_limit)
-- VALUES ('TRAVEL-2025', 'Demo Access', 'Demo invite code', 3);
