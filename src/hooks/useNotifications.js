import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * Manages in-app notifications: loading, marking as read, and polling
 * for new notifications while the app is open.
 */
export function useNotifications(userId) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Load notifications on mount and when user changes.
  useEffect(() => {
    if (!userId || !supabase) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    let active = true;

    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!active) return;

      if (error) {
        setNotifications([]);
        setUnreadCount(0);
      } else {
        setNotifications(data || []);
        setUnreadCount((data || []).filter((n) => !n.read).length);
      }
      setLoading(false);
    }

    load();

    // Poll for new notifications every 60 seconds while the app is open.
    const interval = setInterval(load, 60000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [userId]);

  // Mark a single notification as read.
  const markAsRead = useCallback(
    async (id) => {
      if (!userId || !supabase) return;
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", id);

      if (!error) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    },
    [userId]
  );

  // Mark all notifications as read.
  const markAllAsRead = useCallback(async () => {
    if (!userId || !supabase) return;
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    }
  }, [userId]);

  // Delete a notification.
  const deleteNotification = useCallback(
    async (id) => {
      if (!userId || !supabase) return;
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", id);

      if (!error) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        setUnreadCount((prev) =>
          Math.max(
            0,
            prev - (notifications.find((n) => n.id === id)?.read ? 0 : 1)
          )
        );
      }
    },
    [userId, notifications]
  );

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}
