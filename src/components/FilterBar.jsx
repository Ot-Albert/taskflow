import {
  PRIORITIES,
  STATUSES,
  PRIORITY_LABELS,
  STATUS_LABELS,
  SORT_OPTIONS,
} from "../utils/constants";

const SORT_LABELS = {
  [SORT_OPTIONS.DUE_DATE]: "Due date",
  [SORT_OPTIONS.PRIORITY]: "Priority",
  [SORT_OPTIONS.CREATED]: "Recently added",
};

export default function FilterBar({
  filters,
  onFilterChange,
  sort,
  onSortChange,
  search,
  onSearchChange,
  resultCount,
  total,
  onClear,
}) {
  return (
    <section className="filter-bar" aria-label="Filters and search">
      <div className="filter-bar__search">
        <label htmlFor="search" className="sr-only">
          Search tasks
        </label>
        <input
          id="search"
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search title or description…"
        />
      </div>

      <div className="filter-bar__controls">
        <div className="select-group">
          <label htmlFor="filter-status">Status</label>
          <select
            id="filter-status"
            value={filters.status}
            onChange={(e) => onFilterChange({ status: e.target.value })}
          >
            <option value="all">All</option>
            {Object.values(STATUSES).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        <div className="select-group">
          <label htmlFor="filter-priority">Priority</label>
          <select
            id="filter-priority"
            value={filters.priority}
            onChange={(e) => onFilterChange({ priority: e.target.value })}
          >
            <option value="all">All</option>
            {Object.values(PRIORITIES).map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
        </div>

        <div className="select-group">
          <label htmlFor="sort">Sort by</label>
          <select
            id="sort"
            value={sort}
            onChange={(e) => onSortChange(e.target.value)}
          >
            {Object.values(SORT_OPTIONS).map((s) => (
              <option key={s} value={s}>
                {SORT_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        <button type="button" className="btn btn--ghost" onClick={onClear}>
          Clear
        </button>
      </div>

      <p className="filter-bar__count" aria-live="polite">
        Showing {resultCount} of {total} task{total === 1 ? "" : "s"}
      </p>
    </section>
  );
}
