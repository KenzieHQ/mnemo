import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
}

interface AuthContextType extends AuthState {
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signInWithMagicLink: (email: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
  deleteAccount: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    isConfigured: isSupabaseConfigured(),
  });

  useEffect(() => {
    if (!state.isConfigured) {
      // Not configured - immediately set loading to false for offline mode
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    let mounted = true;

    // Get initial session with timeout to prevent hanging
    const getInitialSession = async () => {
      try {
        // Add a timeout to prevent infinite loading
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Session timeout')), 5000);
        });
        
        const sessionPromise = supabase.auth.getSession();
        
        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as Awaited<typeof sessionPromise>;
        
        if (mounted) {
          setState(prev => ({
            ...prev,
            session,
            user: session?.user ?? null,
            loading: false,
          }));
        }
      } catch (error) {
        console.error('Error getting session:', error);
        if (mounted) {
          setState(prev => ({ ...prev, loading: false }));
        }
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        setState(prev => ({
          ...prev,
          session,
          user: session?.user ?? null,
          loading: false,
        }));

        // Create profile on sign up
        if (event === 'SIGNED_IN' && session?.user) {
          try {
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('id')
              .eq('id', session.user.id)
              .single();

            if (!existingProfile && mounted) {
              await supabase.from('profiles').insert({
                id: session.user.id,
                display_name: session.user.user_metadata?.display_name || 
                             session.user.email?.split('@')[0] || 'User',
              });

              // Create default settings
              await supabase.from('user_settings').insert({
                user_id: session.user.id,
              });
            }
          } catch (error) {
            console.error('Error creating profile:', error);
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [state.isConfigured]);

  const signUp = useCallback(async (email: string, password: string, displayName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName || email.split('@')[0],
        },
      },
    });
    return { error };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  }, []);

  const signInWithMagicLink = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { error };
  }, []);

  const deleteAccount = useCallback(async () => {
    if (!state.user) {
      return { error: new Error('No user logged in') };
    }

    try {
      // Delete all user data (cascade will handle related records)
      // Note: This requires a server-side function for full account deletion
      // For now, we delete user data and sign out
      
      const userId = state.user.id;
      
      // Delete review states
      await supabase.from('review_states').delete().eq('user_id', userId);
      
      // Delete cards
      await supabase.from('cards').delete().eq('user_id', userId);
      
      // Delete study sessions
      await supabase.from('study_sessions').delete().eq('user_id', userId);
      
      // Delete decks
      await supabase.from('decks').delete().eq('user_id', userId);
      
      // Delete settings
      await supabase.from('user_settings').delete().eq('user_id', userId);
      
      // Delete profile
      await supabase.from('profiles').delete().eq('id', userId);
      
      // Sign out
      await supabase.auth.signOut();
      
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }, [state.user]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signUp,
        signIn,
        signInWithMagicLink,
        signOut,
        resetPassword,
        updatePassword,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
