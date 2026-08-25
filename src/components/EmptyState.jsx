export default function EmptyState({ message, hint }) {
  return (
    <div className="empty-state" role="status">
      <div className="empty-state__icon" aria-hidden="true">
        ✓
      </div>
      <p className="empty-state__title">
        {message ?? "No tasks here yet."}
      </p>
      <p className="empty-state__hint">
        {hint ?? "Add a task to get started."}
      </p>
    </div>
  );
}
