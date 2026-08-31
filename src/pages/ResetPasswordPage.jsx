import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabaseClient";
import { useTheme } from "../hooks/useTheme";
import PasswordField from "../components/PasswordField";

export default function ResetPasswordPage() {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [recovered, setRecovered] = useState(false);
  const passwordRef = useRef(null);

  useEffect(() => {
    // Detect the PASSWORD_RECOVERY event from Supabase.
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "PASSWORD_RECOVERY") {
          setRecovered(true);
        }
      }
    );

    // Also check current session — the recovery link may have already
    // established a session before this component mounted.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setRecovered(true);
      }
    });

    passwordRef.current?.focus();
    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, []);

  function validate() {
    const e = {};
    if (!password) e.password = "Password is required.";
    else if (password.length < 8) e.password = "Password must be at least 8 characters.";
    if (!confirmPassword) e.confirmPassword = "Please confirm your password.";
    else if (password !== confirmPassword)
      e.confirmPassword = "Passwords do not match.";
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const fieldErrors = validate();
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (error) {
      setErrors({ form: error.message });
      return;
    }

    // Sign out all sessions after password reset.
    await supabase.auth.signOut();
    navigate("/login", {
      replace: true,
      state: { message: "Your password has been reset. Please sign in." },
    });
  }

  if (!recovered) {
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
          <h1 className="auth-card__title">Invalid or expired link</h1>
          <p className="auth-card__subtitle">
            This password reset link is no longer valid. Request a new one.
          </p>
          <p className="auth-card__switch">
            <Link to="/forgot-password" className="auth-card__link">
              Request a new reset link
            </Link>
          </p>
        </motion.div>
      </div>
    );
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
        <h1 className="auth-card__title">Choose a new password</h1>
        <p className="auth-card__subtitle">
          Enter your new password below.
        </p>

        {errors.form && <div className="auth-card__error">{errors.form}</div>}

        <form onSubmit={handleSubmit} noValidate className="auth-form">
          <PasswordField
            id="password"
            label="New password"
            value={password}
            onChange={setPassword}
            error={errors.password}
            placeholder="At least 8 characters"
            autoComplete="new-password"
            autoFocus
          />
          <PasswordField
            id="confirmPassword"
            label="Confirm new password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            error={errors.confirmPassword}
            placeholder="Re-enter your password"
            autoComplete="new-password"
          />
          <button
            type="submit"
            className="btn btn--primary btn--large btn--block"
            disabled={submitting}
          >
            {submitting ? "Updating…" : "Reset password"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
