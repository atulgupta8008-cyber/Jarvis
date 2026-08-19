# Jarvis Authentication & Profile System Backup

This folder contains the complete, production-ready implementation of the Supabase multi-user authentication, per-user profile preferences, Socratic survey onboarding, and isolated chat session architecture.

---

## 📁 Archived File Directory

### 1. Database Schema
- **`supabase_schema.sql`**: Full PostgreSQL/Supabase schema with tables for `user_profiles`, `chat_sessions`, `chat_messages`, `session_media`, `system_prompts`, foreign key cascades, and Row-Level Security (RLS) policies.

### 2. Frontend Components (`/web_components/` & `/context/`)
- **`context/AuthContext.jsx`**: Complete auth context provider handling Supabase Auth, persistent guest sessions, rate-limit resilience, per-user localStorage cache scoping, and admin passkey authentication.
- **`supabaseClient.js`**: Initialized `@supabase/supabase-js` client instance reading from environment variables.
- **`web_components/AuthModal.jsx`**: Glassmorphic Sign In / Sign Up / Admin access modal with duplicate account detection and validation.
- **`web_components/OnboardingSurvey.jsx`**: Interactive first-time user survey collecting language preference (English/Hinglish), interested subjects, education level, and learning style.
- **`web_components/ProfileView.jsx` & `.css`**: User profile dashboard with subject interest chips, education level switcher, language toggles, and a confirmation modal before logout.
- **`web_components/FormattedMessage.jsx`**: Markdown, LaTeX math (`$...$`, `$$...$$`), and KaTeX code renderer.
- **`web_components/App_auth.jsx`**: Integrated top-level React component with `AuthProvider`, routing for `/profile`, and auth triggers.

### 3. Backend Core (`/system_core/`)
- **`system_core/prompts.py`**: Centralized, pluggable system prompt engine with Socratic Professor, curious student Architect, Vance & Ada Study Group, Sandbox, and Stark Admin prompts.
- **`system_core/supabase_db.py`**: Non-blocking async database layer partitioning chat sessions, messages, media vaults, and user profiles by `user_id`.
- **`system_core/brain.py`**: Intelligence core with user-isolated memory (`UserIsolatedMemory`) and simulation tools.
- **`system_core/main_auth.py`**: WebSocket router forwarding `user_id`, `role`, and `user_profile` across all modes and directives.

---

## 🚀 How to Re-Integrate
Whenever you wish to restore the login and profile system:
1. Copy `supabase_schema.sql` into Supabase SQL Editor and execute.
2. Copy `context/` into `jarvis_web/src/context/`.
3. Copy `web_components/*` into `jarvis_web/src/components/`.
4. Copy `supabaseClient.js` into `jarvis_web/src/`.
5. Replace `jarvis_system/core/` files with `system_core/*`.
6. Restore `App_auth.jsx` as `jarvis_web/src/App.jsx`.
