import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabaseClient";
import { useTheme } from "../hooks/useTheme";

export default function ForgotPasswordPage() {
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const emailRef = useRef(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  function validate() {
    const e = {};
    if (!email.trim()) e.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      e.email = "Enter a valid email address.";
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const fieldErrors = validate();
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setSubmitting(true);
    const redirectTo = `${window.location.origin}/reset-password`;
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });
    setSubmitting(false);
    // Always show neutral success to prevent account enumeration.
    setSent(true);
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
        <h1 className="auth-card__title">Reset your password</h1>
        <p className="auth-card__subtitle">
          Enter your email and we'll send you a link to choose a new password.
        </p>

        {sent ? (
          <div className="auth-card__success">
            If an account exists for <strong>{email.trim()}</strong>, a reset
            link has been sent. Check your inbox and spam folder.
          </div>
        ) : (
          <>
            {errors.form && (
              <div className="auth-card__error">{errors.form}</div>
            )}

            <form onSubmit={handleSubmit} noValidate className="auth-form">
              <div className="field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  ref={emailRef}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
                {errors.email && (
                  <p className="field__error" id="email-error">{errors.email}</p>
                )}
              </div>

              <button
                type="submit"
                className="btn btn--primary btn--large btn--block"
                disabled={submitting}
              >
                {submitting ? "Sending…" : "Send reset link"}
              </button>
            </form>
          </>
        )}

        <p className="auth-card__switch">
          Remembered your password?{" "}
          <Link to="/login" className="auth-card__link">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}
