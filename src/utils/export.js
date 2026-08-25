// Export helpers: trigger a browser download for a given blob.

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportJSON(tasks) {
  const blob = new Blob([JSON.stringify(tasks, null, 2)], {
    type: "application/json",
  });
  download(blob, `taskflow-${Date.now()}.json`);
}

// RFC-4180-ish CSV escaping: wrap fields containing commas, quotes, or
// newlines in double quotes and escape inner quotes by doubling them.
function csvEscape(value) {
  const str = value == null ? "" : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportCSV(tasks, labels) {
  const headers = [
    "id",
    "title",
    "description",
    "dueDate",
    "priority",
    "status",
    "createdAt",
    "updatedAt",
  ];
  const rows = tasks.map((t) =>
    [
      t.id,
      t.title,
      t.description,
      t.dueDate,
      labels.priority[t.priority] ?? t.priority,
      labels.status[t.status] ?? t.status,
      t.createdAt,
      t.updatedAt,
    ]
      .map(csvEscape)
      .join(",")
  );
  const csv = [headers.join(","), ...rows].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  download(blob, `taskflow-${Date.now()}.csv`);
}
