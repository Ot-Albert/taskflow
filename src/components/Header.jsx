import { useState, useRef } from "react";
import ProfileAvatar from "./ProfileAvatar";
import NotificationBell from "./NotificationBell";
import NotificationPanel from "./NotificationPanel";

export default function Header({
  taskCount,
  fullName,
  initials,
  avatarUrl,
  onOpenProfile,
  profileSaving,
  profileOpen,
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
}) {
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  return (
    <header className="app-header">
      <div className="app-header__brand">
        <span className="app-header__logo" aria-hidden="true">✓</span>
        <div>
          <h1 className="app-header__title">TaskFlow</h1>
          <p className="app-header__subtitle">
            {taskCount === 0
              ? "Your personal task manager"
              : `${taskCount} task${taskCount === 1 ? "" : "s"} tracked`}
          </p>
        </div>
      </div>

      <div className="app-header__actions">
        <div className="notification-wrapper" ref={notifRef}>
          <NotificationBell
            unreadCount={unreadCount}
            onToggle={() => setNotifOpen((v) => !v)}
            open={notifOpen}
            containerRef={notifRef}
          />
          <NotificationPanel
            open={notifOpen}
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkAsRead={onMarkAsRead}
            onMarkAllAsRead={onMarkAllAsRead}
            onDelete={onDeleteNotification}
            onClose={() => setNotifOpen(false)}
          />
        </div>
        <ProfileAvatar
          avatarUrl={avatarUrl}
          initials={initials}
          fullName={fullName}
          onClick={onOpenProfile}
          size="sm"
          saving={profileSaving}
          aria-label="Open profile and settings"
          aria-expanded={profileOpen}
          aria-haspopup="dialog"
        />
      </div>
    </header>
  );
}
