import { useCallback, useMemo, useState } from "react";
import Header from "../components/Header";
import FilterBar from "../components/FilterBar";
import TaskList from "../components/TaskList";
import TaskForm from "../components/TaskForm";
import ConfirmDialog from "../components/ConfirmDialog";
import Toast from "../components/Toast";
import { useTasks } from "../hooks/useTasks";
import { useTheme } from "../hooks/useTheme";
import { useToast } from "../hooks/useToast";
import { useAuth } from "../hooks/useAuth";
import { PRIORITY_RANK, SORT_OPTIONS } from "../utils/constants";
import { exportCSV, exportJSON } from "../utils/export";
import "../App.css";

const DEFAULT_FILTERS = { status: "all", priority: "all" };

export default function TaskApp() {
  const { user, signOut } = useAuth();
  const userId = user?.id;
  const { tasks, loading, addTask, updateTask, deleteTask, reorderTask, clearCompleted } =
    useTasks(userId);
  const { theme, toggleTheme } = useTheme();
  const { toast, show, dismiss } = useToast();

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sort, setSort] = useState(SORT_OPTIONS.DUE_DATE);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  const handleFilterChange = useCallback((patch) => {
    setFilters((current) => ({ ...current, ...patch }));
  }, []);

  const visibleTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = tasks.filter((t) => {
      if (filters.status !== "all" && t.status !== filters.status) return false;
      if (filters.priority !== "all" && t.priority !== filters.priority)
        return false;
      if (q) {
        const haystack = `${t.title} ${t.description}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      switch (sort) {
        case SORT_OPTIONS.PRIORITY:
          if (PRIORITY_RANK[b.priority] !== PRIORITY_RANK[a.priority])
            return PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
          return (a.dueDate || "9999").localeCompare(b.dueDate || "9999");
        case SORT_OPTIONS.CREATED:
          return b.createdAt - a.createdAt;
        case SORT_OPTIONS.DUE_DATE:
        default:
          return (a.dueDate || "9999").localeCompare(b.dueDate || "9999");
      }
    });
  }, [tasks, filters, sort, search]);

  function openNewForm() {
    setEditingTask(null);
    setFormOpen(true);
  }
  function openEditForm(task) {
    setEditingTask(task);
    setFormOpen(true);
  }
  function closeForm() {
    setFormOpen(false);
    setEditingTask(null);
  }

  async function handleSave(data) {
    if (editingTask) {
      await updateTask(editingTask.id, data);
      show("Task updated.", "success");
    } else {
      await addTask(data);
      show("Task added.", "success");
    }
    closeForm();
  }

  function handleDelete(task) {
    setPendingDelete(task);
  }
  async function confirmDelete() {
    if (pendingDelete) {
      await deleteTask(pendingDelete.id);
      show("Task deleted.", "success");
    }
    setPendingDelete(null);
  }

  function handleExportJSON() {
    if (tasks.length === 0) return;
    exportJSON(tasks);
    show("Exported JSON.", "success");
  }
  function handleExportCSV() {
    if (tasks.length === 0) return;
    exportCSV(tasks, {
      priority: { low: "Low", medium: "Medium", high: "High" },
      status: { todo: "To Do", "in-progress": "In Progress", done: "Done" },
    });
    show("Exported CSV.", "success");
  }

  function handleClearFilters() {
    setFilters(DEFAULT_FILTERS);
    setSearch("");
  }

  async function handleSignOut() {
    await signOut();
  }

  const hasCompleted = tasks.some((t) => t.status === "done");
  const userName = user?.user_metadata?.full_name || user?.fullName || user?.email;

  if (loading) {
    return (
      <div className="route-loading">
        <div className="route-loading__spinner" aria-label="Loading tasks" />
      </div>
    );
  }

  return (
    <div className="app">
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        onExportJSON={handleExportJSON}
        onExportCSV={handleExportCSV}
        taskCount={tasks.length}
        userName={userName}
        onSignOut={handleSignOut}
      />

      <main className="app__main">
        <div className="app__toolbar">
          <button type="button" className="btn btn--primary" onClick={openNewForm}>
            + New task
          </button>
          {hasCompleted && (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={async () => {
                await clearCompleted();
                show("Completed tasks cleared.", "success");
              }}
            >
              Clear completed
            </button>
          )}
        </div>

        <FilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          sort={sort}
          onSortChange={setSort}
          search={search}
          onSearchChange={setSearch}
          resultCount={visibleTasks.length}
          total={tasks.length}
          onClear={handleClearFilters}
        />

        <TaskList
          tasks={visibleTasks}
          onEdit={openEditForm}
          onDelete={handleDelete}
          onReorder={reorderTask}
        />
      </main>

      <footer className="app__footer">
        <p>TaskFlow — a personal task manager. Data is protected.</p>
      </footer>

      {formOpen && (
        <TaskForm
          task={editingTask}
          onSave={handleSave}
          onClose={closeForm}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Delete this task?"
          message={`“${pendingDelete.title}” will be permanently removed.`}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
