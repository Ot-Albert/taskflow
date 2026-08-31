// TaskFlow — Secure account deletion Edge Function
//
// Deploy with:
//   supabase functions deploy delete-account --no-verify-jwt
//
// Set the service role key as a secret:
//   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
//
// The service role key is NEVER exposed to the client. The client calls this
// function with the user's session JWT, and the function re-verifies the
// password before deleting the account.

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

    // Parse request body.
    const body = await req.json();
    const { password, confirmPhrase } = body;

    if (!password) {
      return json({ error: "Password is required." }, 400);
    }
    if (confirmPhrase !== "DELETE") {
      return json({ error: "Confirmation phrase does not match." }, 400);
    }

    // Re-verify the password server-side before proceeding.
    const { error: verifyErr } =
      await userClient.auth.signInWithPassword({
        email: userEmail,
        password,
      });
    if (verifyErr) {
      return json({ error: "Password verification failed." }, 403);
    }

    // Admin client (bypasses RLS) — used only for deletion.
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Delete avatar files from storage.
    const { data: files } = await adminClient.storage
      .from("avatars")
      .list(userId);

    if (files && files.length > 0) {
      const filePaths = files.map((f) => `${userId}/${f.name}`);
      await adminClient.storage.from("avatars").remove(filePaths);
    }

    // Delete the auth user. Cascading foreign keys will automatically remove
    // the profile and tasks (both reference auth.users(id) on delete cascade).
    const { error: deleteErr } = await adminClient.auth.admin.deleteUser(
      userId
    );

    if (deleteErr) {
      return json({ error: "Failed to delete account." }, 500);
    }

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
