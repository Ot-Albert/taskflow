import { useCallback, useEffect, useRef, useState } from "react";
import { STORAGE_KEYS } from "../utils/constants";
import { loadJSON, saveJSON } from "../utils/storage";

// Generate a reasonably-unique id without pulling in a uuid dependency.
function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function seedTasks() {
  // A couple of friendly starter tasks so the app isn't empty on first run.
  const now = Date.now();
  const today = new Date();
  const inDays = (n) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  };
  return [
    {
      id: makeId(),
      title: "Welcome to TaskFlow",
      description: "Click a task to edit it, or add a new one above.",
      dueDate: inDays(1),
      priority: "medium",
      status: "todo",
      order: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: makeId(),
      title: "Try filtering by status",
      description: "Use the filter bar to narrow your list.",
      dueDate: inDays(3),
      priority: "low",
      status: "in-progress",
      order: 1,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

// Normalise raw data loaded from storage so missing fields never crash the UI.
function normalise(raw) {
  if (!Array.isArray(raw)) return seedTasks();
  return raw
    .filter((t) => t && typeof t.id === "string" && typeof t.title === "string")
    .map((t, i) => ({
      id: t.id,
      title: t.title,
      description: typeof t.description === "string" ? t.description : "",
      dueDate: typeof t.dueDate === "string" ? t.dueDate : "",
      priority: t.priority ?? "medium",
      status: t.status ?? "todo",
      order: typeof t.order === "number" ? t.order : i,
      createdAt: t.createdAt ?? Date.now(),
      updatedAt: t.updatedAt ?? Date.now(),
    }))
    .sort((a, b) => a.order - b.order);
}

/**
 * Central task store. All CRUD + reordering lives here so components stay thin.
 * Persists to localStorage on every change via an effect.
 */
export function useTasks() {
  const [tasks, setTasks] = useState(() =>
    normalise(loadJSON(STORAGE_KEYS.TASKS, null))
  );
  const firstRun = useRef(true);

  // Persist whenever tasks change (skip the very first run to avoid rewriting
  // the seed data immediately — though it would be harmless if we did).
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      // Still persist seed data so it's stable across reloads.
      saveJSON(STORAGE_KEYS.TASKS, tasks);
      return;
    }
    saveJSON(STORAGE_KEYS.TASKS, tasks);
  }, [tasks]);

  const addTask = useCallback((data) => {
    const now = Date.now();
    setTasks((prev) => {
      const order = prev.length; // new tasks go to the end
      return [
        ...prev,
        {
          id: makeId(),
          title: data.title.trim(),
          description: (data.description ?? "").trim(),
          dueDate: data.dueDate,
          priority: data.priority,
          status: data.status,
          order,
          createdAt: now,
          updatedAt: now,
        },
      ];
    });
  }, []);

  const updateTask = useCallback((id, patch) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              ...patch,
              title: patch.title != null ? patch.title.trim() : t.title,
              description:
                patch.description != null
                  ? patch.description.trim()
                  : t.description,
              updatedAt: Date.now(),
            }
          : t
      )
    );
  }, []);

  const deleteTask = useCallback((id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Move a task to a new index and renumber the `order` field for everyone.
  const reorderTask = useCallback((id, toIndex) => {
    setTasks((prev) => {
      const fromIndex = prev.findIndex((t) => t.id === id);
      if (fromIndex === -1 || fromIndex === toIndex) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next.map((t, i) => ({ ...t, order: i }));
    });
  }, []);

  const clearCompleted = useCallback(() => {
    setTasks((prev) => prev.filter((t) => t.status !== "done"));
  }, []);

  return {
    tasks,
    addTask,
    updateTask,
    deleteTask,
    reorderTask,
    clearCompleted,
  };
}
