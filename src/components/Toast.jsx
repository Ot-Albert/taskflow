export default function Toast({ toast, onDismiss }) {
  if (!toast) return null;
  return (
    <div
      className={`toast toast--${toast.type}`}
      role={toast.type === "error" ? "alert" : "status"}
      aria-live="polite"
      onClick={onDismiss}
    >
      {toast.message}
    </div>
  );
}
