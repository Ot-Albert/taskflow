// TaskFlow — Complete Login Verification Edge Function
//
// Called after the user enters the email OTP. Verifies the OTP with
// Supabase, checks that a valid challenge exists for this user, and
// records the new OTP session as verified so RLS grants access.
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing authorization header." }, 401);
    }

    const passwordToken = authHeader.replace("Bearer ", "");
    const passwordClaims = decodeJwtPayload(passwordToken);
    if (!passwordClaims) {
      return json({ error: "Invalid password session token." }, 401);
    }

    const userId = passwordClaims.sub;
    const passwordSessionId = passwordClaims.session_id;
    const passwordAmr = passwordClaims.amr || [];

    if (!userId || !passwordSessionId) {
      return json({ error: "Incomplete password session." }, 400);
    }

    if (!passwordAmr.some((a) => a.method === "password")) {
      return json({ error: "Password authentication required." }, 403);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: "Server misconfiguration." }, 500);
    }

    const body = await req.json();
    const { code } = body;

    if (!code) {
      return json({ error: "Verification code is required." }, 400);
    }

    // Client scoped to the password session for fetching user email.
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user?.email) {
      return json({ error: "Invalid password session." }, 401);
    }

    const userEmail = userData.user.email;

    // Verify the OTP code. verifyOtp is a public endpoint, so we call it
    // with a fresh client to avoid any session confusion.
    const anonClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: verifyData, error: verifyErr } = await anonClient.auth.verifyOtp({
      email: userEmail,
      token: String(code),
      type: "email",
    });

    if (verifyErr || !verifyData?.session?.access_token) {
      return json({
        error: "Invalid or expired code. Please try again.",
      }, 400);
    }

    const newAccessToken = verifyData.session.access_token;
    const newClaims = decodeJwtPayload(newAccessToken);
    const newSessionId = newClaims?.session_id;
    const newAmr = newClaims?.amr || [];

    if (!newSessionId) {
      return json({ error: "Could not determine verified session." }, 500);
    }

    if (!newAmr.some((a) => a.method === "email" || a.method === "otp")) {
      return json({ error: "OTP authentication required." }, 403);
    }

    if (newClaims.sub !== userId) {
      return json({ error: "Code does not belong to this user." }, 403);
    }

    // Admin client for challenge verification and recording.
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
