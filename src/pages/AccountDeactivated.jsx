import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../hooks/useAuth";
import { useProfile } from "../hooks/useProfile";
import { useTheme } from "../hooks/useTheme";
import { useState } from "react";

export default function AccountDeactivated() {
  const { user, signOut } = useAuth();
  const { reactivateAccount, saving } = useProfile(user);
  const { theme, toggleTheme } = useTheme();
  const [error, setError] = useState("");
  const [reactivated, setReactivated] = useState(false);

  async function handleReactivate() {
    setError("");
    const { error: err } = await reactivateAccount();
    if (err) {
      setError(err.message || "Could not reactivate account.");
    } else {
      setReactivated(true);
      // Reload to re-enter the app with active status.
      setTimeout(() => window.location.assign("/app"), 800);
    }
  }

  async function handleSignOut() {
    await signOut();
  }

  return (
    <div className="auth-page">
      <nav className="auth-nav">
        <Link to="/" className="auth-nav__brand">
          <span className="landing__logo" aria-hidden="true">✓</span>
          <span>TaskFlow</span>
        </Link>
        <button
          type="button"
          className="icon-btn theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? "☀" : "☾"}
        </button>
      </nav>

      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="deactivated-icon" aria-hidden="true">⏸</div>
        <h1 className="auth-card__title">Account deactivated</h1>
        <p className="auth-card__subtitle">
          {reactivated
            ? "Account reactivated! Redirecting to your tasks…"
            : "Your account is currently deactivated. Your tasks are preserved. Reactivate to access them again, or sign out."}
        </p>

        {error && <div className="auth-card__error">{error}</div>}

        {!reactivated && (
          <div className="auth-form">
            <button
              type="button"
              className="btn btn--primary btn--large btn--block"
              onClick={handleReactivate}
              disabled={saving}
            >
              {saving ? "Reactivating…" : "Reactivate account"}
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--large btn--block"
              onClick={handleSignOut}
              disabled={saving}
            >
              Sign out
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
