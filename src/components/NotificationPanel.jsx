import { motion, AnimatePresence } from "framer-motion";

/**
 * Notification panel — popover listing recent notifications.
 * Shows on desktop as a dropdown, on mobile as a bottom sheet.
 */
export default function NotificationPanel({
  open,
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onClose,
}) {
  function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Mobile backdrop */}
          <div
            className="notification-backdrop"
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            className="notification-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Notifications"
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="notification-panel__header">
              <h2 className="notification-panel__title">
                Notifications
                {unreadCount > 0 && (
                  <span className="notification-panel__count">
                    {unreadCount} unread
                  </span>
                )}
              </h2>
              {unreadCount > 0 && (
                <button
                  type="button"
                  className="notification-panel__mark-all"
                  onClick={onMarkAllAsRead}
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="notification-panel__list">
              {notifications.length === 0 ? (
                <div className="notification-panel__empty">
                  <span className="notification-panel__empty-icon" aria-hidden="true">
                    🔔
                  </span>
                  <p>No notifications yet.</p>
                  <p className="notification-panel__empty-hint">
                    You'll be reminded about upcoming and overdue tasks here.
                  </p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`notification-item${n.read ? "" : " notification-item--unread"}`}
                  >
                    <div className="notification-item__content">
                      <p className="notification-item__title">{n.title}</p>
                      {n.body && (
                        <p className="notification-item__body">{n.body}</p>
                      )}
                      <p className="notification-item__time">
                        {formatTime(n.created_at)}
                      </p>
                    </div>
                    <div className="notification-item__actions">
                      {!n.read && (
                        <button
                          type="button"
                          className="notification-item__action"
                          onClick={() => onMarkAsRead(n.id)}
                          aria-label="Mark as read"
                          title="Mark as read"
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </button>
                      )}
                      <button
                        type="button"
                        className="notification-item__action notification-item__action--delete"
                        onClick={() => onDelete(n.id)}
                        aria-label="Delete notification"
                        title="Delete"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M3 6h18" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
