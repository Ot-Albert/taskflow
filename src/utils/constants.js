// Centralised enums and labels so the rest of the app never hard-codes strings.

export const PRIORITIES = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
};

export const STATUSES = {
  TODO: "todo",
  IN_PROGRESS: "in-progress",
  DONE: "done",
};

export const PRIORITY_LABELS = {
  [PRIORITIES.LOW]: "Low",
  [PRIORITIES.MEDIUM]: "Medium",
  [PRIORITIES.HIGH]: "High",
};

export const STATUS_LABELS = {
  [STATUSES.TODO]: "To Do",
  [STATUSES.IN_PROGRESS]: "In Progress",
  [STATUSES.DONE]: "Done",
};

// Used for sorting: higher number = higher priority.
export const PRIORITY_RANK = {
  [PRIORITIES.HIGH]: 3,
  [PRIORITIES.MEDIUM]: 2,
  [PRIORITIES.LOW]: 1,
};

export const SORT_OPTIONS = {
  DUE_DATE: "dueDate",
  PRIORITY: "priority",
  CREATED: "created",
};

export const STORAGE_KEYS = {
  TASKS: "taskflow.tasks.v1",
  THEME: "taskflow.theme.v1",
};
