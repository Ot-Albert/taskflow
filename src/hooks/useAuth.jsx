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
  const [profileStatus, setProfileStatus] = useState(null);

  // Restore session on mount.
  useEffect(() => {
    let active = true;

    async function init() {
      if (isSupabaseConfigured) {
        const { data } = await supabase.auth.getSession();
        if (!active) return;
        setSession(data.session);
        setUser(data.session?.user ?? null);

        // Check profile status for deactivated accounts.
        if (data.session?.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("status")
            .eq("id", data.session.user.id)
            .single();
          if (!active) return;
          setProfileStatus(profile?.status ?? "active");
        }

        supabase.auth.onAuthStateChange(async (_event, newSession) => {
          setSession(newSession);
          setUser(newSession?.user ?? null);

          if (newSession?.user) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("status")
              .eq("id", newSession.user.id)
              .single();
            setProfileStatus(profile?.status ?? "active");
          } else {
            setProfileStatus(null);
          }
        });
      } else {
        const { data } = localAuth.getSession();
        if (!active) return;
        setSession(data.session);
        setUser(data.session?.user ?? null);
        setProfileStatus("active");
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
      if (data?.user) setProfileStatus("active");
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

        // Check if the account is deactivated.
        const { data: profile } = await supabase
          .from("profiles")
          .select("status")
          .eq("id", data.user.id)
          .single();
        setProfileStatus(profile?.status ?? "active");
      }
      return { data, error };
    }
    const result = await localAuth.signInWithPassword({ email, password });
    if (result.data?.user) {
      setUser(result.data.user);
      setSession(result.data.session);
      setProfileStatus("active");
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
    setProfileStatus(null);
  }, []);

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    isSupabaseConfigured,
    profileStatus,
    isDeactivated: profileStatus === "deactivated",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
