// Local task database fallback — mimics the subset of Supabase's query API
// that useTasks needs. Tasks are stored per-user in localStorage.
// When Supabase is configured, this module is unused and useTasks talks to
// the cloud database directly.

import { loadJSON, saveJSON } from "../utils/storage";

function storageKey(userId) {
  return `taskflow.tasks.${userId}`;
}

function loadTasks(userId) {
  return loadJSON(storageKey(userId), []);
}

function saveTasks(userId, tasks) {
  saveJSON(storageKey(userId), tasks);
}

// Mimics supabase.from("tasks").select("*").eq("user_id", userId).order("order")
export const localDb = {
  async getTasks(userId) {
    const tasks = loadTasks(userId);
    return { data: tasks.sort((a, b) => a.order - b.order), error: null };
  },

  async insertTask(userId, task) {
    const tasks = loadTasks(userId);
    const newTask = { ...task, id: crypto.randomUUID(), user_id: userId };
    tasks.push(newTask);
    saveTasks(userId, tasks);
    return { data: newTask, error: null };
  },

  async updateTask(userId, id, patch) {
    const tasks = loadTasks(userId);
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx === -1) return { data: null, error: { message: "Task not found." } };
    tasks[idx] = { ...tasks[idx], ...patch, updated_at: new Date().toISOString() };
    saveTasks(userId, tasks);
    return { data: tasks[idx], error: null };
  },

  async deleteTask(userId, id) {
    const tasks = loadTasks(userId).filter((t) => t.id !== id);
    saveTasks(userId, tasks);
    return { data: null, error: null };
  },

  // Reorder: move task to a new index and renumber order for all tasks.
  async reorderTask(userId, id, toIndex) {
    const tasks = loadTasks(userId).sort((a, b) => a.order - b.order);
    const fromIndex = tasks.findIndex((t) => t.id === id);
    if (fromIndex === -1 || fromIndex === toIndex) return { data: tasks, error: null };
    const [moved] = tasks.splice(fromIndex, 1);
    tasks.splice(toIndex, 0, moved);
    const renumbered = tasks.map((t, i) => ({ ...t, order: i }));
    saveTasks(userId, renumbered);
    return { data: renumbered, error: null };
  },

  async clearCompleted(userId) {
    const tasks = loadTasks(userId).filter((t) => t.status !== "done");
    saveTasks(userId, tasks);
    return { data: null, error: null };
  },
};
