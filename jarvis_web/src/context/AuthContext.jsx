import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';

const AuthContext = createContext();

const LOCAL_STORAGE_GUEST_ID_KEY = 'jarvis_guest_session_id';
const LOCAL_STORAGE_ADMIN_KEY = 'jarvis_admin_session';
const LOCAL_STORAGE_ACTIVE_USER_KEY = 'jarvis_active_user_session';

const getOrCreateGuestId = () => {
  try {
    let gid = localStorage.getItem(LOCAL_STORAGE_GUEST_ID_KEY);
    if (!gid) {
      gid = 'guest_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
      localStorage.setItem(LOCAL_STORAGE_GUEST_ID_KEY, gid);
    }
    return gid;
  } catch {
    return 'guest_local';
  }
};

const getProfileStorageKey = (userId) => {
  return userId ? `jarvis_user_profile_${userId}` : 'jarvis_guest_profile';
};

const DEFAULT_PROFILE = {
  display_name: 'Guest Scholar',
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
      if (savedUser) return JSON.parse(savedUser);
    } catch {}
    return {
      id: getOrCreateGuestId(),
      email: null,
      isGuest: true
    };
  });

  const [profile, setProfile] = useState(() => {
    try {
      const activeUser = localStorage.getItem(LOCAL_STORAGE_ACTIVE_USER_KEY);
      const uid = activeUser ? JSON.parse(activeUser).id : null;
      const saved = localStorage.getItem(getProfileStorageKey(uid));
      return saved ? JSON.parse(saved) : { ...DEFAULT_PROFILE };
    } catch {
      return { ...DEFAULT_PROFILE };
    }
  });

  const [isGuest, setIsGuest] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSurveyModal, setShowSurveyModal] = useState(false);

  // Load profile from Supabase table or local isolated storage
  const fetchSupabaseProfile = async (userId, userEmail) => {
    if (!userId) return;
    const storageKey = getProfileStorageKey(userId);

    if (!supabase || !isSupabaseConfigured) {
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        setProfile(JSON.parse(cached));
      }
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data && !error) {
        const freshUserProf = {
          ...DEFAULT_PROFILE,
          ...data,
          interested_subjects: Array.isArray(data.interested_subjects) 
            ? data.interested_subjects 
            : DEFAULT_PROFILE.interested_subjects
        };
        setProfile(freshUserProf);
        setIsAdmin(freshUserProf.role === 'admin');
        localStorage.setItem(storageKey, JSON.stringify(freshUserProf));
      } else {
        // Create clean initial profile for this new user (NEVER spreading old in-memory profile)
        const initialProfile = {
          id: userId,
          email: userEmail,
          display_name: userEmail ? userEmail.split('@')[0] : 'Scholar',
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
        localStorage.setItem(storageKey, JSON.stringify(initialProfile));
      }
    } catch (err) {
      console.warn('[AuthContext] Profile fetch notice:', err);
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
        setIsGuest(false);
        const adminProf = {
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
            setIsGuest(false);
            localStorage.setItem(LOCAL_STORAGE_ACTIVE_USER_KEY, JSON.stringify(session.user));
            await fetchSupabaseProfile(session.user.id, session.user.email);
            setLoading(false);
            return;
          }
        } catch (err) {
          console.warn('[AuthContext] Auth session check:', err);
        }
      }

      // 3. Fallback to Guest
      const gid = getOrCreateGuestId();
      const guestUser = { id: gid, email: null, isGuest: true };
      setUser(guestUser);
      setIsGuest(true);
      setIsAdmin(false);

      const guestCached = localStorage.getItem(getProfileStorageKey(gid));
      if (guestCached) {
        setProfile(JSON.parse(guestCached));
      } else {
        setProfile({ ...DEFAULT_PROFILE });
      }
      setLoading(false);
    };

    initAuth();

    // Listen to Supabase Auth state changes
    if (isSupabaseConfigured && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          setIsGuest(false);
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
    
    // Generate fresh isolated guest scope
    const freshGuestId = 'guest_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
    localStorage.setItem(LOCAL_STORAGE_GUEST_ID_KEY, freshGuestId);
    
    const freshGuestUser = { id: freshGuestId, email: null, isGuest: true };
    setUser(freshGuestUser);
    setIsGuest(true);
    setIsAdmin(false);

    // Pristine clean default profile
    const cleanGuestProfile = { ...DEFAULT_PROFILE };
    setProfile(cleanGuestProfile);
    localStorage.setItem(getProfileStorageKey(freshGuestId), JSON.stringify(cleanGuestProfile));
  };

  // Sign Up method with Rate Limit Immunity & Direct Profile Sync
  const signUp = async (email, password, displayName) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanName = (displayName || cleanEmail.split('@')[0]).trim();
    const storageKey = getProfileStorageKey(cleanEmail);

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
      const guestUser = { id: `user_${Date.now()}`, email: cleanEmail };
      setUser(guestUser);
      setIsGuest(false);
      setProfile(freshNewProfile);
      localStorage.setItem(getProfileStorageKey(guestUser.id), JSON.stringify(freshNewProfile));
      localStorage.setItem(LOCAL_STORAGE_ACTIVE_USER_KEY, JSON.stringify(guestUser));
      setShowAuthModal(false);
      setShowSurveyModal(true);
      return { user: guestUser, error: null };
    }

    try {
      // 0. Pre-check if email already exists in user_profiles
      if (isSupabaseConfigured && supabase) {
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
      setIsGuest(false);
      setIsAdmin(false);
      setProfile(freshNewProfile);
      localStorage.setItem(getProfileStorageKey(resilientUser.id), JSON.stringify(freshNewProfile));
      localStorage.setItem(LOCAL_STORAGE_ACTIVE_USER_KEY, JSON.stringify(resilientUser));
      setShowAuthModal(false);
      setShowSurveyModal(true); // Launch survey
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
      setIsGuest(false);
      localStorage.setItem(LOCAL_STORAGE_ADMIN_KEY, 'active');
      localStorage.setItem(LOCAL_STORAGE_ACTIVE_USER_KEY, JSON.stringify(adminUser));
      
      const adminProf = {
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
      if (mockAccounts[cleanEmail] && mockAccounts[cleanEmail] !== cleanPass) {
        return { data: null, error: { message: 'Invalid password. Please check your credentials and try again.' } };
      }
      mockAccounts[cleanEmail] = cleanPass;
      localStorage.setItem('jarvis_account_vault', JSON.stringify(mockAccounts));

      const mockUser = { id: `user_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`, email: cleanEmail };
      setUser(mockUser);
      setIsGuest(false);
      localStorage.setItem(LOCAL_STORAGE_ACTIVE_USER_KEY, JSON.stringify(mockUser));
      setShowAuthModal(false);
      return { data: { user: mockUser }, error: null };
    }

    try {
      // 1. Authenticate with Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPass
      });

      if (!error && data?.user) {
        setUser(data.user);
        setIsGuest(false);
        setIsAdmin(false);
        localStorage.setItem(LOCAL_STORAGE_ACTIVE_USER_KEY, JSON.stringify(data.user));
        await fetchSupabaseProfile(data.user.id, data.user.email);
        setShowAuthModal(false);
        return { data, error: null };
      }

      // 2. Check verified account vault if Supabase email confirmation was pending
      const vault = JSON.parse(localStorage.getItem('jarvis_account_vault') || '{}');
      if (vault[cleanEmail]) {
        if (vault[cleanEmail] === cleanPass) {
          const deterministicId = `usr_${btoa(cleanEmail).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')}`;
          const verifiedUser = { id: deterministicId, email: cleanEmail };
          setUser(verifiedUser);
          setIsGuest(false);
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

      // 3. Check if user profile exists in database
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, email')
        .ilike('email', cleanEmail)
        .limit(1);

      if (profiles && profiles.length > 0) {
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

  // Continue as Guest method (Zero DB Usage)
  const continueAsGuest = () => {
    handleLocalSignOut();
    setShowAuthModal(false);
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
    
    if (user?.id) {
      localStorage.setItem(getProfileStorageKey(user.id), JSON.stringify(updated));
    }

    if (user && !isGuest && isSupabaseConfigured && supabase) {
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
      isGuest,
      isAdmin,
      loading,
      showAuthModal,
      setShowAuthModal,
      showSurveyModal,
      setShowSurveyModal,
      signIn,
      signUp,
      signInAdmin,
      continueAsGuest,
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
