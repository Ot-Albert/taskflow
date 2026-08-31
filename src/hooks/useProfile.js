import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Manages the current user's profile: loading, name editing, avatar upload,
 * deactivation, reactivation, and permanent deletion.
 */
export function useProfile(user) {
  const [profile, setProfile] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const userId = user?.id;
  const fullName = profile?.full_name || user?.user_metadata?.full_name || "";

  // Load profile on mount / user change.
  useEffect(() => {
    if (!userId || !supabase) {
      setProfile(null);
      setAvatarUrl(null);
      setLoading(false);
      return;
    }

    let active = true;

    async function load() {
      setLoading(true);
      setError(null);

      // Fetch or create the profile row.
      const { data, error: fetchErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (!active) return;

      if (fetchErr) {
        // Profile doesn't exist yet — create it.
        const name = user?.user_metadata?.full_name || "";
        const { data: created, error: createErr } = await supabase
          .from("profiles")
          .insert({ id: userId, full_name: name })
          .select()
          .single();

        if (!active) return;
        if (createErr) {
          setError("Could not load profile.");
          setProfile(null);
        } else {
          setProfile(created);
        }
      } else {
        setProfile(data);
      }

      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, [userId, user?.user_metadata?.full_name]);

  // Load signed avatar URL when profile changes.
  useEffect(() => {
    if (!profile?.avatar_path || !supabase) {
      setAvatarUrl(null);
      return;
    }

    let active = true;

    async function loadAvatar() {
      const { data } = await supabase.storage
        .from("avatars")
        .createSignedUrl(profile.avatar_path, 3600);

      if (!active) return;
      if (data?.signedUrl) {
        setAvatarUrl(data.signedUrl);
      }
    }

    loadAvatar();
    return () => {
      active = false;
    };
  }, [profile?.avatar_path]);

  const updateName = useCallback(
    async (newName) => {
      if (!userId || !supabase) return { error: "Not available." };
      setSaving(true);
      setError(null);

      const trimmed = newName.trim();
      const { data, error: updateErr } = await supabase
        .from("profiles")
        .update({ full_name: trimmed, updated_at: new Date().toISOString() })
        .eq("id", userId)
        .select()
        .single();

      setSaving(false);

      if (updateErr) {
        setError("Could not update name.");
        return { error: updateErr };
      }

      // Also update auth metadata so the name stays in sync.
      await supabase.auth.updateUser({
        data: { full_name: trimmed },
      });

      setProfile(data);
      return { error: null };
    },
    [userId]
  );

  const uploadAvatar = useCallback(
    async (file) => {
      if (!userId || !supabase) return { error: "Not available." };

      if (!ALLOWED_TYPES.includes(file.type)) {
        return { error: "Only JPEG, PNG, or WebP images are allowed." };
      }
      if (file.size > MAX_AVATAR_SIZE) {
        return { error: "Image must be 5 MB or smaller." };
      }

      setSaving(true);
      setError(null);

      const ext = file.name.split(".").pop();
      const filePath = `${userId}/avatar.${ext}`;

      // Remove old avatar if path differs.
      if (profile?.avatar_path && profile.avatar_path !== filePath) {
        await supabase.storage.from("avatars").remove([profile.avatar_path]);
      }

      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadErr) {
        setSaving(false);
        setError("Could not upload image.");
        return { error: uploadErr };
      }

      // Save the path in the profile.
      const { data, error: profileErr } = await supabase
        .from("profiles")
        .update({ avatar_path: filePath, updated_at: new Date().toISOString() })
        .eq("id", userId)
        .select()
        .single();

      setSaving(false);

      if (profileErr) {
        setError("Could not save avatar path.");
        return { error: profileErr };
      }

      setProfile(data);
      return { error: null };
    },
    [userId, profile?.avatar_path]
  );

  const removeAvatar = useCallback(async () => {
    if (!userId || !supabase || !profile?.avatar_path) return { error: null };

    setSaving(true);

    await supabase.storage.from("avatars").remove([profile.avatar_path]);

    const { data, error: profileErr } = await supabase
      .from("profiles")
      .update({ avatar_path: "", updated_at: new Date().toISOString() })
      .eq("id", userId)
      .select()
      .single();

    setSaving(false);

    if (profileErr) {
      setError("Could not remove avatar.");
      return { error: profileErr };
    }

    setProfile(data);
    setAvatarUrl(null);
    return { error: null };
  }, [userId, profile?.avatar_path]);

  const deactivateAccount = useCallback(async () => {
    if (!userId || !supabase) return { error: "Not available." };

    setSaving(true);
    const { error: updateErr } = await supabase
      .from("profiles")
      .update({
        status: "deactivated",
        deactivated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    setSaving(false);

    if (updateErr) {
      setError("Could not deactivate account.");
      return { error: updateErr };
    }

    return { error: null };
  }, [userId]);

  const reactivateAccount = useCallback(async () => {
    if (!userId || !supabase) return { error: "Not available." };

    setSaving(true);
    const { error: updateErr } = await supabase
      .from("profiles")
      .update({
        status: "active",
        deactivated_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    setSaving(false);

    if (updateErr) {
      setError("Could not reactivate account.");
      return { error: updateErr };
    }

    return { error: null };
  }, [userId]);

  const deleteAccount = useCallback(
    async (password, confirmPhrase) => {
      if (!userId || !supabase) return { error: "Not available." };

      setSaving(true);

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        setSaving(false);
        return { error: "No active session." };
      }

      const { data: fnData, error: fnErr } = await supabase.functions.invoke(
        "delete-account",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          body: { password, confirmPhrase },
        }
      );

      setSaving(false);

      if (fnErr || fnData?.error) {
        return { error: fnData?.error || fnErr?.message || "Deletion failed." };
      }

      return { error: null };
    },
    [userId]
  );

  const updateReminderOffset = useCallback(
    async (offsetMinutes) => {
      if (!userId || !supabase) return { error: "Not available." };
      setSaving(true);
      setError(null);

      const { data, error: updateErr } = await supabase
        .from("profiles")
        .update({
          reminder_offset: offsetMinutes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)
        .select()
        .single();

      setSaving(false);

      if (updateErr) {
        setError("Could not update reminder setting.");
        return { error: updateErr };
      }

      setProfile(data);
      return { error: null };
    },
    [userId]
  );

  const isDeactivated = profile?.status === "deactivated";

  return {
    profile,
    fullName,
    initials: getInitials(fullName),
    avatarUrl,
    loading,
    saving,
    error,
    isDeactivated,
    reminderOffset: profile?.reminder_offset ?? 1440,
    updateName,
    uploadAvatar,
    removeAvatar,
    updateReminderOffset,
    deactivateAccount,
    reactivateAccount,
    deleteAccount,
  };
}
