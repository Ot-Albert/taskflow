import { PRIORITIES, STATUSES } from "./constants";

// Pure validation helpers. Each returns an error string or null when valid.
// Keeping these pure makes them trivial to unit-test and reuse.

export function validateTitle(value) {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "Title is required.";
  if (trimmed.length > 120) return "Title must be 120 characters or fewer.";
  return null;
}

export function validateDescription(value) {
  if ((value ?? "").length > 1000)
    return "Description must be 1000 characters or fewer.";
  return null;
}

export function validateDueDate(value) {
  if (!value) return "Due date is required.";
  const input = new Date(value);
  if (Number.isNaN(input.getTime())) return "Please choose a valid date.";
  return null;
}

export function validatePriority(value) {
  if (!Object.values(PRIORITIES).includes(value))
    return "Please select a priority.";
  return null;
}

export function validateStatus(value) {
  if (!Object.values(STATUSES).includes(value))
    return "Please select a status.";
  return null;
}

// Run all validators against a form payload and return a { field: message } map.
// An empty object means the form is valid.
export function validateTask(form) {
  return {
    title: validateTitle(form.title),
    description: validateDescription(form.description),
    dueDate: validateDueDate(form.dueDate),
    priority: validatePriority(form.priority),
    status: validateStatus(form.status),
  };
}

export function isFormValid(errors) {
  return Object.values(errors).every((e) => e == null);
}
