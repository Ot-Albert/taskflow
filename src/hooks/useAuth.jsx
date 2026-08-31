import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";

// Auth context — multi-state authentication machine.
// States: loading, signed_out, password_verified, awaiting_email_code,
//         fully_verified, password_recovery, deactivated
const AuthContext = createContext(null);

// Decode a JWT payload (without verifying signature).
function decodeJwtPayload(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

// Extract session_id from a Supabase session's access token.
function getSessionId(session) {
  if (!session?.access_token) return null;
  const claims = decodeJwtPayload(session.access_token);
  return claims?.session_id ?? null;
}

// Extract AMR methods from a Supabase session's access token.
function getAuthMethods(session) {
  if (!session?.access_token) return [];
  const claims = decodeJwtPayload(session.access_token);
  const amr = claims?.amr || [];
  return amr.map((a) => a.method);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileStatus, setProfileStatus] = useState(null);
  const [authState, setAuthState] = useState("loading");
  const [pendingEmail, setPendingEmail] = useState(null);

  // Check if the current session is verified by attempting a profile read.
  // If RLS allows the read, the session is verified. If not, it isn't.
  const checkVerified = useCallback(async (currentSession) => {
    if (!currentSession?.user || !supabase) return false;

    const { data, error } = await supabase
      .from("profiles")
      .select("status")
      .eq("id", currentSession.user.id)
      .single();

    if (error || !data) return false;
    setProfileStatus(data.status);
    return true;
  }, []);

  // Restore session on mount.
  useEffect(() => {
    let active = true;

    async function init() {
      if (!isSupabaseConfigured || !supabase) {
        setLoading(false);
        setAuthState("signed_out");
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (!active) return;

      if (data.session?.user) {
        setSession(data.session);
        setUser(data.session.user);

        // Check if this session is verified.
        const verified = await checkVerified(data.session);
        if (!active) return;

        if (verified) {
          if (profileStatus === "deactivated") {
            setAuthState("deactivated");
          } else {
            setAuthState("fully_verified");
          }
        } else {
          // Has a session but not verified — determine the session type
          // from the JWT's AMR (Authentication Methods Reference).
          const methods = getAuthMethods(data.session);

          if (methods.includes("recovery")) {
            setAuthState("password_recovery");
          } else if (methods.includes("password")) {
            // Password session without verification — needs email code.
            setPendingEmail(data.session.user.email);
            setAuthState("awaiting_email_code");
          } else {
            // Unknown session type — sign out for safety.
            await supabase.auth.signOut();
            setAuthState("signed_out");
          }
        }
      } else {
        setAuthState("signed_out");
      }

      setLoading(false);

      // Listen for auth state changes.
      supabase.auth.onAuthStateChange(async (_event, newSession) => {
        if (!active) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (!newSession?.user) {
          setAuthState("signed_out");
          setPendingEmail(null);
          setProfileStatus(null);
        }
      });
    }

    init();
    return () => {
      active = false;
    };
  }, [checkVerified, profileStatus]);

  // Sign up — creates account, Supabase sends confirmation email.
  const signUp = useCallback(async ({ email, password, fullName }) => {
    if (!supabase) return { data: null, error: { message: "Auth not configured." } };
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    return { data, error };
  }, []);

  // Sign in with password — does NOT grant full access.
  // After password verification, begins the email verification flow.
  const signIn = useCallback(async ({ email, password }) => {
    if (!supabase) return { data: null, error: { message: "Auth not configured." } };

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return { data, error };

    setUser(data.user);
    setSession(data.session);
    setPendingEmail(data.user.email);
    setAuthState("password_verified");

    // Begin the email verification flow via Edge Function.
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    if (accessToken) {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/begin-login-verification`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
          }
        );
        const result = await response.json();
        if (result?.error) {
          await supabase.auth.signOut();
          setAuthState("signed_out");
          setPendingEmail(null);
          return { data: null, error: { message: result.error } };
        }
      } catch {
        await supabase.auth.signOut();
        setAuthState("signed_out");
        setPendingEmail(null);
        return {
          data: null,
          error: { message: "Could not start verification. Try again." },
        };
      }
    }

    setAuthState("awaiting_email_code");
    return { data, error: null };
  }, []);

  // Complete login verification — called with the email code.
  // The client calls verifyOtp directly so the new OTP session is stored
  // in the browser, then sends the new token to the Edge Function which
  // records it as verified so RLS grants access.
  const completeLoginVerification = useCallback(
    async (code) => {
      if (!supabase) return { error: { message: "Auth not configured." } };
      if (!pendingEmail) return { error: { message: "No pending login." } };

      // Step 1: Verify the OTP on the client. This creates a new email-OTP
      // session in the browser, replacing the password session.
      const { data: otpData, error: otpError } = await supabase.auth.verifyOtp({
        email: pendingEmail,
        token: String(code),
        type: "email",
      });

      if (otpError || !otpData?.session?.access_token) {
        return {
          error: {
            message: otpError?.message || "Invalid or expired code.",
          },
        };
      }

      const otpToken = otpData.session.access_token;

      // Step 2: Send the new OTP token to the Edge Function so it can
      // record the session as verified.
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/complete-login-verification`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ otpToken }),
          }
        );
        const result = await response.json();

        if (result?.error) {
          // The Edge Function rejected the challenge — sign out for safety.
          await supabase.auth.signOut();
          setAuthState("signed_out");
          setPendingEmail(null);
          return { error: { message: result.error } };
        }

        // Step 3: The verified session is now in the browser and recorded
        // server-side. Update state and check profile access.
        const { data: newData } = await supabase.auth.getSession();
        setSession(newData.session);
        setUser(newData.session?.user ?? null);

        const verified = await checkVerified(newData.session);
        if (verified) {
          if (profileStatus === "deactivated") {
            setAuthState("deactivated");
          } else {
            setAuthState("fully_verified");
          }
        } else {
          await supabase.auth.signOut();
          setAuthState("signed_out");
          return { error: { message: "Verification could not be confirmed." } };
        }

        setPendingEmail(null);
        return { error: null };
      } catch {
        return { error: { message: "Verification request failed." } };
      }
    },
    [checkVerified, pendingEmail, profileStatus]
  );

  // Resend the login verification code.
  const resendLoginCode = useCallback(async () => {
    if (!supabase) return { error: { message: "Auth not configured." } };

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    if (!accessToken) {
      return { error: { message: "No active session." } };
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/begin-login-verification`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
        }
      );
      const result = await response.json();

      if (result?.error) {
        return { error: { message: result.error } };
      }
      return { error: null };
    } catch {
      return { error: { message: "Could not resend code." } };
    }
  }, []);

  // Cancel pending login — signs out the password session.
  const cancelPendingLogin = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setPendingEmail(null);
    setProfileStatus(null);
    setAuthState("signed_out");
  }, []);

  // Sign out.
  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setPendingEmail(null);
    setProfileStatus(null);
    setAuthState("signed_out");
  }, []);

  // Request password reset.
  const requestPasswordReset = useCallback(async (email) => {
    if (!supabase) return { error: { message: "Auth not configured." } };
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    return { error };
  }, []);

  const value = {
    user,
    session,
    loading,
    authState,
    pendingEmail,
    profileStatus,
    isDeactivated: profileStatus === "deactivated",
    isFullyVerified: authState === "fully_verified",
    isAwaitingCode: authState === "awaiting_email_code",
    isPasswordVerified: authState === "password_verified",
    signUp,
    signIn,
    completeLoginVerification,
    resendLoginCode,
    cancelPendingLogin,
    signOut,
    requestPasswordReset,
    isSupabaseConfigured,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
