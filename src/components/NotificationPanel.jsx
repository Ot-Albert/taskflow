import { motion, AnimatePresence } from "framer-motion";

/**
 * Notification panel — popover listing recent notifications.
 * Shows on desktop as an elevated glassmorphic bubble card dropdown,
 * and on mobile as a high-end bottom sheet with drag handle.
 */
export default function NotificationPanel({
  open,
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onClose,
  onSelectTask,
}) {
  function formatTime(timestamp) {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay === 1) return "Yesterday";
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function getNotificationMeta(n) {
    const titleLower = (n.title || "").toLowerCase();
    if (titleLower.includes("overdue") || n.type === "overdue") {
      return {
        badgeClass: "notification-item__icon-wrap--overdue",
        icon: (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        ),
      };
    }
    if (titleLower.includes("due") || n.type === "reminder") {
      return {
        badgeClass: "notification-item__icon-wrap--reminder",
        icon: (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        ),
      };
    }
    return {
      badgeClass: "notification-item__icon-wrap--general",
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      ),
    };
  }

  const handleItemClick = (n) => {
    if (!n.read && onMarkAsRead) {
      onMarkAsRead(n.id);
    }
    if (n.task_id && onSelectTask) {
      onSelectTask(n.task_id);
    }
    if (onClose) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Mobile backdrop with smooth fade */}
          <div
            className="notification-backdrop"
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            className="notification-panel bubble-card"
            role="dialog"
            aria-modal="true"
            aria-label="Notifications"
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Mobile Sheet Drag Handle */}
            <div className="notification-panel__drag-handle" aria-hidden="true" />

            <div className="notification-panel__header">
              <div className="notification-panel__header-left">
                <h2 className="notification-panel__title">Notifications</h2>
                {unreadCount > 0 && (
                  <span className="notification-panel__badge-pill">
                    <span
                      className="notification-panel__badge-dot"
                      aria-hidden="true"
                    />
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="notification-panel__header-actions">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    className="notification-panel__mark-all"
                    onClick={onMarkAllAsRead}
                  >
                    Mark all read
                  </button>
                )}
                <button
                  type="button"
                  className="notification-panel__close-btn"
                  onClick={onClose}
                  aria-label="Close notifications"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="notification-panel__list">
              {notifications.length === 0 ? (
                <div className="notification-panel__empty">
                  <div className="notification-empty-badge" aria-hidden="true">
                    <svg
                      className="notification-empty-icon"
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                      <path
                        d="M4 3C2.8 4.5 2 6.5 2 9"
                        opacity="0.6"
                        strokeWidth="1.6"
                      />
                      <path
                        d="M20 3c1.2 1.5 2 3.5 2 6"
                        opacity="0.6"
                        strokeWidth="1.6"
                      />
                    </svg>
                  </div>
                  <h3 className="notification-panel__empty-title">
                    All caught up
                  </h3>
                  <p className="notification-panel__empty-hint">
                    No unread notifications right now. You'll be alerted here
                    when tasks need attention.
                  </p>
                  <div className="notification-empty-tag" aria-hidden="true">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Everything is on track</span>
                  </div>
                </div>
              ) : (
                notifications.map((n) => {
                  const meta = getNotificationMeta(n);
                  return (
                    <div
                      key={n.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleItemClick(n)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleItemClick(n);
                        }
                      }}
                      className={`notification-item${n.read ? "" : " notification-item--unread"}`}
                    >
                      <div
                        className={`notification-item__icon-wrap ${meta.badgeClass}`}
                      >
                        {meta.icon}
                      </div>

                      <div className="notification-item__content">
                        <div className="notification-item__header-row">
                          <p className="notification-item__title">{n.title}</p>
                          {!n.read && (
                            <span
                              className="notification-item__unread-indicator"
                              aria-label="Unread"
                              title="Unread"
                            />
                          )}
                        </div>

                        {n.body && (
                          <p className="notification-item__body">{n.body}</p>
                        )}

                        <div className="notification-item__footer">
                          <span className="notification-item__time-pill">
                            {formatTime(n.created_at)}
                          </span>
                          {n.task_id && (
                            <span
                              className="notification-item__jump-hint"
                              aria-hidden="true"
                            >
                              View task →
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="notification-item__actions">
                        {!n.read && (
                          <button
                            type="button"
                            className="notification-item__action notification-item__action--read"
                            onClick={(e) => {
                              e.stopPropagation();
                              onMarkAsRead(n.id);
                            }}
                            aria-label="Mark as read"
                            title="Mark as read"
                          >
                            <svg
                              width="15"
                              height="15"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
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
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(n.id);
                          }}
                          aria-label="Delete notification"
                          title="Delete"
                        >
                          <svg
                            width="15"
                            height="15"
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
                  );
                })
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
