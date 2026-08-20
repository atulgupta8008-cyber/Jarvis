import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://kopemudcklcakflbcent.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_VVBCnO-OQP2ioPuUAGRuoA_p1IpJH9t';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
