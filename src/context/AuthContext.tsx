import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserProfile, UserRole } from '../types';
import { normalizeDigits } from '../utils/masks';

export const ADMIN_PRIMARY_EMAIL = 'pae6069@gmail.com';

interface RegisterData {
  fullName: string;
  email: string;
  phone: string;
  cpf: string;
  password: string;
}

interface RegisterResult {
  user: User | null;
  session: Session | null;
  hasSession: boolean;
}

interface AuthContextType {
  currentUser: User | null;
  session: Session | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, pass: string) => Promise<UserProfile | null>;
  register: (data: RegisterData) => Promise<RegisterResult>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  checkCpfExists: (cpfDigits: string) => Promise<boolean>;
  refreshProfile: () => Promise<UserProfile | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Helper to fetch user profile directly from public.profiles table
  const fetchProfileForUser = useCallback(async (userId: string, userEmail?: string): Promise<UserProfile | null> => {
    try {
      let { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      // Recovery for PGRST303: "JWT issued at future" (clock skew between GoTrue and PostgREST or stale token)
      if (error && ((error as any).code === 'PGRST303' || error.message?.includes('JWT issued at future'))) {
        console.warn('[Supabase Profiles Query Warning] PGRST303 detectado (JWT issued at future). Sincronizando e renovando sessão...');
        
        // Wait 1.2s for PostgREST server clock alignment
        await new Promise((r) => setTimeout(r, 1200));

        // Attempt session refresh to obtain newly synchronized token
        try {
          const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession();
          if (!refreshErr && refreshData.session) {
            setSession(refreshData.session);
            setCurrentUser(refreshData.user);
          }
        } catch (refreshEx) {
          console.warn('[Supabase Refresh Exception]:', refreshEx);
        }

        // Retry the profiles query with the synchronized token
        const retry = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (!retry.error) {
          data = retry.data;
          error = null;
        } else {
          error = retry.error;
        }
      }

      if (error) {
        console.error('[Supabase Profiles Query Error]:', error);
      }

      const emailToCheck = (data?.email || userEmail || '').toLowerCase().trim();
      const isOfficialAdmin = emailToCheck === ADMIN_PRIMARY_EMAIL;

      if (data) {
        let actualRole: UserRole = (data.role as UserRole) || 'client';

        // Auto-heal admin role for pae6069@gmail.com if not set in DB
        if (isOfficialAdmin && actualRole !== 'admin') {
          actualRole = 'admin';
          // Async update in background
          Promise.resolve(
            supabase
              .from('profiles')
              .update({ role: 'admin' })
              .eq('id', userId)
          )
            .then(() => console.log('[Admin Sync]: Role admin sincronizado para pae6069@gmail.com'))
            .catch((e) => console.warn('[Admin Sync Notice]:', e));
        }

        const profile: UserProfile = {
          id: data.id,
          full_name: data.full_name || '',
          email: data.email || emailToCheck,
          phone: data.phone || '',
          phone_normalized: data.phone_normalized || '',
          cpf: data.cpf || '',
          cpf_normalized: data.cpf_normalized || '',
          role: actualRole,
          active: data.active ?? true,
          created_at: data.created_at || new Date().toISOString(),
          updated_at: data.updated_at || new Date().toISOString(),
        };
        return profile;
      }

      // If profile row doesn't exist yet but user is authenticated
      if (userEmail) {
        const fallbackProfile: UserProfile = {
          id: userId,
          full_name: isOfficialAdmin ? 'Administrador Onze' : 'Cliente',
          email: userEmail,
          phone: '',
          phone_normalized: '',
          cpf: '',
          cpf_normalized: '',
          role: isOfficialAdmin ? 'admin' : 'client',
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        return fallbackProfile;
      }

      return null;
    } catch (err) {
      console.error('[Supabase Fetch Profile Exception]:', err);
      return null;
    }
  }, []);

  // Initialize session and listen for auth state changes
  useEffect(() => {
    let isMounted = true;

    const clearLocalAuthTokens = () => {
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          const keysToRemove: string[] = [];
          for (let i = 0; i < window.localStorage.length; i++) {
            const k = window.localStorage.key(i);
            if (k && (k.startsWith('sb-') || k.includes('auth-token') || k.includes('supabase'))) {
              keysToRemove.push(k);
            }
          }
          keysToRemove.forEach((k) => window.localStorage.removeItem(k));
        } catch {
          // ignore storage errors
        }
      }
    };

    const initializeAuth = async () => {
      try {
        let { data, error } = await supabase.auth.getSession();

        // Retry once on transient network / fetch error
        if (
          error &&
          (error.name === 'AuthRetryableFetchError' ||
            error.message?.toLowerCase().includes('failed to fetch'))
        ) {
          await new Promise((r) => setTimeout(r, 400));
          const retryResult = await supabase.auth.getSession();
          data = retryResult.data;
          error = retryResult.error;
        }

        if (error) {
          console.warn('[Supabase getSession Notice]:', error.message || error);
          try {
            await supabase.auth.signOut({ scope: 'local' });
          } catch {
            // ignore signOut failure when offline
          }
          clearLocalAuthTokens();
        }

        if (isMounted) {
          let currentSession = error ? null : (data?.session ?? null);

          // Check if stored session token is corrupted or significantly in future
          if (currentSession?.access_token) {
            try {
              const parts = currentSession.access_token.split('.');
              if (parts.length === 3) {
                const payload = JSON.parse(atob(parts[1]));
                const nowSec = Math.floor(Date.now() / 1000);
                if (payload.iat && payload.iat > nowSec + 60) {
                  console.warn('[Supabase Auth Warning] Token antigo armazenado com iat no futuro. Limpando sessão antiga...');
                  await supabase.auth.signOut({ scope: 'local' });
                  clearLocalAuthTokens();
                  currentSession = null;
                }
              }
            } catch (jwtErr) {
              console.warn('[JWT parse check note]:', jwtErr);
            }
          }

          setSession(currentSession);
          setCurrentUser(currentSession?.user ?? null);

          if (currentSession?.user) {
            const profile = await fetchProfileForUser(
              currentSession.user.id,
              currentSession.user.email
            );
            if (isMounted) {
              setUserProfile(profile);
            }
          } else {
            setUserProfile(null);
          }
          setLoading(false);
        }
      } catch (err) {
        console.warn('[Supabase Init Auth Notice]:', err);
        clearLocalAuthTokens();
        if (isMounted) {
          setSession(null);
          setCurrentUser(null);
          setUserProfile(null);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Subscribe to auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, newSession: Session | null) => {
        if (!isMounted) return;

        setSession(newSession);
        setCurrentUser(newSession?.user ?? null);

        if (newSession?.user) {
          const profile = await fetchProfileForUser(
            newSession.user.id,
            newSession.user.email
          );
          if (isMounted) {
            setUserProfile(profile);
            setLoading(false);
          }
        } else {
          setUserProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [fetchProfileForUser]);

  // Check if CPF already exists in database
  const checkCpfExists = async (cpfDigits: string): Promise<boolean> => {
    try {
      const cleanDigits = normalizeDigits(cpfDigits);
      if (!cleanDigits) return false;

      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('cpf_normalized', cleanDigits)
        .maybeSingle();

      if (error) {
        return false;
      }
      return !!data?.id;
    } catch {
      return false;
    }
  };

  // Register client via Supabase Auth
  const register = async (data: RegisterData): Promise<RegisterResult> => {
    const cleanEmail = data.email.trim().toLowerCase();
    const cleanPhone = data.phone.trim();
    const cleanPhoneNormalized = normalizeDigits(data.phone);
    const cleanCpf = data.cpf.trim();
    const cleanCpfNormalized = normalizeDigits(data.cpf);

    // Call Supabase Auth signUp sending metadata in options.data
    // Note: The role is ALWAYS 'client' by default unless email is pae6069@gmail.com
    const roleToAssign: UserRole = cleanEmail === ADMIN_PRIMARY_EMAIL ? 'admin' : 'client';

    const { data: resData, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName.trim(),
          phone: cleanPhone,
          phone_normalized: cleanPhoneNormalized,
          cpf: cleanCpf,
          cpf_normalized: cleanCpfNormalized,
          role: roleToAssign,
        },
      },
    });

    if (error) {
      console.error('[Supabase signUp Error]:', error);
      throw error;
    }

    const createdUser = resData.user ?? null;
    const activeSession = resData.session ?? null;

    if (createdUser) {
      try {
        // Attempt explicit profile upsert to guarantee persistence even if database triggers are missing
        await supabase.from('profiles').upsert(
          {
            id: createdUser.id,
            full_name: data.fullName.trim(),
            email: cleanEmail,
            phone: cleanPhone,
            phone_normalized: cleanPhoneNormalized,
            cpf: cleanCpf,
            cpf_normalized: cleanCpfNormalized,
            role: roleToAssign,
            active: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );
      } catch (upsertErr) {
        console.warn('[Register Profile Upsert Note]:', upsertErr);
      }
    }

    if (activeSession && createdUser) {
      setSession(activeSession);
      setCurrentUser(createdUser);
      const profile = await fetchProfileForUser(createdUser.id, createdUser.email);
      setUserProfile(profile);
    }

    return {
      user: createdUser,
      session: activeSession,
      hasSession: !!activeSession,
    };
  };

  // Login with Email and Password
  const login = async (email: string, pass: string): Promise<UserProfile | null> => {
    const cleanEmail = email.trim().toLowerCase();
    const isOfficialAdmin = cleanEmail === ADMIN_PRIMARY_EMAIL;

    // Purge any stale tokens before fresh login
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && (k.startsWith('sb-') || k.includes('auth-token'))) {
            window.localStorage.removeItem(k);
          }
        }
      }
    } catch {
      // ignore
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: pass,
    });

    if (error) {
      const errMsg = (error.message || '').toLowerCase();
      // If admin account doesn't exist yet in this Supabase database instance, attempt auto-creation
      if (isOfficialAdmin && (errMsg.includes('invalid login credentials') || errMsg.includes('user not found') || errMsg.includes('invalid credentials'))) {
        try {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: cleanEmail,
            password: pass,
            options: {
              data: {
                full_name: 'Administrador Onze',
                role: 'admin',
                phone: '(62) 98222-5111',
                phone_normalized: '62982225111',
                cpf: '000.000.000-00',
                cpf_normalized: '00000000000',
              },
            },
          });

          if (!signUpError && signUpData.user) {
            if (signUpData.session) {
              setSession(signUpData.session);
              setCurrentUser(signUpData.user);
              const profile = await fetchProfileForUser(signUpData.user.id, signUpData.user.email);
              setUserProfile(profile);
              return profile;
            }
          }
        } catch (signUpErr) {
          console.warn('[Admin Setup on Login Exception]:', signUpErr);
        }
      }

      console.warn('[Supabase Login Notice]:', error.message);
      throw error;
    }

    if (data.session && data.user) {
      setSession(data.session);
      setCurrentUser(data.user);
      const profile = await fetchProfileForUser(data.user.id, data.user.email);
      setUserProfile(profile);
      return profile;
    }

    return null;
  };

  // Sign out
  const logout = async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('[Supabase signOut Error]:', error);
      }
    } catch (err) {
      console.error('[Supabase signOut Exception]:', err);
    } finally {
      // Clean up any remaining Supabase tokens from localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          const keysToRemove: string[] = [];
          for (let i = 0; i < window.localStorage.length; i++) {
            const k = window.localStorage.key(i);
            if (k && (k.startsWith('sb-') || k.includes('auth-token') || k.includes('supabase'))) {
              keysToRemove.push(k);
            }
          }
          keysToRemove.forEach((k) => window.localStorage.removeItem(k));
        } catch (e) {
          console.warn('[LocalStorage clear note]:', e);
        }
      }
      setCurrentUser(null);
      setSession(null);
      setUserProfile(null);
    }
  };

  // Reset password via email
  const resetPassword = async (email: string): Promise<void> => {
    const cleanEmail = email.trim().toLowerCase();
    const redirectTo = `${window.location.origin}/login`;

    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo,
    });

    if (error) {
      console.error('[Supabase resetPasswordForEmail Error]:', error);
      throw error;
    }
  };

  // Refresh profile manually
  const refreshProfile = async (): Promise<UserProfile | null> => {
    if (currentUser) {
      const profile = await fetchProfileForUser(currentUser.id, currentUser.email);
      setUserProfile(profile);
      return profile;
    }
    return null;
  };

  const isAdmin = userProfile?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        session,
        userProfile,
        loading,
        isAdmin,
        login,
        register,
        logout,
        resetPassword,
        checkCpfExists,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

