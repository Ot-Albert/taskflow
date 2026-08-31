// TaskFlow — Complete Login Verification Edge Function
//
// Called AFTER the client has verified the OTP with supabase.auth.verifyOtp
// and obtained a new email-OTP session. The client sends the new access
// token; this function validates it, checks the challenge, and records the
// new session as verified so RLS grants access.
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: "Server misconfiguration." }, 500);
    }

    const body = await req.json();
    const { otpToken } = body;

    if (!otpToken) {
      return json({
        error: "Verification token is required.",
      }, 400);
    }

    // Decode the OTP token the client received from verifyOtp.
    const otpClaims = decodeJwtPayload(otpToken);
    if (!otpClaims) {
      return json({ error: "Invalid verification token." }, 401);
    }

    const newSessionId = otpClaims.session_id;
    const userId = otpClaims.sub;
    const otpAmr = otpClaims.amr || [];

    if (!newSessionId || !userId) {
      return json({ error: "Incomplete verification session." }, 400);
    }

    // Ensure the token was created via email OTP.
    if (!otpAmr.some((a) => a.method === "email" || a.method === "otp")) {
      return json({ error: "OTP authentication required." }, 403);
    }

    // Admin client for challenge verification and recording.
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check that a valid, unconsumed challenge exists for this user.
    // We match by user_id only — the challenge was created from the
    // password session, and we just need to confirm one is active.
    const { data: challenge, error: challengeErr } = await adminClient
      .from("login_verification_challenges")
      .select("*")
      .eq("user_id", userId)
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

    // Record the verified OTP session. RLS policies check this table.
    // Expire after 24 hours.
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
