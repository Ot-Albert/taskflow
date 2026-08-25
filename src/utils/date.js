// Date helpers. We keep the canonical task.dueDate as an ISO string (yyyy-mm-dd
// from <input type="date">), and format for display here.

export function formatDueDate(iso) {
  if (!iso) return "—";
  const date = new Date(iso + "T00:00:00");
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Today's date as yyyy-mm-dd in the user's local timezone, for the
// <input type="date"> min attribute and overdue calculations.
export function todayISO() {
  const now = new Date();
  const tzAdjusted = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return tzAdjusted.toISOString().slice(0, 10);
}

export function isOverdue(iso, status) {
  if (!iso) return false;
  return iso < todayISO() && status !== "done";
}
