// TaskFlow — Complete Login Verification Edge Function
//
// Called after the user enters the 6-digit email code. Verifies the OTP
// with Supabase, then checks that a valid challenge exists for this user
// and that the current session was created via email OTP. If everything
// checks out, marks the current session as verified so RLS grants access.
//
// Deploy: supabase functions deploy complete-login-verification --no-verify-jwt
// Secret: SERVICE_ROLE_KEY must be set.

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

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const body = await req.json();
    const { code } = body;

    if (!code) {
      return json({ error: "Verification code is required." }, 400);
    }

    // Get the current user before OTP verification.
    const { data: preUserData, error: preUserErr } =
      await userClient.auth.getUser();

    if (preUserErr || !preUserData?.user) {
      return json({ error: "Invalid session." }, 401);
    }

    const userId = preUserData.user.id;
    const userEmail = preUserData.user.email;
    const passwordSessionId = preUserData.user.session_id;

    if (!userEmail || !passwordSessionId) {
      return json({ error: "Incomplete session." }, 400);
    }

    // Admin client for challenge verification.
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check that a valid, unconsumed challenge exists for this user
    // that was created from the password session.
    const { data: challenge, error: challengeErr } = await adminClient
      .from("login_verification_challenges")
      .select("*")
      .eq("user_id", userId)
      .eq("password_session_id", passwordSessionId)
      .is("consumed_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (challengeErr || !challenge) {
      return json({
        error: "No active verification challenge. Please sign in again.",
      }, 403);
    }

    // Verify the OTP code. This creates a new session with the email OTP
    // authentication method.
    const { error: verifyErr } = await userClient.auth.verifyOtp({
      email: userEmail,
      token: String(code),
      type: "email",
    });

    if (verifyErr) {
      return json({
        error: "Invalid or expired code. Please try again.",
      }, 400);
    }

    // Get the new session after OTP verification.
    const { data: postData, error: postErr } =
      await userClient.auth.getUser();

    if (postErr || !postData?.user) {
      return json({ error: "Session lost after verification." }, 401);
    }

    const newSessionId = postData.user.session_id;

    if (!newSessionId) {
      return json({ error: "Could not determine verified session." }, 500);
    }

    // Mark the challenge as consumed.
    await adminClient
      .from("login_verification_challenges")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", challenge.id);

    // Record the verified session. RLS policies will check this table.
    // Expire after 24 hours — the user will need to re-verify on next login.
    await adminClient
      .from("verified_login_sessions")
      .upsert({
        session_id: newSessionId,
        user_id: userId,
        verified_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

    return json({ success: true }, 200);
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
