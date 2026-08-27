import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";
import { localAuth } from "../lib/localAuth";

// Auth context — abstracts Supabase vs. local fallback so every component
// uses the same API regardless of which backend is active.
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount.
  useEffect(() => {
    let active = true;

    async function init() {
      if (isSupabaseConfigured) {
        const { data } = await supabase.auth.getSession();
        if (!active) return;
        setSession(data.session);
        setUser(data.session?.user ?? null);
        supabase.auth.onAuthStateChange((_event, newSession) => {
          setSession(newSession);
          setUser(newSession?.user ?? null);
        });
      } else {
        const { data } = localAuth.getSession();
        if (!active) return;
        setSession(data.session);
        setUser(data.session?.user ?? null);
      }
      setLoading(false);
    }

    init();
    return () => {
      active = false;
    };
  }, []);

  const signUp = useCallback(async ({ email, password, fullName }) => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      return { data, error };
    }
    return localAuth.signUp({ email, password, fullName });
  }, []);

  const signIn = useCallback(async ({ email, password }) => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (data?.user) {
        setUser(data.user);
        setSession(data.session);
      }
      return { data, error };
    }
    const result = await localAuth.signInWithPassword({ email, password });
    if (result.data?.user) {
      setUser(result.data.user);
      setSession(result.data.session);
    }
    return result;
  }, []);

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    } else {
      await localAuth.signOut();
    }
    setUser(null);
    setSession(null);
  }, []);

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    isSupabaseConfigured,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
