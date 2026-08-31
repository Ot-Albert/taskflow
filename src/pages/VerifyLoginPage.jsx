import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";

const RESEND_COOLDOWN = 60; // seconds

function maskEmail(email) {
  if (!email) return "";
  const [name, domain] = email.split("@");
  if (!domain) return email;
  const maskedName =
    name.length <= 2
      ? name[0] + "*"
      : name[0] + "*".repeat(Math.min(name.length - 2, 4)) + name[name.length - 1];
  return `${maskedName}@${domain}`;
}

export default function VerifyLoginPage() {
  const { pendingEmail, completeLoginVerification, resendLoginCode, cancelPendingLogin } =
    useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/app";

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Cooldown timer.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // If there's no pending email, redirect to login.
  useEffect(() => {
    if (!pendingEmail) {
      navigate("/login", { replace: true });
    }
  }, [pendingEmail, navigate]);

  const handleVerify = useCallback(
    async (e) => {
      e?.preventDefault();
      setError("");
      const trimmed = code.trim();
      if (!/^\d{6}$/.test(trimmed)) {
        setError("Enter the 6-digit code from your email.");
        return;
      }

      setSubmitting(true);
      const { error: err } = await completeLoginVerification(trimmed);
      setSubmitting(false);

      if (err) {
        setError(err.message || "Verification failed. Check the code and try again.");
      } else {
        navigate(from, { replace: true });
      }
    },
    [code, completeLoginVerification, from, navigate]
  );

  async function handleResend() {
    if (cooldown > 0) return;
    setError("");
    setResending(true);
    const { error: err } = await resendLoginCode();
    setResending(false);
    if (err) {
      setError(err.message || "Could not resend code. Try again shortly.");
    } else {
      setCooldown(RESEND_COOLDOWN);
    }
  }

  async function handleCancel() {
    await cancelPendingLogin();
    navigate("/login", { replace: true });
  }

  // Handle paste of 6-digit code.
  function handleCodeChange(e) {
    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
    setCode(val);
  }

  if (!pendingEmail) return null;

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
        <h1 className="auth-card__title">Enter verification code</h1>
        <p className="auth-card__subtitle">
          We sent a 6-digit code to <strong>{maskEmail(pendingEmail)}</strong>.
          Enter it below to complete sign-in.
        </p>

        {error && <div className="auth-card__error">{error}</div>}

        <form onSubmit={handleVerify} noValidate className="auth-form">
          <div className="field">
            <label htmlFor="code">Verification code</label>
            <input
              id="code"
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={code}
              onChange={handleCodeChange}
              placeholder="000000"
              autoComplete="one-time-code"
              className="verify-code-input"
              aria-invalid={Boolean(error)}
            />
          </div>

          <button
            type="submit"
            className="btn btn--primary btn--large btn--block"
            disabled={submitting || code.length !== 6}
          >
            {submitting ? "Verifying…" : "Verify and continue"}
          </button>
        </form>

        <div className="verify-login__actions">
          <button
            type="button"
            className="btn btn--ghost btn--small"
            onClick={handleResend}
            disabled={resending || cooldown > 0}
          >
            {resending
              ? "Sending…"
              : cooldown > 0
                ? `Resend in ${cooldown}s`
                : "Resend code"}
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--small"
            onClick={handleCancel}
          >
            Back to sign in
          </button>
        </div>
      </motion.div>
    </div>
  );
}
