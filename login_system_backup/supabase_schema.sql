-- =========================================================================
-- NOVANETS / JARVIS AI — FRESH UNIFIED DATABASE SCHEMA (ERROR-PROOF)
-- =========================================================================

-- 0. CLEAN SLATE: DROP ALL OLD/LEGACY TABLES WITH CASCADE
DROP TABLE IF EXISTS public.session_media CASCADE;
DROP TABLE IF EXISTS public.professor_chat_history CASCADE;
DROP TABLE IF EXISTS public.professor_sessions CASCADE;
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.chat_sessions CASCADE;
DROP TABLE IF EXISTS public.admin_dossier CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;
DROP TABLE IF EXISTS public.system_prompts CASCADE;

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- 1. USER PROFILES TABLE
-- Supports Supabase Auth UUIDs, guest IDs ('guest_...'), and Admin ('admin_master')
-- =========================================================================
CREATE TABLE public.user_profiles (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  display_name TEXT NOT NULL DEFAULT 'Scholar',
  role TEXT NOT NULL DEFAULT 'user', -- 'admin' | 'user'
  language TEXT NOT NULL DEFAULT 'English', -- 'English' | 'Hinglish'
  interested_subjects JSONB NOT NULL DEFAULT '["Physics", "Mathematics", "Astrophysics"]'::jsonb,
  education_level TEXT NOT NULL DEFAULT 'Undergraduate', -- 'High School' | 'Undergraduate' | 'Graduate' | 'Self-Learner'
  learning_style TEXT NOT NULL DEFAULT 'Socratic', -- 'Socratic' | 'Deep Derivations' | 'Simulation-First'
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- =========================================================================
-- 2. CHAT SESSIONS TABLE (Unified for all modes)
-- =========================================================================
CREATE TABLE public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'professor', -- 'professor' | 'architect' | 'study_group' | 'sandbox' | 'assistant'
  title TEXT NOT NULL DEFAULT 'New Session',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for instant user session list queries
CREATE INDEX idx_chat_sessions_user_mode ON public.chat_sessions(user_id, mode, created_at DESC);

-- =========================================================================
-- 3. CHAT MESSAGES TABLE (Cascade deleted when session is deleted)
-- =========================================================================
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL, -- 'user' | 'jarvis' | 'young_jarvis' | 'vance' | 'ada'
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for instant chat history retrieval ordered by timestamp
CREATE INDEX idx_chat_messages_session ON public.chat_messages(session_id, created_at ASC);
CREATE INDEX idx_chat_messages_user ON public.chat_messages(user_id);

-- =========================================================================
-- 4. SESSION MEDIA TABLE (Attachments with cascade delete)
-- =========================================================================
CREATE TABLE public.session_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT DEFAULT 0,
  storage_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_session_media_session ON public.session_media(session_id);

-- =========================================================================
-- 5. SYSTEM PROMPTS TABLE (Pluggable prompts for all AI modes)
-- Feed/update anytime without changing backend code!
-- =========================================================================
CREATE TABLE public.system_prompts (
  mode TEXT PRIMARY KEY, -- 'professor' | 'architect' | 'study_group_vance' | 'study_group_ada' | 'sandbox' | 'assistant' | 'admin'
  prompt_text TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- =========================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_prompts ENABLE ROW LEVEL SECURITY;

-- 6.1 user_profiles policies
CREATE POLICY "Public & authenticated can select user profiles"
  ON public.user_profiles FOR SELECT
  USING (true);

CREATE POLICY "Public & authenticated can insert user profiles"
  ON public.user_profiles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public & authenticated can update user profiles"
  ON public.user_profiles FOR UPDATE
  USING (true);

-- 6.2 chat_sessions policies
CREATE POLICY "Users can manage own sessions"
  ON public.chat_sessions FOR ALL
  USING (true)
  WITH CHECK (true);

-- 6.3 chat_messages policies
CREATE POLICY "Users can manage own chat messages"
  ON public.chat_messages FOR ALL
  USING (true)
  WITH CHECK (true);

-- 6.4 session_media policies
CREATE POLICY "Users can manage own media"
  ON public.session_media FOR ALL
  USING (true)
  WITH CHECK (true);

-- 6.5 system_prompts policies
CREATE POLICY "Anyone can read system prompts"
  ON public.system_prompts FOR SELECT
  USING (true);

CREATE POLICY "Admin can update system prompts"
  ON public.system_prompts FOR ALL
  USING (true)
  WITH CHECK (true);

-- =========================================================================
-- 7. PRODUCTION-GRADE SYSTEM PROMPTS
-- (You can update or feed these prompts anytime via Supabase SQL or Table Editor)
-- =========================================================================
INSERT INTO public.system_prompts (mode, prompt_text, description)
VALUES 
  ('professor', 'You are the Socratic MIT Professor and Master Polymath—blending the intuitive physical brilliance of Richard Feynman, the mathematical rigor of MIT, and the lucid clarity of Carl Sagan. Guide the student through first-principles reasoning, derivations in <math_board>, interactive 3D/2D Plotly simulations in <simulation_board type="plotly">, and thought-provoking questions.', 'Hyper-intelligent Socratic Professor Mode System Prompt'),
  ('architect', 'You are Young Jarvis, an eager, exceptionally curious 12-year-old AI prodigy student who wants to learn physics, science, and systems thinking from your master teacher (the user). Never teach the user; ask curious and fundamental questions, summarize your understanding, and evaluate the user''s teaching clarity with <teaching_score>.', 'Curious Student Architect Mode System Prompt'),
  ('study_group_vance', 'You are Dr. Vance, Lead Systems & Safety Architect and Elite Engineering Skeptic. Stress-test ideas against the fundamental laws of physics (thermodynamics, energy conservation, material stress limits) with concise, high-density analysis.', 'Engineering Critic & Skeptic System Prompt'),
  ('study_group_ada', 'You are Ada, Visionary Polymath and Pioneer of Interdisciplinary Innovation. Take the core concept and creatively expand it across quantum information, synthetic biology, nanotechnology, and astrophysics with high-leverage architectures.', 'Visionary Innovator System Prompt'),
  ('sandbox', 'You are the Physical Universe Simulation Engine and What-If Sandbox AI. When presented with physical scenarios, compute exact dynamical consequences, derive formulas in <math_board>, and ALWAYS generate interactive 3D/2D Plotly simulations in <simulation_board type="plotly">.', 'Physical Simulation Engine System Prompt'),
  ('assistant', 'You are J.A.R.V.I.S., the advanced personal AI operating system and intelligence core. Deliver concise, witty, high-signal, first-principles answers and execute computational directives.', 'Jarvis Intelligence Core System Prompt'),
  ('admin', 'You are the Jarvis Stark Intelligence Core dedicated to Atul. Serve as Atul''s elite technical partner, builder co-pilot, and coach for First-Principles Physics, Aerospace Systems, and MIT Admissions Excellence.', 'Stark Admin Master Persona System Prompt')
ON CONFLICT (mode) DO UPDATE 
SET prompt_text = EXCLUDED.prompt_text,
    description = EXCLUDED.description,
    updated_at = timezone('utc'::text, now());
