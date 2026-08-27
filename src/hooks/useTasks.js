import { useCallback, useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";
import { localDb } from "../lib/localDb";

// Generate a reasonably-unique id for the local fallback.
function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function seedTasks(userId) {
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
      user_id: userId,
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
      user_id: userId,
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

/**
 * Per-user task store. Talks to Supabase when configured, otherwise falls
 * back to localStorage keyed by user ID. All CRUD + reordering lives here.
 */
export function useTasks(userId) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load tasks when the user changes.
  useEffect(() => {
    let active = true;

    async function load() {
      if (!userId) {
        setTasks([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from("tasks")
          .select("*")
          .eq("user_id", userId)
          .order("order");

        if (!active) return;
        if (error) {
          console.error("[useTasks] Failed to load:", error);
          setTasks([]);
        } else if (data.length === 0) {
          // Seed for first-time users.
          const seed = seedTasks(userId);
          await Promise.all(
            seed.map((t) => supabase.from("tasks").insert(t))
          );
          setTasks(seed);
        } else {
          setTasks(data);
        }
      } else {
        const { data } = await localDb.getTasks(userId);
        if (!active) return;
        if (data.length === 0) {
          const seed = seedTasks(userId);
          for (const t of seed) await localDb.insertTask(userId, t);
          setTasks(seed);
        } else {
          setTasks(data);
        }
      }
      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, [userId]);

  const addTask = useCallback(
    async (data) => {
      if (!userId) return;
      const now = Date.now();
      const newTask = {
        user_id: userId,
        title: data.title.trim(),
        description: (data.description ?? "").trim(),
        dueDate: data.dueDate,
        priority: data.priority,
        status: data.status,
        order: tasks.length,
        createdAt: now,
        updatedAt: now,
      };

      if (isSupabaseConfigured) {
        const { data: inserted, error } = await supabase
          .from("tasks")
          .insert(newTask)
          .select()
          .single();
        if (error) {
          console.error("[useTasks] Insert failed:", error);
          return;
        }
        setTasks((prev) => [...prev, inserted]);
      } else {
        const { data: inserted } = await localDb.insertTask(userId, newTask);
        setTasks((prev) => [...prev, inserted]);
      }
    },
    [userId, tasks.length]
  );

  const updateTask = useCallback(
    async (id, patch) => {
      if (!userId) return;
      const cleanPatch = {
        ...patch,
        title: patch.title != null ? patch.title.trim() : undefined,
        description:
          patch.description != null ? patch.description.trim() : undefined,
        updatedAt: Date.now(),
      };

      // Optimistic update for snappy UI.
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...cleanPatch } : t))
      );

      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from("tasks")
          .update(cleanPatch)
          .eq("id", id);
        if (error) console.error("[useTasks] Update failed:", error);
      } else {
        await localDb.updateTask(userId, id, cleanPatch);
      }
    },
    [userId]
  );

  const deleteTask = useCallback(
    async (id) => {
      if (!userId) return;
      setTasks((prev) => prev.filter((t) => t.id !== id));

      if (isSupabaseConfigured) {
        const { error } = await supabase.from("tasks").delete().eq("id", id);
        if (error) console.error("[useTasks] Delete failed:", error);
      } else {
        await localDb.deleteTask(userId, id);
      }
    },
    [userId]
  );

  const reorderTask = useCallback(
    async (id, toIndex) => {
      if (!userId) return;
      // Optimistic reorder.
      setTasks((prev) => {
        const fromIndex = prev.findIndex((t) => t.id === id);
        if (fromIndex === -1 || fromIndex === toIndex) return prev;
        const next = [...prev];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        return next.map((t, i) => ({ ...t, order: i }));
      });

      if (isSupabaseConfigured) {
        // Renumber on the server.
        const reordered = tasks
          .slice()
          .sort((a, b) => a.order - b.order);
        const fromIndex = reordered.findIndex((t) => t.id === id);
        if (fromIndex === -1) return;
        const [moved] = reordered.splice(fromIndex, 1);
        reordered.splice(toIndex, 0, moved);
        await Promise.all(
          reordered.map((t, i) =>
            supabase.from("tasks").update({ order: i }).eq("id", t.id)
          )
        );
      } else {
        await localDb.reorderTask(userId, id, toIndex);
      }
    },
    [userId, tasks]
  );

  const clearCompleted = useCallback(async () => {
    if (!userId) return;
    setTasks((prev) => prev.filter((t) => t.status !== "done"));

    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("user_id", userId)
        .eq("status", "done");
      if (error) console.error("[useTasks] Clear completed failed:", error);
    } else {
      await localDb.clearCompleted(userId);
    }
  }, [userId]);

  return {
    tasks,
    loading,
    addTask,
    updateTask,
    deleteTask,
    reorderTask,
    clearCompleted,
  };
}
