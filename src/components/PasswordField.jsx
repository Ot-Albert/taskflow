import { useState, useId } from "react";

/**
 * Reusable password input with accessible show/hide toggle.
 * Used across login, signup, reset-password, and account deletion.
 */
export default function PasswordField({
  id,
  label,
  value,
  onChange,
  error,
  placeholder,
  autoComplete = "current-password",
  autoFocus = false,
  describedById,
}) {
  const [visible, setVisible] = useState(false);
  const reactId = useId();
  const toggleId = `${id || reactId}-toggle`;

  function toggle(e) {
    e.preventDefault();
    setVisible((v) => !v);
  }

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="password-field">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error
              ? describedById || `${id}-error`
              : toggleId
          }
          placeholder={placeholder}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
        />
        <button
          type="button"
          id={toggleId}
          className="password-field__toggle"
          onClick={toggle}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          tabIndex={-1}
        >
          {visible ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
              <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
              <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
              <line x1="2" y1="2" x2="22" y2="22" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
      {error && (
        <p className="field__error" id={describedById || `${id}-error`}>{error}</p>
      )}
    </div>
  );
}
