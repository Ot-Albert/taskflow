import ProfileAvatar from "./ProfileAvatar";

export default function Header({ taskCount, fullName, initials, avatarUrl, onOpenProfile, profileSaving }) {
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
        <button
          type="button"
          className="app-header__profile-trigger"
          onClick={onOpenProfile}
          aria-label="Open profile and settings"
          aria-haspopup="dialog"
          aria-expanded={false}
        >
          <ProfileAvatar
            avatarUrl={avatarUrl}
            initials={initials}
            fullName={fullName}
            size="sm"
            saving={profileSaving}
          />
        </button>
      </div>
    </header>
  );
}
