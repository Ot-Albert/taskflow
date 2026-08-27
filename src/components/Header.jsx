export default function Header({
  theme,
  onToggleTheme,
  onExportJSON,
  onExportCSV,
  taskCount,
  userName,
  onSignOut,
}) {
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
        <div className="export-menu" role="group" aria-label="Export tasks">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={onExportJSON}
            disabled={taskCount === 0}
          >
            Export JSON
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={onExportCSV}
            disabled={taskCount === 0}
          >
            Export CSV
          </button>
        </div>

        {userName && (
          <div className="app-header__user">
            <span className="app-header__user-name" title={userName}>
              {userName}
            </span>
            <button
              type="button"
              className="btn btn--ghost btn--small"
              onClick={onSignOut}
            >
              Sign out
            </button>
          </div>
        )}

        <button
          type="button"
          className="icon-btn theme-toggle"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? "☀" : "☾"}
        </button>
      </div>
    </header>
  );
}
