// TaskFlow — Begin Login Verification Edge Function
//
// Called after a user successfully authenticates with email + password.
// Creates a challenge record tied to the password session, then sends an
// email OTP to the user's email address via Supabase's signInWithOtp.
//
// Deploy: supabase functions deploy begin-login-verification --no-verify-jwt
// Secret: SERVICE_ROLE_KEY must be set (same as delete-account).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing authorization header." }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: "Server misconfiguration." }, 500);
    }

    // Client scoped to the calling user (RLS applies).
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } =
      await userClient.auth.getUser();

    if (userErr || !userData?.user) {
      return json({ error: "Invalid session." }, 401);
    }

    const userId = userData.user.id;
    const userEmail = userData.user.email;
    const sessionId = userData.user.session_id;

    if (!userEmail || !sessionId) {
      return json({ error: "Incomplete session." }, 400);
    }

    // Admin client for writing the challenge (RLS disabled on this table).
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Invalidate any previous unconsumed challenges for this user.
    await adminClient
      .from("login_verification_challenges")
      .delete()
      .eq("user_id", userId)
      .is("consumed_at", null);

    // Create a new challenge tied to the password session.
    const { error: challengeErr } = await adminClient
      .from("login_verification_challenges")
      .insert({
        user_id: userId,
        password_session_id: sessionId,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      });

    if (challengeErr) {
      return json({ error: "Could not create verification challenge." }, 500);
    }

    // Send the email OTP to the user. shouldCreateUser: false prevents
    // creating a new account if the email somehow doesn't exist.
    const { error: otpErr } = await userClient.auth.signInWithOtp({
      email: userEmail,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${new URL(req.url).origin}/verify-login`,
      },
    });

    if (otpErr) {
      return json({ error: "Could not send verification email." }, 500);
    }

    return json({ success: true, email: userEmail }, 200);
  } catch (_err) {
    return json({ error: "Unexpected server error." }, 500);
  }
});

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
