import { useRef, useEffect } from "react";

/**
 * Notification bell icon with unread count badge.
 * Clicking it opens the notification panel.
 */
export default function NotificationBell({
  unreadCount,
  onToggle,
  open,
  containerRef,
}) {
  const bellRef = useRef(null);

  // Close on outside click/touch.
  useEffect(() => {
    if (!open) return;

    function handlePointer(e) {
      if (
        containerRef?.current &&
        !containerRef.current.contains(e.target)
      ) {
        onToggle();
      }
    }

    const timer = setTimeout(() => {
      document.addEventListener("pointerdown", handlePointer);
    }, 50);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("pointerdown", handlePointer);
    };
  }, [open, onToggle, containerRef]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    function handleKey(e) {
      if (e.key === "Escape") onToggle();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onToggle]);

  return (
    <button
      ref={bellRef}
      type="button"
      className="notification-bell"
      onClick={onToggle}
      aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
      aria-expanded={open}
      aria-haspopup="dialog"
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      {unreadCount > 0 && (
        <span className="notification-bell__badge" aria-hidden="true">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
}
