import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';

const AuthContext = createContext();

const LOCAL_STORAGE_ADMIN_KEY = 'jarvis_admin_session';
const LOCAL_STORAGE_ACTIVE_USER_KEY = 'jarvis_active_user_session';

const getProfileStorageKey = (userId) => {
  return userId ? `jarvis_user_profile_${userId}` : 'jarvis_user_profile_default';
};

const DEFAULT_PROFILE = {
  display_name: 'Scholar',
  language: 'English',
  interested_subjects: ['Physics', 'Mathematics', 'Astrophysics'],
  education_level: 'Undergraduate',
  learning_style: 'Socratic',
  role: 'user',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem(LOCAL_STORAGE_ACTIVE_USER_KEY);
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed && parsed.id && !parsed.isGuest && !String(parsed.id).startsWith('guest_')) {
          return parsed;
        }
      }
    } catch {}
    return null;
  });

  const [profile, setProfile] = useState(() => {
    try {
      const activeUser = localStorage.getItem(LOCAL_STORAGE_ACTIVE_USER_KEY);
      const uid = activeUser ? JSON.parse(activeUser).id : null;
      if (uid && !String(uid).startsWith('guest_')) {
        const saved = localStorage.getItem(getProfileStorageKey(uid));
        if (saved) return JSON.parse(saved);
      }
    } catch {}
    return { ...DEFAULT_PROFILE };
  });

  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSurveyModal, setShowSurveyModal] = useState(false);

  // Load profile from Supabase table or local isolated storage
  const fetchSupabaseProfile = async (userId, userEmail) => {
    if (!userId && !userEmail) return;
    const cleanEmail = userEmail ? userEmail.trim().toLowerCase() : null;
    const storageKeyById = userId ? getProfileStorageKey(userId) : null;
    const storageKeyByEmail = cleanEmail ? getProfileStorageKey(cleanEmail) : null;

    // Helper: read any existing profile previously saved for this user
    const getCachedProfile = () => {
      if (storageKeyById) {
        const c1 = localStorage.getItem(storageKeyById);
        if (c1) try { return JSON.parse(c1); } catch {}
      }
      if (storageKeyByEmail) {
        const c2 = localStorage.getItem(storageKeyByEmail);
        if (c2) try { return JSON.parse(c2); } catch {}
      }
      try {
        const vault = JSON.parse(localStorage.getItem('jarvis_account_profiles') || '{}');
        if (cleanEmail && vault[cleanEmail]) return vault[cleanEmail];
      } catch {}
      return null;
    };

    const cachedProfile = getCachedProfile();

    if (!supabase || !isSupabaseConfigured) {
      if (cachedProfile) {
        const merged = { ...DEFAULT_PROFILE, ...cachedProfile };
        setProfile(merged);
        setIsAdmin(merged.role === 'admin');
        if (storageKeyById) localStorage.setItem(storageKeyById, JSON.stringify(merged));
        if (storageKeyByEmail) localStorage.setItem(storageKeyByEmail, JSON.stringify(merged));
      } else {
        const initial = {
          ...DEFAULT_PROFILE,
          display_name: cleanEmail ? cleanEmail.split('@')[0] : 'Scholar',
          email: cleanEmail
        };
        setProfile(initial);
        if (storageKeyById) localStorage.setItem(storageKeyById, JSON.stringify(initial));
        if (storageKeyByEmail) localStorage.setItem(storageKeyByEmail, JSON.stringify(initial));
      }
      return;
    }

    try {
      let supaProfile = null;

      // 1. Try querying Supabase by id
      if (userId) {
        const { data: byId } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        if (byId) supaProfile = byId;
      }

      // 2. Try querying Supabase by email if id didn't return a profile
      if (!supaProfile && cleanEmail) {
        const { data: byEmail } = await supabase
          .from('user_profiles')
          .select('*')
          .ilike('email', cleanEmail)
          .maybeSingle();
        if (byEmail) supaProfile = byEmail;
      }

      if (supaProfile) {
        const freshUserProf = {
          ...DEFAULT_PROFILE,
          ...cachedProfile,
          ...supaProfile,
          interested_subjects: Array.isArray(supaProfile.interested_subjects) && supaProfile.interested_subjects.length > 0
            ? supaProfile.interested_subjects 
            : (cachedProfile?.interested_subjects || DEFAULT_PROFILE.interested_subjects)
        };
        setProfile(freshUserProf);
        setIsAdmin(freshUserProf.role === 'admin');
        if (storageKeyById) localStorage.setItem(storageKeyById, JSON.stringify(freshUserProf));
        if (storageKeyByEmail) localStorage.setItem(storageKeyByEmail, JSON.stringify(freshUserProf));
        if (cleanEmail) {
          try {
            const vault = JSON.parse(localStorage.getItem('jarvis_account_profiles') || '{}');
            vault[cleanEmail] = freshUserProf;
            localStorage.setItem('jarvis_account_profiles', JSON.stringify(vault));
          } catch {}
        }
      } else if (cachedProfile) {
        const merged = { ...DEFAULT_PROFILE, ...cachedProfile };
        setProfile(merged);
        setIsAdmin(merged.role === 'admin');
        if (storageKeyById) localStorage.setItem(storageKeyById, JSON.stringify(merged));
        if (storageKeyByEmail) localStorage.setItem(storageKeyByEmail, JSON.stringify(merged));
        try {
          await supabase.from('user_profiles').upsert({
            id: userId,
            email: cleanEmail,
            ...merged,
            updated_at: new Date().toISOString()
          });
        } catch {}
      } else {
        const initialProfile = {
          id: userId,
          email: cleanEmail,
          display_name: cleanEmail ? cleanEmail.split('@')[0] : 'Scholar',
          language: 'English',
          interested_subjects: DEFAULT_PROFILE.interested_subjects,
          education_level: 'Undergraduate',
          learning_style: 'Socratic',
          role: 'user'
        };
        try {
          await supabase.from('user_profiles').upsert(initialProfile);
        } catch (e) {
          console.warn('[AuthContext] Profile upsert notice:', e);
        }
        setProfile(initialProfile);
        if (storageKeyById) localStorage.setItem(storageKeyById, JSON.stringify(initialProfile));
        if (storageKeyByEmail) localStorage.setItem(storageKeyByEmail, JSON.stringify(initialProfile));
      }
    } catch (err) {
      console.warn('[AuthContext] Profile fetch notice:', err);
      if (cachedProfile) {
        setProfile(cachedProfile);
        setIsAdmin(cachedProfile.role === 'admin');
      }
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      // 1. Check for Admin session
      const savedAdmin = localStorage.getItem(LOCAL_STORAGE_ADMIN_KEY);
      if (savedAdmin === 'active') {
        const adminUser = { id: 'admin_master', email: 'atulgupta8008@gmail.com', role: 'admin' };
        setUser(adminUser);
        setIsAdmin(true);
        const cachedAdmin = localStorage.getItem(getProfileStorageKey('admin_master'));
        const adminProf = cachedAdmin ? JSON.parse(cachedAdmin) : {
          display_name: 'Atul (Stark Admin)',
          role: 'admin',
          language: 'English',
          interested_subjects: ['Physics', 'Mathematics', 'Astrophysics', 'Quantum Mechanics', 'Computer Science'],
          education_level: 'First Principles Architect',
          learning_style: 'Socratic'
        };
        setProfile(adminProf);
        localStorage.setItem(getProfileStorageKey('admin_master'), JSON.stringify(adminProf));
        setLoading(false);
        return;
      }

      // 2. Check Supabase Auth session
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            setUser(session.user);
            setIsAdmin(false);
            localStorage.setItem(LOCAL_STORAGE_ACTIVE_USER_KEY, JSON.stringify(session.user));
            await fetchSupabaseProfile(session.user.id, session.user.email);
            setLoading(false);
            return;
          }
        } catch (err) {
          console.warn('[AuthContext] Auth session check:', err);
        }
      }

      // 3. Check active local authenticated user
      try {
        const savedUserStr = localStorage.getItem(LOCAL_STORAGE_ACTIVE_USER_KEY);
        if (savedUserStr) {
          const savedUser = JSON.parse(savedUserStr);
          if (savedUser && savedUser.id && !savedUser.isGuest && !String(savedUser.id).startsWith('guest_')) {
            setUser(savedUser);
            setIsAdmin(false);
            await fetchSupabaseProfile(savedUser.id, savedUser.email);
            setLoading(false);
            return;
          }
        }
      } catch {}

      // 4. No authenticated user -> unauthenticated state
      setUser(null);
      setIsAdmin(false);
      setProfile({ ...DEFAULT_PROFILE });
      setLoading(false);
    };

    initAuth();

    // Listen to Supabase Auth state changes
    if (isSupabaseConfigured && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          setIsAdmin(false);
          localStorage.removeItem(LOCAL_STORAGE_ADMIN_KEY);
          localStorage.setItem(LOCAL_STORAGE_ACTIVE_USER_KEY, JSON.stringify(session.user));
          await fetchSupabaseProfile(session.user.id, session.user.email);
        } else if (event === 'SIGNED_OUT') {
          handleLocalSignOut();
        }
      });
      return () => subscription?.unsubscribe();
    }
  }, []);

  const handleLocalSignOut = () => {
    localStorage.removeItem(LOCAL_STORAGE_ADMIN_KEY);
    localStorage.removeItem(LOCAL_STORAGE_ACTIVE_USER_KEY);
    setUser(null);
    setIsAdmin(false);
    setProfile({ ...DEFAULT_PROFILE });
  };

  // Sign Up method with Rate Limit Immunity & Direct Profile Sync
  const signUp = async (email, password, displayName) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanName = (displayName || cleanEmail.split('@')[0]).trim();

    const freshNewProfile = {
      display_name: cleanName,
      email: cleanEmail,
      language: 'English',
      interested_subjects: ['Physics', 'Mathematics', 'Astrophysics'],
      education_level: 'Undergraduate',
      learning_style: 'Socratic',
      role: 'user'
    };

    if (!isSupabaseConfigured || !supabase) {
      const deterministicId = `usr_${btoa(cleanEmail).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')}`;
      const localUser = { id: deterministicId, email: cleanEmail };
      
      const vault = JSON.parse(localStorage.getItem('jarvis_account_vault') || '{}');
      vault[cleanEmail] = password;
      localStorage.setItem('jarvis_account_vault', JSON.stringify(vault));

      const profilesVault = JSON.parse(localStorage.getItem('jarvis_account_profiles') || '{}');
      profilesVault[cleanEmail] = freshNewProfile;
      localStorage.setItem('jarvis_account_profiles', JSON.stringify(profilesVault));

      setUser(localUser);
      setIsAdmin(false);
      setProfile(freshNewProfile);
      localStorage.setItem(getProfileStorageKey(localUser.id), JSON.stringify(freshNewProfile));
      localStorage.setItem(LOCAL_STORAGE_ACTIVE_USER_KEY, JSON.stringify(localUser));
      setShowAuthModal(false);
      setShowSurveyModal(true);
      return { data: { user: localUser }, error: null };
    }

    try {
      // 0. Pre-check if email already exists in user_profiles
      try {
        const { data: existingUsers, error: searchErr } = await supabase
          .from('user_profiles')
          .select('id, email')
          .ilike('email', cleanEmail)
          .limit(1);

        if (!searchErr && existingUsers && existingUsers.length > 0) {
          return {
            data: null,
            error: {
              code: 'USER_ALREADY_EXISTS',
              message: 'An account with this email address is already registered. Please sign in instead.'
            }
          };
        }
      } catch (checkErr) {
        console.warn('[AuthContext] Existing user check notice:', checkErr);
      }

      // Persist to local verified vault
      try {
        const vault = JSON.parse(localStorage.getItem('jarvis_account_vault') || '{}');
        vault[cleanEmail] = password;
        localStorage.setItem('jarvis_account_vault', JSON.stringify(vault));

        const profilesVault = JSON.parse(localStorage.getItem('jarvis_account_profiles') || '{}');
        profilesVault[cleanEmail] = freshNewProfile;
        localStorage.setItem('jarvis_account_profiles', JSON.stringify(profilesVault));
      } catch (vaultErr) {
        console.warn('[AuthContext] Vault write notice:', vaultErr);
      }

      // 1. Attempt Supabase Auth SignUp
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: { display_name: cleanName }
        }
      });

      // Check if user is already registered in Supabase Auth
      if (error) {
        const msg = (error.message || '').toLowerCase();
        if (
          msg.includes('already registered') || 
          msg.includes('already exists') || 
          msg.includes('user_already_exists') ||
          error.code === 'user_already_exists'
        ) {
          return {
            data: null,
            error: {
              code: 'USER_ALREADY_EXISTS',
              message: 'An account with this email address is already registered. Please sign in instead.'
            }
          };
        }
      }

      // 2. If rate limited or standard sign up
      const deterministicId = `usr_${btoa(cleanEmail).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')}`;
      const resilientUser = { id: data?.user?.id || deterministicId, email: cleanEmail };
      
      // Upsert directly into user_profiles table
      try {
        await supabase.from('user_profiles').upsert({
          id: resilientUser.id,
          ...freshNewProfile
        });
      } catch (dbErr) {
        console.warn('[AuthContext] Direct table profile save notice:', dbErr);
      }

      setUser(resilientUser);
      setIsAdmin(false);
      setProfile(freshNewProfile);
      localStorage.setItem(getProfileStorageKey(resilientUser.id), JSON.stringify(freshNewProfile));
      localStorage.setItem(LOCAL_STORAGE_ACTIVE_USER_KEY, JSON.stringify(resilientUser));
      setShowAuthModal(false);
      setShowSurveyModal(true);
      return { data: { user: resilientUser }, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  // Dedicated Admin Login method (Atul's Master Persona)
  const signInAdmin = (adminKey) => {
    const key = (adminKey || '').trim();
    if (key === 'jarvis-admin-777' || key === 'atul8008' || key === 'admin') {
      const adminUser = { id: 'admin_master', email: 'atulgupta8008@gmail.com', role: 'admin' };
      setUser(adminUser);
      setIsAdmin(true);
      localStorage.setItem(LOCAL_STORAGE_ADMIN_KEY, 'active');
      localStorage.setItem(LOCAL_STORAGE_ACTIVE_USER_KEY, JSON.stringify(adminUser));
      
      const cachedAdmin = localStorage.getItem(getProfileStorageKey('admin_master'));
      const adminProf = cachedAdmin ? JSON.parse(cachedAdmin) : {
        display_name: 'Atul (Stark Admin)',
        role: 'admin',
        language: 'English',
        interested_subjects: ['Physics', 'Mathematics', 'Astrophysics', 'Quantum Mechanics', 'Computer Science'],
        education_level: 'First Principles Architect',
        learning_style: 'Socratic'
      };
      setProfile(adminProf);
      localStorage.setItem(getProfileStorageKey('admin_master'), JSON.stringify(adminProf));
      setShowAuthModal(false);
      return { success: true };
    }
    return { success: false, error: 'Invalid Admin Access Key.' };
  };

  // Sign In method with strict email and password validation
  const signIn = async (email, password) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    if (!cleanEmail || !cleanPass) {
      return { data: null, error: { message: 'Please enter both email and password.' } };
    }

    if (!isSupabaseConfigured || !supabase) {
      // Local mock credentials check
      const mockAccounts = JSON.parse(localStorage.getItem('jarvis_account_vault') || '{}');
      if (!mockAccounts[cleanEmail]) {
        return { 
          data: null, 
          error: { message: 'No account found with this email. Please switch to the Sign Up tab to register.' } 
        };
      }
      if (mockAccounts[cleanEmail] !== cleanPass) {
        return { data: null, error: { message: 'Invalid password. Please check your credentials and try again.' } };
      }

      const deterministicId = `usr_${btoa(cleanEmail).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')}`;
      const mockUser = { id: deterministicId, email: cleanEmail };
      setUser(mockUser);
      setIsAdmin(false);
      localStorage.setItem(LOCAL_STORAGE_ACTIVE_USER_KEY, JSON.stringify(mockUser));
      await fetchSupabaseProfile(mockUser.id, cleanEmail);
      setShowAuthModal(false);
      return { data: { user: mockUser }, error: null };
    }

    try {
      // 1. Strict Database Verification: Check if account exists in Supabase DB first
      let dbUserRow = null;
      try {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, email')
          .ilike('email', cleanEmail)
          .limit(1);

        if (profiles && profiles.length > 0) {
          dbUserRow = profiles[0];
        }
      } catch (dbCheckErr) {
        console.warn('[AuthContext] Database presence check notice:', dbCheckErr);
      }

      const vault = JSON.parse(localStorage.getItem('jarvis_account_vault') || '{}');
      const hasLocalVaultAccount = Boolean(vault[cleanEmail]);

      // If user is neither in database nor in verified local vault, REJECT immediately!
      if (!dbUserRow && !hasLocalVaultAccount) {
        return { 
          data: null, 
          error: { message: 'No account found with this email. Please switch to the Sign Up tab to register.' } 
        };
      }

      // 2. Authenticate with Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPass
      });

      if (!error && data?.user) {
        setUser(data.user);
        setIsAdmin(false);
        localStorage.setItem(LOCAL_STORAGE_ACTIVE_USER_KEY, JSON.stringify(data.user));
        await fetchSupabaseProfile(data.user.id, data.user.email);
        setShowAuthModal(false);
        return { data, error: null };
      }

      // 3. Fallback for accounts created with pending confirmation
      if (hasLocalVaultAccount) {
        if (vault[cleanEmail] === cleanPass) {
          const deterministicId = dbUserRow?.id || `usr_${btoa(cleanEmail).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')}`;
          const verifiedUser = { id: deterministicId, email: cleanEmail };
          setUser(verifiedUser);
          setIsAdmin(false);
          localStorage.setItem(LOCAL_STORAGE_ACTIVE_USER_KEY, JSON.stringify(verifiedUser));
          await fetchSupabaseProfile(deterministicId, cleanEmail);
          setShowAuthModal(false);
          return { data: { user: verifiedUser }, error: null };
        } else {
          return { 
            data: null, 
            error: { message: 'Invalid password. Please check your credentials and try again.' } 
          };
        }
      }

      // 4. If account exists in database but password didn't match
      if (dbUserRow) {
        return { 
          data: null, 
          error: { message: 'Invalid password. Please check your credentials and try again.' } 
        };
      }

      return { 
        data: null, 
        error: { message: 'No account found with this email. Please switch to the Sign Up tab to register.' } 
      };
    } catch (error) {
      return { data: null, error: { message: error.message || 'Authentication error.' } };
    }
  };

  // Sign Out
  const signOut = async () => {
    try {
      if (supabase && isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn('[AuthContext] Sign out notice:', err);
    }
    handleLocalSignOut();
  };

  // Update profile in state and Supabase
  const updateProfile = async (updatedFields) => {
    const updated = { ...profile, ...updatedFields };
    setProfile(updated);
    
    // 1. Save by user.id
    if (user?.id) {
      localStorage.setItem(getProfileStorageKey(user.id), JSON.stringify(updated));
    }

    // 2. Save by user.email
    if (user?.email) {
      const cleanEmail = user.email.trim().toLowerCase();
      localStorage.setItem(getProfileStorageKey(cleanEmail), JSON.stringify(updated));
      try {
        const vault = JSON.parse(localStorage.getItem('jarvis_account_profiles') || '{}');
        vault[cleanEmail] = updated;
        localStorage.setItem('jarvis_account_profiles', JSON.stringify(vault));
      } catch {}
    }

    // 3. Save to Supabase DB
    if (user && isSupabaseConfigured && supabase) {
      try {
        await supabase.from('user_profiles').upsert({
          id: user.id,
          email: user.email,
          ...updated,
          updated_at: new Date().toISOString()
        });
      } catch (err) {
        console.warn('[AuthContext] Error updating profile in DB:', err);
      }
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      isAuthenticated: Boolean(user),
      isAdmin,
      loading,
      showAuthModal,
      setShowAuthModal,
      showSurveyModal,
      setShowSurveyModal,
      signIn,
      signUp,
      signInAdmin,
      signOut,
      updateProfile,
      fetchSupabaseProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
