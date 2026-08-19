-- =========================================================================
-- NOVANETS / JARVIS AI — CLEAN UNIFIED DATABASE SCHEMA
-- =========================================================================
-- Paste and run this script in your Supabase SQL Editor (Dashboard -> SQL Editor)

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. USER PROFILES TABLE (User preferences & interested subjects)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  display_name TEXT NOT NULL DEFAULT 'Scholar',
  role TEXT NOT NULL DEFAULT 'user', -- 'admin' | 'user'
  language TEXT NOT NULL DEFAULT 'English', -- 'English' | 'Hinglish'
  interested_subjects JSONB NOT NULL DEFAULT '["Physics", "Mathematics", "Astrophysics"]'::jsonb,
  education_level TEXT NOT NULL DEFAULT 'Undergraduate',
  learning_style TEXT NOT NULL DEFAULT 'Socratic',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. CHAT SESSIONS TABLE (All thinking modes)
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  mode TEXT NOT NULL DEFAULT 'professor', -- 'professor' | 'architect' | 'study_group' | 'sandbox' | 'assistant'
  session_title TEXT NOT NULL DEFAULT 'New Session',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_mode ON public.chat_sessions(mode, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON public.chat_sessions(user_id, created_at DESC);

-- 4. CHAT MESSAGES TABLE (Chat history with cascade delete)
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'user' | 'jarvis' | 'young_jarvis' | 'vance' | 'ada'
  content TEXT NOT NULL,
  teaching_score JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON public.chat_messages(session_id, created_at ASC);

-- 5. SESSION MEDIA TABLE (Course materials / PDFs vault)
CREATE TABLE IF NOT EXISTS public.session_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  user_id TEXT,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  file_size BIGINT DEFAULT 0,
  text_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_session_media_session ON public.session_media(session_id);

-- 6. ENABLE ROW LEVEL SECURITY AND PERMISSIVE POLICIES
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_media ENABLE ROW LEVEL SECURITY;

-- Allow public read/write access so both authenticated and guest workflows operate seamlessly
DROP POLICY IF EXISTS "Public access user_profiles" ON public.user_profiles;
CREATE POLICY "Public access user_profiles" ON public.user_profiles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access chat_sessions" ON public.chat_sessions;
CREATE POLICY "Public access chat_sessions" ON public.chat_sessions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access chat_messages" ON public.chat_messages;
CREATE POLICY "Public access chat_messages" ON public.chat_messages FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access session_media" ON public.session_media;
CREATE POLICY "Public access session_media" ON public.session_media FOR ALL USING (true) WITH CHECK (true);
