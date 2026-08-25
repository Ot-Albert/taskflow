import { useState } from "react";
import TaskItem from "./TaskItem";
import EmptyState from "./EmptyState";

export default function TaskList({
  tasks,
  onEdit,
  onDelete,
  onReorder,
}) {
  // Tracked as state (not a ref) so the dragged item re-renders with the
  // .task--dragging style. Cleared on drop / dragend.
  const [draggingId, setDraggingId] = useState(null);

  function handleDragStart(id) {
    setDraggingId(id);
  }
  function handleDragEnter(e, id) {
    e.preventDefault();
    if (id === draggingId) return;
    const from = tasks.findIndex((t) => t.id === draggingId);
    const to = tasks.findIndex((t) => t.id === id);
    if (from === -1 || to === -1) return;
    onReorder(draggingId, to);
  }
  function handleDragEnd() {
    setDraggingId(null);
  }
  function handleDrop(e) {
    e.preventDefault();
    setDraggingId(null);
  }

  if (tasks.length === 0) {
    return <EmptyState />;
  }

  return (
    <ul className="task-list" aria-label="Task list">
      {tasks.map((task, index) => (
        <TaskItem
          key={task.id}
          task={task}
          index={index}
          total={tasks.length}
          onEdit={onEdit}
          onDelete={onDelete}
          onReorder={onReorder}
          onDragStart={handleDragStart}
          onDragEnter={handleDragEnter}
          onDragEnd={handleDragEnd}
          onDrop={handleDrop}
          isDragging={draggingId === task.id}
        />
      ))}
    </ul>
  );
}
