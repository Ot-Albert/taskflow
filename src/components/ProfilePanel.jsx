import { useState, useEffect, useRef } from "react";
import ProfileAvatar from "./ProfileAvatar";

/**
 * Profile panel — popover on desktop, bottom sheet on mobile.
 * Contains avatar, name editing, exports, theme toggle, sign out,
 * and account management (deactivate / delete).
 */
export default function ProfilePanel({
  open,
  onClose,
  user,
  profile,
  fullName,
  initials,
  avatarUrl,
  saving,
  onUpdateName,
  onUploadAvatar,
  onRemoveAvatar,
  onDeactivate,
  onDelete,
  onSignOut,
  theme,
  onToggleTheme,
  onExportJSON,
  onExportCSV,
  taskCount,
  reminderOffset,
  onUpdateReminderOffset,
}) {
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(fullName);
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const panelRef = useRef(null);

  // Sync name value when profile changes.
  useEffect(() => {
    setNameValue(fullName);
  }, [fullName]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // Close on outside click/touch (desktop and mobile).
  // Use pointerdown so it works for mouse, touch, and pen.
  useEffect(() => {
    if (!open) return;

    function handlePointer(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose();
      }
    }

    // Defer slightly to avoid capturing the same event that opened the panel.
    const timer = setTimeout(() => {
      document.addEventListener("pointerdown", handlePointer);
    }, 50);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("pointerdown", handlePointer);
    };
  }, [open, onClose]);

  if (!open) return null;

  async function handleSaveName() {
    const trimmed = nameValue.trim();
    if (!trimmed || trimmed === fullName) {
      setEditingName(false);
      return;
    }
    await onUpdateName(trimmed);
    setEditingName(false);
  }

  async function handleDeactivate() {
    await onDeactivate();
    setShowDeactivate(false);
  }

  async function handleDelete({ password, confirmPhrase }) {
    await onDelete(password, confirmPhrase);
    setShowDelete(false);
  }

  return (
    <>
      {/* Mobile backdrop */}
      <div className="profile-backdrop" onClick={onClose} />

      <div
        ref={panelRef}
        className="profile-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Profile and settings"
      >
        {/* Header section with avatar and name */}
        <div className="profile-panel__header">
          <ProfileAvatar
            avatarUrl={avatarUrl}
            initials={initials}
            fullName={fullName}
            editable
            onUpload={onUploadAvatar}
            onRemove={onRemoveAvatar}
            size="lg"
            saving={saving}
          />
          <div className="profile-panel__name-section">
            {editingName ? (
              <div className="profile-panel__name-edit">
                <input
                  type="text"
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName();
                    if (e.key === "Escape") setEditingName(false);
                  }}
                  autoFocus
                  className="profile-panel__name-input"
                  placeholder="Your name"
                />
                <button
                  type="button"
                  className="btn btn--primary btn--small"
                  onClick={handleSaveName}
                  disabled={saving}
                >
                  Save
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="profile-panel__name-display"
                onClick={() => setEditingName(true)}
                title="Click to edit name"
              >
                <span className="profile-panel__name">{fullName || "Unnamed"}</span>
                <span className="profile-panel__edit-icon" aria-hidden="true">
                  ✎
                </span>
              </button>
            )}
            <p className="profile-panel__email">{user?.email}</p>
            <p className="profile-panel__task-count">
              {taskCount} task{taskCount === 1 ? "" : "s"} tracked
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="profile-panel__section">
          <button
            type="button"
            className="profile-panel__item"
            onClick={onExportJSON}
            disabled={taskCount === 0}
          >
            <span className="profile-panel__item-icon" aria-hidden="true">↓</span>
            <span>Export JSON</span>
          </button>
          <button
            type="button"
            className="profile-panel__item"
            onClick={onExportCSV}
            disabled={taskCount === 0}
          >
            <span className="profile-panel__item-icon" aria-hidden="true">↓</span>
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            className="profile-panel__item"
            onClick={onToggleTheme}
          >
            <span className="profile-panel__item-icon" aria-hidden="true">
              {theme === "dark" ? "☀" : "☾"}
            </span>
            <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
          </button>
          <button
            type="button"
            className="profile-panel__item"
            onClick={onSignOut}
          >
            <span className="profile-panel__item-icon" aria-hidden="true">⏻</span>
            <span>Sign out</span>
          </button>
        </div>

        {/* Reminder preferences */}
        <div className="profile-panel__section">
          <p className="profile-panel__section-label">Reminders</p>
          <div className="profile-panel__reminder-setting">
            <label htmlFor="reminder-offset" className="profile-panel__reminder-label">
              Notify me before due date
            </label>
            <select
              id="reminder-offset"
              className="profile-panel__select"
              value={reminderOffset ?? 1440}
              onChange={(e) => onUpdateReminderOffset(Number(e.target.value))}
              disabled={saving}
            >
              <option value={60}>1 hour before</option>
              <option value={1440}>1 day before</option>
              <option value={4320}>3 days before</option>
              <option value={10080}>1 week before</option>
            </select>
          </div>
        </div>

        {/* Danger zone */}
        <div className="profile-panel__section profile-panel__danger">
          <p className="profile-panel__danger-label">Account</p>
          <button
            type="button"
            className="profile-panel__item profile-panel__item--danger"
            onClick={() => setShowDeactivate(true)}
            disabled={saving}
          >
            <span className="profile-panel__item-icon" aria-hidden="true">⏸</span>
            <span>Deactivate account</span>
          </button>
          <button
            type="button"
            className="profile-panel__item profile-panel__item--danger"
            onClick={() => setShowDelete(true)}
            disabled={saving}
          >
            <span className="profile-panel__item-icon" aria-hidden="true">✕</span>
            <span>Delete account</span>
          </button>
        </div>
      </div>

      {/* Deactivate dialog */}
      {showDeactivate && (
        <AccountActionDialog
          action="deactivate"
          onConfirm={handleDeactivate}
          onCancel={() => setShowDeactivate(false)}
          saving={saving}
        />
      )}

      {/* Delete dialog */}
      {showDelete && (
        <AccountActionDialog
          action="delete"
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
          saving={saving}
        />
      )}
    </>
  );
}

// Import here to avoid circular dependency issues at top level.
import AccountActionDialog from "./AccountActionDialog";
