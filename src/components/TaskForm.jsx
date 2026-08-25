import { useEffect, useRef, useState } from "react";
import {
  PRIORITIES,
  STATUSES,
  PRIORITY_LABELS,
  STATUS_LABELS,
} from "../utils/constants";
import { validateTask, isFormValid } from "../utils/validation";

const EMPTY_FORM = {
  title: "",
  description: "",
  dueDate: "",
  priority: PRIORITIES.MEDIUM,
  status: STATUSES.TODO,
};

// One form component handles both create and edit. When `task` is provided we
// treat it as an edit; otherwise we start from an empty form.
export default function TaskForm({ task, onSave, onClose }) {
  const isEdit = Boolean(task);
  const [form, setForm] = useState(
    task
      ? {
          title: task.title,
          description: task.description,
          dueDate: task.dueDate,
          priority: task.priority,
          status: task.status,
        }
      : EMPTY_FORM
  );
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const titleRef = useRef(null);

  // Focus the title on open for fast entry + keyboard accessibility.
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function updateField(name, value) {
    setForm((f) => {
      const next = { ...f, [name]: value };
      // Re-validate just the changed field for instant feedback.
      const fieldErrors = validateTask(next);
      setErrors(fieldErrors);
      return next;
    });
  }

  function handleBlur(name) {
    setTouched((t) => ({ ...t, [name]: true }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const fieldErrors = validateTask(form);
    setErrors(fieldErrors);
    setTouched({
      title: true,
      description: true,
      dueDate: true,
      priority: true,
      status: true,
    });
    if (!isFormValid(fieldErrors)) return;
    onSave(form);
  }

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="form-title"
    >
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal__header">
          <h2 id="form-title">{isEdit ? "Edit task" : "New task"}</h2>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Close form"
          >
            ×
          </button>
        </header>

        <form className="task-form" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="title">Title</label>
            <input
              id="title"
              ref={titleRef}
              type="text"
              value={form.title}
              maxLength={120}
              onChange={(e) => updateField("title", e.target.value)}
              onBlur={() => handleBlur("title")}
              aria-invalid={Boolean(touched.title && errors.title)}
              aria-describedby={errors.title ? "title-error" : undefined}
              placeholder="What needs doing?"
            />
            {touched.title && errors.title && (
              <p className="field__error" id="title-error">
                {errors.title}
              </p>
            )}
          </div>

          <div className="field">
            <label htmlFor="description">
              Description <span className="field__optional">(optional)</span>
            </label>
            <textarea
              id="description"
              value={form.description}
              maxLength={1000}
              rows={3}
              onChange={(e) => updateField("description", e.target.value)}
              onBlur={() => handleBlur("description")}
              aria-invalid={Boolean(touched.description && errors.description)}
              aria-describedby={
                errors.description ? "description-error" : undefined
              }
              placeholder="Add any extra detail…"
            />
            {touched.description && errors.description && (
              <p className="field__error" id="description-error">
                {errors.description}
              </p>
            )}
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="dueDate">Due date</label>
              <input
                id="dueDate"
                type="date"
                value={form.dueDate}
                onChange={(e) => updateField("dueDate", e.target.value)}
                onBlur={() => handleBlur("dueDate")}
                aria-invalid={Boolean(touched.dueDate && errors.dueDate)}
                aria-describedby={errors.dueDate ? "dueDate-error" : undefined}
              />
              {touched.dueDate && errors.dueDate && (
                <p className="field__error" id="dueDate-error">
                  {errors.dueDate}
                </p>
              )}
            </div>

            <div className="field">
              <label htmlFor="priority">Priority</label>
              <select
                id="priority"
                value={form.priority}
                onChange={(e) => updateField("priority", e.target.value)}
                onBlur={() => handleBlur("priority")}
              >
                {Object.values(PRIORITIES).map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABELS[p]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              value={form.status}
              onChange={(e) => updateField("status", e.target.value)}
              onBlur={() => handleBlur("status")}
            >
              {Object.values(STATUSES).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>

          <footer className="task-form__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary">
              {isEdit ? "Save changes" : "Add task"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
