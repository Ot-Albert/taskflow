import {
  PRIORITY_LABELS,
  STATUS_LABELS,
} from "../utils/constants";
import { formatDueDate, isOverdue } from "../utils/date";

// A single task row. Uses native HTML5 drag-and-drop for reordering.
// Keyboard users can move items with the up/down buttons instead.
export default function TaskItem({
  task,
  index,
  total,
  onEdit,
  onDelete,
  onReorder,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onDrop,
  isDragging,
}) {
  const overdue = isOverdue(task.dueDate, task.status);

  return (
    <li
      className={`task ${isDragging ? "task--dragging" : ""}`}
      draggable
      onDragStart={() => onDragStart(task.id)}
      onDragEnter={(e) => onDragEnter(e, task.id)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => onDrop(e, task.id)}
    >
      <div className="task__drag" aria-hidden="true" title="Drag to reorder">
        ⠿
      </div>

      <div className="task__main">
        <div className="task__top">
          <span className={`badge badge--status badge--${task.status}`}>
            {STATUS_LABELS[task.status]}
          </span>
          <span className={`badge badge--priority badge--${task.priority}`}>
            {PRIORITY_LABELS[task.priority]}
          </span>
          {overdue && <span className="badge badge--overdue">Overdue</span>}
        </div>

        <h3 className="task__title">{task.title}</h3>
        {task.description && (
          <p className="task__desc">{task.description}</p>
        )}

        <div className="task__meta">
          <span className={`task__due ${overdue ? "task__due--overdue" : ""}`}>
            Due {formatDueDate(task.dueDate)}
          </span>
        </div>
      </div>

      <div className="task__actions">
        <button
          type="button"
          className="icon-btn"
          onClick={() => onReorder(task.id, index - 1)}
          disabled={index === 0}
          aria-label={`Move "${task.title}" up`}
          title="Move up"
        >
          ↑
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={() => onReorder(task.id, index + 1)}
          disabled={index === total - 1}
          aria-label={`Move "${task.title}" down`}
          title="Move down"
        >
          ↓
        </button>
        <button
          type="button"
          className="btn btn--small"
          onClick={() => onEdit(task)}
        >
          Edit
        </button>
        <button
          type="button"
          className="btn btn--small btn--danger"
          onClick={() => onDelete(task)}
          aria-label={`Delete "${task.title}"`}
        >
          Delete
        </button>
      </div>
    </li>
  );
}
