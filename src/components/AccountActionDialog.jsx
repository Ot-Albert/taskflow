import { useState, useEffect, useRef } from "react";
import PasswordField from "./PasswordField";

/**
 * Reusable confirmation dialog for account deactivation and deletion.
 * Deletion requires password + typing DELETE.
 */
export default function AccountActionDialog({
  action = "deactivate",
  onConfirm,
  onCancel,
  saving = false,
}) {
  const isDelete = action === "delete";
  const [password, setPassword] = useState("");
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [error, setError] = useState("");
  const passwordRef = useRef(null);

  useEffect(() => {
    if (isDelete) passwordRef.current?.focus();
  }, [isDelete]);

  function handleConfirm(e) {
    e.preventDefault();
    setError("");

    if (isDelete) {
      if (!password) {
        setError("Enter your current password.");
        return;
      }
      if (confirmPhrase !== "DELETE") {
        setError('Type "DELETE" to confirm.');
        return;
      }
      onConfirm({ password, confirmPhrase });
    } else {
      onConfirm();
    }
  }

  const title = isDelete ? "Delete account permanently?" : "Deactivate account?";
  const message = isDelete
    ? "This permanently removes your account, all tasks, and your profile picture. This action cannot be undone."
    : "Your account will be deactivated. You won't be able to access your tasks until you sign in again and reactivate. Your data is preserved.";

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div
        className="dialog account-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="account-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="account-dialog-title" className="dialog__title">
          {title}
        </h2>
        <p className="dialog__message">{message}</p>

        {error && <div className="auth-card__error">{error}</div>}

        <form onSubmit={handleConfirm} className="account-dialog__form">
          {isDelete && (
            <>
              <PasswordField
                id="delete-password"
                label="Current password"
                value={password}
                onChange={setPassword}
                placeholder="Enter your password"
                autoComplete="current-password"
                autoFocus
              />
              <div className="field">
                <label htmlFor="delete-confirm">
                  Type <strong>DELETE</strong> to confirm
                </label>
                <input
                  id="delete-confirm"
                  type="text"
                  value={confirmPhrase}
                  onChange={(e) => setConfirmPhrase(e.target.value)}
                  placeholder="DELETE"
                  autoComplete="off"
                />
              </div>
            </>
          )}

          <div className="account-dialog__actions">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`btn ${isDelete ? "btn--danger" : "btn--primary"}`}
              disabled={saving}
            >
              {saving
                ? isDelete
                  ? "Deleting…"
                  : "Deactivating…"
                : isDelete
                  ? "Delete permanently"
                  : "Deactivate account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
