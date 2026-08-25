# TaskFlow — Personal Task Manager

A small, complete client-facing web app for managing personal tasks, built as
a junior developer skills assessment. Users can create, view, edit, delete,
filter, sort, search, reorder and export tasks — all in a responsive,
gold-and-black themed UI with data persisted to the browser.

---

## Quick start

Requires **Node 18+** (developed on Node 20).

```bash
npm install      # install dependencies
npm run dev      # start the dev server (http://localhost:5173)
npm run build    # production build into dist/
npm run preview  # preview the production build locally
npm run lint     # run oxlint
```

No environment variables, no backend, no external services. Open the dev URL
and start adding tasks.

---

## Features

### Core (required)

- **Full CRUD** — create, view, edit and delete tasks.
- **Task fields** — title, optional description, due date, priority
  (Low / Medium / High), status (To Do / In Progress / Done).
- **Filtering** — by status and/or priority (composable, AND semantics).
- **Sorting** — by due date (default), priority, or recently added.
- **Persistence** — all tasks saved to `localStorage` and restored on reload.
- **Responsive** — works on desktop and mobile; layout adapts at ≤600px.
- **Form validation** — inline per-field errors, required-field checks,
  length limits, invalid-date detection; submit is blocked until valid.
- **User feedback** — toast notifications for every action, empty states for
  the list and filtered results, an "Overdue" badge on past-due tasks.
- **Clean UI** — custom CSS with design tokens (CSS variables), a
  gold-and-black light/dark theme, and iPhone-style squircle corners on
  cards and controls. No UI library.

### Nice-to-haves (included)

- **Dark / light mode toggle** — a gold-and-black palette in both modes,
  defaults to OS preference, persisted to `localStorage`, applied via
  `data-theme` on `<html>`. Native controls follow each mode via
  `color-scheme`, and the browser chrome matches via `theme-color` meta tags.
- **Drag-and-drop reordering** — native HTML5 DnD plus up/down arrow buttons
  for keyboard and touch users. Manual reordering is honoured when no
  automatic sort is overriding it (see the *Reordering* note below).
- **Search** — live filtering on title and description.
- **Export** — download all tasks as **JSON** or **CSV** (RFC-4180 escaping).
- **Accessibility** — semantic HTML, ARIA labels, `aria-live` regions for
  toasts and result counts, `role="dialog"` / `alertdialog` for modals,
  keyboard support (Esc closes dialogs, focus moves to title on open),
  `prefers-reduced-motion` respected, visible gold focus rings.
- **"Clear completed"** — bulk-remove finished tasks.

---

## How I planned and broke down the work

1. **Scope & stack decision** — I chose React + JavaScript + Vite for fast
   iteration and clear demonstration of hooks/state/components without the
   ceremony of TypeScript or a meta-framework. Persistence via `localStorage`
   keeps the project self-contained and instantly deployable as static files.
2. **Data model first** — defined the task shape and enums
   (`PRIORITIES`, `STATUSES`) in one place (`src/utils/constants.js`) so no
   string literals are hard coded anywhere else.
3. **State & persistence layer** — built `useTasks` (CRUD + reorder + persist)
   and `useTheme` before any UI, so components could stay thin.
4. **Validation as pure functions** — `src/utils/validation.js` returns an
   error map; trivially testable and reused by the form on every keystroke.
5. **UI in vertical slices** — `TaskForm` → `TaskItem` / `TaskList` →
   `FilterBar` → `Header` → `Toast` / `ConfirmDialog`, wiring each into `App`.
6. **Polish pass** — theming, empty states, toasts, a11y, responsive CSS,
   export, then lint + build verification.

---

## Architecture & technology decisions

```
src/
├── main.jsx              # React entry point
├── App.jsx               # Composition root: wires hooks + components, owns UI state
├── App.css               # All component styles (CSS variables, responsive)
├── index.css             # Design tokens + gold/black theme variables + base reset
├── components/
│   ├── Header.jsx        # Brand, export buttons, theme toggle
│   ├── FilterBar.jsx     # Search + status/priority filters + sort
│   ├── TaskList.jsx      # List container, owns DnD state, renders EmptyState
│   ├── TaskItem.jsx      # Single task row (badges, actions, draggable)
│   ├── TaskForm.jsx      # Modal form for create/edit with validation
│   ├── ConfirmDialog.jsx # Reusable confirm modal (used for delete)
│   ├── EmptyState.jsx    # Friendly empty list placeholder
│   └── Toast.jsx         # Transient feedback notification
├── hooks/
│   ├── useTasks.js       # Task store: CRUD, reorder, localStorage persistence
│   ├── useTheme.js       # Theme state + <html data-theme> sync
│   └── useToast.js       # Single active toast with auto-dismiss
└── utils/
    ├── constants.js      # Enums, labels, storage keys, sort options
    ├── storage.js        # Safe localStorage JSON load/save wrappers
    ├── validation.js     # Pure per-field validators + validateTask()
    ├── date.js           # Date formatting + overdue detection
    └── export.js         # JSON + CSV download helpers
```

### Key decisions

- **Single source of truth for tasks.** `useTasks` is the only thing that
  touches the task array; components receive data and callbacks via props.
  This keeps the data flow one-directional and easy to reason about.
- **Derived filtering/sorting.** `App.jsx` computes `visibleTasks` with
  `useMemo` from `tasks` + filter/sort/search state. No duplicated or
  stale copies of the list exist anywhere.
- **Persistence as an effect, not in the handlers.** `useTasks` writes to
  `localStorage` in a `useEffect` that watches `tasks`, so every mutation
  (add/edit/delete/reorder/clear) is automatically persisted without each
  handler remembering to call save.
- **Defensive storage.** `storage.js` probes for `localStorage` availability
  (private mode, SSR) and never throws; `useTasks` normalises loaded data so
  a corrupted or partially-missing entry can't crash the UI.
- **Pure validators.** Each field has its own function returning `null` or an
  error string. `validateTask` aggregates them into a `{ field: message }`
  map; `isFormValid` checks that map. The form re-validates the changed field
  on every keystroke for instant feedback but only shows errors after blur.
- **Native drag-and-drop.** No DnD library — `draggable` + `onDragEnter`
  reorders via `reorderTask(id, toIndex)`, which renumbers the `order` field
  for the whole list. Up/down buttons provide the same capability for
  keyboard and touch users (the drag handle is hidden on small screens).
  Note: an active automatic sort (due date / priority / recently added)
  re-applies on every render and will override a manual position; manual
  ordering is most visible when the list is in its default arrangement.
- **CSS variables for theming.** A gold-and-black palette is defined as two
  token blocks (`:root[data-theme="light"]` for warm ivory + matte gold, and
  `:root[data-theme="dark"]` for near-black + brighter gold). Components
  reference tokens (`var(--surface)`, `var(--primary)`, etc.) and never
  hard-code colours, so switching themes is a single `data-theme` attribute
  change. `color-scheme` is set per theme so native date/select controls
  match, and `theme-color` meta tags align the mobile browser chrome.
- **Squircle-style corners.** A dedicated `--radius-card: 24px` token is
  applied to filter cards, task cards, buttons, the search input, and
  dropdowns for an iPhone-like continuous-corner feel, while smaller
  structural radii (`--radius`, `--radius-sm`) keep modals and badges
  proportionate.
- **No UI library.** The brief asked to avoid heavy UI libraries unless
  justified. The component set is small enough that hand-written CSS is
  clearer and shows stronger fundamentals than a styled-components box.

---

## Explanation of key parts of the code

### State management (`src/hooks/useTasks.js`)

`useTasks` exposes `{ tasks, addTask, updateTask, deleteTask, reorderTask,
clearCompleted }`. All mutators use the functional updater form
(`setTasks(prev => ...)`) so they're safe against stale closures and can be
memoised with `useCallback`. On first run, seed data is generated so the app
isn't empty; thereafter any change triggers the persist effect.

### Form handling (`src/components/TaskForm.jsx`)

One component handles both create and edit (decided by whether a `task` prop
is passed). Local `form` state is updated field-by-field; `errors` is
recomputed on every change so feedback is instant, but errors are only
*displayed* for fields the user has touched (`touched` map) — this avoids
shouting at the user before they've done anything. On submit, all fields are
marked touched and the form is re-validated; submission proceeds only if
`isFormValid` passes. Esc closes the modal; the title input is auto-focused.

### Filtering & sorting (`src/App.jsx`)

`visibleTasks` is a `useMemo` over `tasks`, `filters`, `sort`, and `search`.
Filtering is straightforward equality plus a case-insensitive substring match
on `title + description`; status and priority combine with AND semantics.
Filter updates flow through a dedicated `handleFilterChange` that **merges**
partial updates (`{ ...current, ...patch }`) so selecting one dropdown never
wipes the other — an earlier version passed `setFilters` directly and each
selection replaced the whole filter object, which silently broke the other
axis. The **Clear** button resets status, priority, and search but preserves
the current sort mode. Sorting: due-date ascends (tasks with no due date
sink to the bottom via a `"9999"` sentinel); priority uses a rank map
(high = 3, medium = 2, low = 1) descending, ties broken by due date;
"recently added" sorts by `createdAt` descending.

### Persistence (`src/utils/storage.js`, `src/hooks/useTasks.js`)

`loadJSON` / `saveJSON` wrap `localStorage` with try/catch and an
availability probe. `useTasks` loads once lazily in `useState`'s initialiser
(so it doesn't run on every render) and saves in an effect. Loaded data is
normalised: missing fields get defaults, unknown ids are dropped, and the
array is sorted by `order` so reordering survives reloads.

### Drag-and-drop (`src/components/TaskList.jsx`, `TaskItem.jsx`)

`TaskList` keeps `draggingId` in **state** (not a ref) so the dragged item
re-renders with the `.task--dragging` style. On `dragenter` over another item,
`reorderTask(draggingId, targetIndex)` moves it live — the list reorders as
you drag. `drop` and `dragend` clear the state. Each `TaskItem` is
`draggable` and also exposes ↑/↓ buttons that call the same `reorderTask`,
giving keyboard/touch parity.

> **Known limitation.** `reorderTask` renumbers the persisted `order` field,
> but `visibleTasks` is always re-sorted by the active sort mode (due date /
> priority / recently added). That means a manual move is immediately
> re-applied against the sort and may not stick while an automatic sort is
> selected. Manual ordering is most visible when the list is in its default
> arrangement. A future improvement would add a "Manual order" sort mode that
> respects the `order` field (see *What I would improve*).

### Theming (`src/hooks/useTheme.js`, `src/index.css`)

`useTheme` reads any stored preference, falls back to
`prefers-color-scheme: dark`, and writes `data-theme` onto `<html>` in an
effect. `index.css` defines two gold-and-black token blocks:
`:root[data-theme="light"]` (warm ivory base, cream surfaces, near-black
text, matte gold `#C9A227` accents) and `:root[data-theme="dark"]`
(near-black base, layered charcoal surfaces, warm ivory text, brighter gold
`#D4AF37` accents). Beyond the core surface/text/border tokens, the system
includes `--on-primary` (black-on-gold button text for safe contrast),
`--border-strong`, `--focus-ring`, `--overlay`, `--placeholder`, and
`--*-soft` translucent tokens for badges. `color-scheme` is set per theme so
native date/select controls match, and `theme-color` meta tags in
`index.html` align the mobile browser chrome. The favicon is a black tile
with a gold checkmark to match.

### Export (`src/utils/export.js`)

`exportJSON` serialises the raw task array. `exportCSV` builds a header row
plus one row per task, escaping any field containing a comma, quote, or
newline per RFC-4180. Both create a `Blob` and trigger a download via a
temporary `<a>` element.

---

## Challenges encountered and how I addressed them

1. **Lint flagged "cannot access ref during render".** My first `TaskList`
   kept `draggingId` in a `useRef` and read `draggingId.current` during
   render to set `isDragging`. That's both a lint error and a real bug — the
   dragged item's style wouldn't update because reading a ref doesn't trigger
   a re-render. Fixed by promoting `draggingId` to `useState`.
2. **Reordering vs. filtering.** Drag-and-drop reorders the underlying list,
   but when filters/sort are active the visible order may not match storage
   order. I chose to let DnD reorder within the current visible view (which
   is what the user sees), accepting that switching sort modes will re-apply
   that sort. The `order` field is always renumbered after a move so the
   persisted state stays consistent.
3. **Tasks with no due date sorting first.** Initially empty due dates sorted
   to the top (empty string < any date). Added a `"9999"` sentinel in the
   comparator so undated tasks sink to the bottom, which matches user
   expectations for a due-date view.
4. **`localStorage` in restricted environments.** Wrapped all access in
   availability checks and try/catch so the app degrades gracefully (tasks
   just won't persist) instead of throwing in private mode or sandboxed
   iframes.
5. **Avoiding stale closures in handlers.** All `useTasks` mutators use the
   functional `setTasks(prev => ...)` form and are wrapped in `useCallback`
   with stable deps, so children re-render predictably and there are no
   "stale `tasks`" bugs.
6. **Filter dropdowns wiping each other.** Each dropdown emitted only its
   changed field (e.g. `{ priority: "high" }`), and `App` passed React's
   `setFilters` straight through, so the partial object *replaced* the whole
   filter state. The dropped field became `undefined`, which the predicate
   treated as an active filter and rejected every task. Fixed by routing
   updates through a `handleFilterChange` that merges the patch into the
   existing state. Clear was also tightened to reset filters and search
   while preserving the active sort mode.
7. **Manual reordering vs. automatic sort.** `reorderTask` updates the
   `order` field, but `visibleTasks` is always re-sorted by the active sort
   mode, so a manual move can be immediately overridden by due-date/priority
   sorting. I chose to keep the current behaviour (manual moves persist in
   storage but are visually subject to the active sort) rather than
   introduce a separate "Manual order" mode mid-project; it's listed as a
   future improvement.

---

## What I would improve with more time

- **Tests.** Add Vitest + React Testing Library: unit tests for the pure
  utils (`validation`, `export` CSV escaping, `date`), and integration tests
  for `useTasks` (CRUD, reorder, persistence) and the form (validation flow).
- **TypeScript.** The structures are small enough now that JS is fine, but a
  `Task` type and an `Errors` map type would make refactors safer.
- **Drag-and-drop on touch.** Native HTML5 DnD doesn't fire on most mobile
  browsers; the up/down buttons cover it today, but a pointer-events-based
  implementation would be smoother.
- **"Manual order" sort mode.** Add a sort option that respects the `order`
  field so manual drag/arrow reordering is visible and stable, with an
  automatic switch to it on the first manual move. This would resolve the
  reordering-vs-sort limitation noted above.
- **Undo for delete.** A short undo window in the toast instead of a confirm
  dialog would feel faster.
- **Due-date reminders / overdue grouping.** Group tasks by Today / Upcoming
  / Overdue, and optionally use the Notifications API.
- **Server sync.** Swap `useTasks`'s persistence layer for a serverless API
  (e.g. Vercel route handlers + KV) without changing the component API.
- **Virtualisation.** Not needed at this scale, but worth it past a few
  hundred tasks.
- **Keyboard reordering everywhere.** Add `aria-roledescription="list item"`
  and full WAI-ARIA grid-keyboard support for the list.

---

## Tech stack

- **React 19** — function components, hooks (`useState`, `useEffect`,
  `useMemo`, `useCallback`, `useRef`).
- **Vite 8** — dev server, build, HMR.
- **oxlint** — linting (zero-config, fast).
- **Inter (Google Fonts)** — loaded with `display=swap` as an SF Pro
  lookalike for Linux/Windows/Android; the font stack leads with native
  San Francisco (`-apple-system`, `"SF Pro Text/Display"`) so Apple devices
  use the real iPhone font.
- **Plain CSS** — custom properties, Flexbox/Grid, `prefers-reduced-motion`,
  `prefers-color-scheme`, `color-scheme`. No CSS framework, no UI component
  library.

---

## License

Provided as part of a skills assessment. Free to use for evaluation purposes.
