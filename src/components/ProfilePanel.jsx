import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Braces,
  Check,
  ChevronRight,
  Download,
  LogOut,
  MonitorSmartphone,
  Moon,
  Pause,
  Pencil,
  Shield,
  SlidersHorizontal,
  Sun,
  Table,
  Trash2,
  User,
  X,
} from "lucide-react";
import ProfileAvatar from "./ProfileAvatar";
import AccountActionDialog from "./AccountActionDialog";

const REMINDER_OPTIONS = [
  { value: 60, label: "1 hour before" },
  { value: 1440, label: "1 day before" },
  { value: 4320, label: "3 days before" },
  { value: 10080, label: "1 week before" },
];

const THEME_OPTIONS = [
  { value: "system", label: "System", Icon: MonitorSmartphone },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
];

const SUITE_TABS = [
  { id: "overview", label: "Overview", Icon: User },
  { id: "preferences", label: "Preferences", Icon: SlidersHorizontal },
  { id: "data", label: "Data & export", Icon: Download },
  { id: "account", label: "Account", Icon: Shield },
];

const SUITE_HEADINGS = {
  overview: ["Overview", "Your activity at a glance."],
  preferences: ["Preferences", "Appearance and reminder settings."],
  data: ["Data & export", "Download your tasks — your data is yours."],
  account: ["Account", "Your identity and account controls."],
};

function reminderLabel(offset) {
  return (
    REMINDER_OPTIONS.find((o) => o.value === offset)?.label ?? "1 day before"
  );
}

/**
 * Profile panel — "Quiet Luxury" bottom sheet on mobile (≤600px),
 * "Executive Suite" two-pane modal with real tabs on tablet/desktop.
 * Both layouts render; CSS shows the right one. Transient state lives in the
 * children so it resets whenever the panel closes.
 */
export default function ProfilePanel({
  open,
  onClose,
  user,
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
  themePreference,
  onChangeThemePreference,
  onExportJSON,
  onExportCSV,
  stats,
  memberSince,
  reminderOffset,
  onUpdateReminderOffset,
}) {
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const panelRef = useRef(null);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // Close on outside click/touch (covers the mobile sheet; the desktop
  // overlay handles its own backdrop clicks).
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

  async function handleDeactivate() {
    await onDeactivate();
    setShowDeactivate(false);
  }

  async function handleDelete({ password, confirmPhrase }) {
    await onDelete(password, confirmPhrase);
    setShowDelete(false);
  }

  const shared = {
    onClose,
    user,
    fullName,
    initials,
    avatarUrl,
    saving,
    stats,
    memberSince,
    reminderOffset,
    onUpdateReminderOffset,
    themePreference,
    onChangeThemePreference,
    onExportJSON,
    onExportCSV,
    onSignOut,
    onUpdateName,
    onUploadAvatar,
    onRemoveAvatar,
    onDeactivate: () => setShowDeactivate(true),
    onDelete: () => setShowDelete(true),
  };

  return (
    <>
      {/* Backdrop: dims the app behind the mobile sheet, sits beneath the
          centered modal overlay on larger screens. */}
      <div className="profile-backdrop" onClick={onClose} />

      <div
        ref={panelRef}
        className="profile-panel--sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Profile and settings"
      >
        <SheetContent {...shared} />
      </div>

      <div className="profile-overlay" onClick={onClose} role="presentation">
        <div
          className="profile-panel--modal"
          role="dialog"
          aria-modal="true"
          aria-label="Profile and settings"
          onClick={(e) => e.stopPropagation()}
        >
          <SuiteContent {...shared} />
        </div>
      </div>

      {showDeactivate && (
        <AccountActionDialog
          action="deactivate"
          onConfirm={handleDeactivate}
          onCancel={() => setShowDeactivate(false)}
          saving={saving}
        />
      )}

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

/* ---------- Shared bits ---------- */

function ThemeSegment({ value, onChange }) {
  return (
    <div className="profile-seg" role="group" aria-label="Theme">
      {THEME_OPTIONS.map(({ value: v, label, Icon }) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
        >
          <Icon size={13} />
          {label}
        </button>
      ))}
    </div>
  );
}

function EditableName({ fullName, saving, onUpdateName }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(fullName);

  async function save() {
    const trimmed = value.trim();
    if (!trimmed || trimmed === fullName) {
      setEditing(false);
      return;
    }
    await onUpdateName(trimmed);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="profile-panel__name-edit">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
          autoFocus
          className="profile-panel__name-input"
          placeholder="Your name"
        />
        <button
          type="button"
          className="btn btn--primary btn--small"
          onClick={save}
          disabled={saving}
        >
          Save
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="profile-panel__name-display"
      onClick={() => {
        setValue(fullName);
        setEditing(true);
      }}
      title="Click to edit name"
    >
      <span className="profile-panel__name">{fullName || "Unnamed"}</span>
      <Pencil className="profile-panel__edit-icon" size={13} aria-hidden="true" />
    </button>
  );
}

function DangerZone({ onDeactivate, onDelete, saving }) {
  return (
    <div className="profile-danger-card">
      <div>
        <b>Danger zone</b>
        <small>Deactivate to pause your account, or delete it permanently.</small>
      </div>
      <div className="profile-danger-card__actions">
        <button type="button" onClick={onDeactivate} disabled={saving}>
          Deactivate
        </button>
        <button
          type="button"
          className="profile-danger-card__delete"
          onClick={onDelete}
          disabled={saving}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

/* ---------- Mobile: Quiet Luxury sheet ---------- */

function SheetContent({
  user,
  fullName,
  initials,
  avatarUrl,
  saving,
  stats,
  reminderOffset,
  onUpdateReminderOffset,
  themePreference,
  onChangeThemePreference,
  onExportJSON,
  onExportCSV,
  onSignOut,
  onUpdateName,
  onUploadAvatar,
  onRemoveAvatar,
  onDeactivate,
  onDelete,
}) {
  const [remindersExpanded, setRemindersExpanded] = useState(false);

  return (
    <>
      {/* Identity */}
      <div className="profile-sheet__head">
        <ProfileAvatar
          avatarUrl={avatarUrl}
          initials={initials}
          fullName={fullName}
          editable
          onUpload={onUploadAvatar}
          onRemove={onRemoveAvatar}
          size="lg"
          saving={saving}
          className="profile-panel__avatar"
        />
        <div className="profile-sheet__who">
          <EditableName
            fullName={fullName}
            saving={saving}
            onUpdateName={onUpdateName}
          />
          <p className="profile-panel__email">{user?.email}</p>
          <p className="profile-meta-pill">
            <i />
            {stats?.open ?? 0} open task{stats?.open === 1 ? "" : "s"}
            {stats?.dueSoon > 0 && ` · ${stats.dueSoon} due this week`}
          </p>
        </div>
      </div>

      {/* Data */}
      <div className="profile-panel__group">
        <p className="profile-panel__label">Data</p>
        <button
          type="button"
          className="profile-panel__row"
          onClick={onExportJSON}
          disabled={!stats || stats.total === 0}
        >
          <Braces size={18} />
          <b>Export as JSON</b>
          <ChevronRight className="profile-panel__row-chev" size={16} />
        </button>
        <button
          type="button"
          className="profile-panel__row"
          onClick={onExportCSV}
          disabled={!stats || stats.total === 0}
        >
          <Table size={18} />
          <b>Export as CSV</b>
          <ChevronRight className="profile-panel__row-chev" size={16} />
        </button>
      </div>

      {/* Preferences */}
      <div className="profile-panel__group">
        <p className="profile-panel__label">Preferences</p>
        <div className="profile-panel__segwrap">
          <span>Theme</span>
          <ThemeSegment
            value={themePreference}
            onChange={onChangeThemePreference}
          />
        </div>
        <button
          type="button"
          className="profile-panel__row"
          onClick={() => setRemindersExpanded((v) => !v)}
          aria-expanded={remindersExpanded}
        >
          <Bell size={18} />
          <b>Remind me</b>
          <span className="profile-panel__row-value">
            {reminderLabel(reminderOffset)}
          </span>
          <ChevronRight className="profile-panel__row-chev" size={16} />
        </button>
        {remindersExpanded && (
          <div className="profile-panel__options">
            {REMINDER_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                className="profile-panel__option"
                aria-pressed={reminderOffset === o.value}
                disabled={saving}
                onClick={() => onUpdateReminderOffset(o.value)}
              >
                <b>{o.label}</b>
                {reminderOffset === o.value && <Check size={15} />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Account */}
      <div className="profile-panel__group">
        <p className="profile-panel__label">Account</p>
        <button
          type="button"
          className="profile-panel__row"
          onClick={onDeactivate}
          disabled={saving}
        >
          <Pause size={18} />
          <b>Deactivate account</b>
          <ChevronRight className="profile-panel__row-chev" size={16} />
        </button>
        <button
          type="button"
          className="profile-panel__row profile-panel__row--danger"
          onClick={onDelete}
          disabled={saving}
        >
          <Trash2 size={18} />
          <b>Delete account</b>
        </button>
      </div>

      <div className="profile-panel__foot">
        <button
          type="button"
          className="profile-panel__row"
          onClick={onSignOut}
        >
          <LogOut size={18} />
          <b>Sign out</b>
        </button>
      </div>
    </>
  );
}

/* ---------- Tablet / desktop: Executive Suite modal ---------- */

function SuiteContent(props) {
  const {
    fullName,
    initials,
    avatarUrl,
    saving,
    memberSince,
    onSignOut,
    onUpdateName,
    onUploadAvatar,
    onRemoveAvatar,
    onClose,
  } = props;
  const [activeTab, setActiveTab] = useState("overview");
  const [heading, subheading] = SUITE_HEADINGS[activeTab];

  return (
    <>
      <aside className="profile-modal__side">
        <div className="profile-modal__idc">
          <ProfileAvatar
            avatarUrl={avatarUrl}
            initials={initials}
            fullName={fullName}
            editable
            onUpload={onUploadAvatar}
            onRemove={onRemoveAvatar}
            size="lg"
            saving={saving}
            className="profile-panel__avatar"
          />
          <EditableName
            fullName={fullName}
            saving={saving}
            onUpdateName={onUpdateName}
          />
          <p className="profile-panel__email">{props.user?.email}</p>
          {memberSince && (
            <p className="profile-modal__since">Member since {memberSince}</p>
          )}
        </div>
        <nav className="profile-modal__nav" aria-label="Settings sections">
          {SUITE_TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              aria-current={activeTab === id}
              onClick={() => setActiveTab(id)}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </nav>
        <button
          type="button"
          className="profile-modal__signout"
          onClick={onSignOut}
        >
          <LogOut size={15} />
          Sign out
        </button>
      </aside>

      <section className="profile-modal__main">
        <div className="profile-modal__top">
          <div>
            <h3>{heading}</h3>
            <p>{subheading}</p>
          </div>
          <button
            type="button"
            className="profile-close"
            aria-label="Close profile"
            onClick={onClose}
          >
            <X size={14} />
          </button>
        </div>

        {activeTab === "overview" && (
          <OverviewTab {...props} setActiveTab={setActiveTab} />
        )}
        {activeTab === "preferences" && <PreferencesTab {...props} />}
        {activeTab === "data" && <DataTab {...props} />}
        {activeTab === "account" && <AccountTab {...props} />}
      </section>
    </>
  );
}

function OverviewTab({
  stats,
  setActiveTab,
  themePreference,
  reminderOffset,
}) {
  const items = [
    { label: "Open", value: stats?.open ?? 0 },
    { label: "Completed", value: stats?.completed ?? 0 },
    { label: "Overdue", value: stats?.overdue ?? 0 },
    { label: "Due this week", value: stats?.dueSoon ?? 0 },
  ];
  const themeLabel =
    THEME_OPTIONS.find((o) => o.value === themePreference)?.label ?? "System";

  return (
    <>
      <div className="profile-modal__stats">
        {items.map((s) => (
          <div key={s.label} className="profile-stat">
            <b>{s.value}</b>
            <span>{s.label}</span>
          </div>
        ))}
      </div>
      <div className="profile-modal__sec">
        <h4>Quick settings</h4>
        <div className="profile-card">
          <button
            type="button"
            className="profile-panel__row profile-card__row"
            onClick={() => setActiveTab("preferences")}
          >
            <Moon size={17} />
            <b>Theme</b>
            <span className="profile-panel__row-value">{themeLabel}</span>
            <ChevronRight className="profile-panel__row-chev" size={15} />
          </button>
          <button
            type="button"
            className="profile-panel__row profile-card__row"
            onClick={() => setActiveTab("preferences")}
          >
            <Bell size={17} />
            <b>Remind me</b>
            <span className="profile-panel__row-value">
              {reminderLabel(reminderOffset)}
            </span>
            <ChevronRight className="profile-panel__row-chev" size={15} />
          </button>
        </div>
      </div>
    </>
  );
}

function PreferencesTab({
  themePreference,
  onChangeThemePreference,
  reminderOffset,
  onUpdateReminderOffset,
  saving,
}) {
  return (
    <>
      <div className="profile-modal__sec">
        <h4>Appearance</h4>
        <div className="profile-card">
          <div className="profile-pref">
            <div>
              <b>Theme</b>
              <small>Follow your device, or pin a look.</small>
            </div>
            <ThemeSegment
              value={themePreference}
              onChange={onChangeThemePreference}
            />
          </div>
        </div>
      </div>
      <div className="profile-modal__sec">
        <h4>Reminders</h4>
        <div className="profile-card">
          <div className="profile-pref">
            <div>
              <b>Reminder lead time</b>
              <small>How long before a due date we nudge you.</small>
            </div>
            <select
              className="profile-panel__select profile-panel__select--auto"
              value={reminderOffset ?? 1440}
              onChange={(e) => onUpdateReminderOffset(Number(e.target.value))}
              disabled={saving}
              aria-label="Reminder lead time"
            >
              {REMINDER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </>
  );
}

function DataTab({ onExportJSON, onExportCSV, stats }) {
  const disabled = !stats || stats.total === 0;
  return (
    <div className="profile-modal__sec">
      <h4>Export your tasks</h4>
      <div className="profile-tiles">
        <button
          type="button"
          className="profile-tile"
          onClick={onExportJSON}
          disabled={disabled}
        >
          <Braces size={18} />
          <b>JSON</b>
          <small>Full fidelity</small>
        </button>
        <button
          type="button"
          className="profile-tile"
          onClick={onExportCSV}
          disabled={disabled}
        >
          <Table size={18} />
          <b>CSV</b>
          <small>Spreadsheets</small>
        </button>
      </div>
      <p className="profile-modal__hint">
        {stats?.total ?? 0} task{stats?.total === 1 ? "" : "s"} will be included.
      </p>
    </div>
  );
}

function AccountTab({ user, onSignOut, onDeactivate, onDelete, saving }) {
  return (
    <>
      <div className="profile-modal__sec">
        <h4>Session</h4>
        <div className="profile-card">
          <button
            type="button"
            className="profile-panel__row profile-card__row"
            onClick={onSignOut}
          >
            <LogOut size={17} />
            <b>Sign out of this device</b>
            <ChevronRight className="profile-panel__row-chev" size={15} />
          </button>
        </div>
        <p className="profile-modal__hint">
          Signed in as {user?.email}. Edit your name or photo in the sidebar.
        </p>
      </div>
      <div className="profile-modal__sec">
        <h4>Danger zone</h4>
        <DangerZone
          onDeactivate={onDeactivate}
          onDelete={onDelete}
          saving={saving}
        />
      </div>
    </>
  );
}
