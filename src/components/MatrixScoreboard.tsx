import { ArrowDown, ArrowDownUp, ArrowUp, ExternalLink } from "lucide-react";
import { formatScore } from "../utils/formatScore";
import {
  YEAR_SORT_COLUMN_ID,
  type MatrixDatasetGroup,
  type MatrixRow,
  type MatrixSortState,
} from "../utils/matrix";
import { MetricBadge } from "./MetricBadge";

const MODEL_COLUMN_WIDTH = 360;
const YEAR_COLUMN_WIDTH = 86;
const SCORE_COLUMN_WIDTH = 190;

type MatrixScoreboardProps = {
  groups: MatrixDatasetGroup[];
  rows: MatrixRow[];
  sortState: MatrixSortState | null;
  focusedDatasetId: string;
  onSort: (columnId: string) => void;
};

export function MatrixScoreboard({
  focusedDatasetId,
  groups,
  onSort,
  rows,
  sortState,
}: MatrixScoreboardProps) {
  const columns = groups.flatMap((group) => group.columns);
  const tableWidth =
    MODEL_COLUMN_WIDTH + YEAR_COLUMN_WIDTH + columns.length * SCORE_COLUMN_WIDTH;
  const isYearActive = sortState?.columnId === YEAR_SORT_COLUMN_ID;
  const yearDirection = isYearActive ? sortState.direction : null;
  const yearSortTitle =
    yearDirection === "asc"
      ? "Sort year descending"
      : yearDirection === "desc"
        ? "Restore default year order"
        : "Sort year ascending";

  if (columns.length === 0 || rows.length === 0) {
    return (
      <div className="empty-state">
        No matrix cells match the current filters.
      </div>
    );
  }

  return (
    <div
      className="matrix-shell notranslate"
      aria-label="Two-dimensional CGEC comparison matrix"
      translate="no"
    >
      <table
        className="matrix-table"
        style={{ minWidth: `${tableWidth}px`, width: `${tableWidth}px` }}
      >
        <colgroup>
          <col className="matrix-model-col" />
          <col className="matrix-year-col" />
          {columns.map((column) => (
            <col className="matrix-score-col" key={column.id} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th className="matrix-sticky matrix-model-heading" rowSpan={2}>
              Paper / model
            </th>
            <th
              className="matrix-year-heading"
              rowSpan={2}
              aria-sort={
                yearDirection === "asc"
                  ? "ascending"
                  : yearDirection === "desc"
                    ? "descending"
                    : "none"
              }
            >
              <button
                className={`matrix-sort matrix-year-sort ${isYearActive ? "is-active" : ""}`}
                data-column-id={YEAR_SORT_COLUMN_ID}
                data-sort-direction={yearDirection ?? "default"}
                onClick={() => onSort(YEAR_SORT_COLUMN_ID)}
                title={yearSortTitle}
                type="button"
              >
                <span>Year</span>
                {yearDirection === "asc" ? (
                  <ArrowUp size={13} aria-hidden="true" />
                ) : yearDirection === "desc" ? (
                  <ArrowDown size={13} aria-hidden="true" />
                ) : (
                  <ArrowDownUp size={13} aria-hidden="true" />
                )}
              </button>
            </th>
            {groups.map((group) => (
              <th
                className={`matrix-dataset-heading ${
                  group.dataset.id === focusedDatasetId ? "is-focused" : ""
                }`}
                colSpan={group.columns.length}
                key={group.dataset.id}
              >
                <span>{group.dataset.name}</span>
                <small>{group.dataset.population}</small>
              </th>
            ))}
          </tr>
          <tr>
            {columns.map((column) => {
              const isActive = sortState?.columnId === column.id;
              const direction = isActive ? sortState.direction : null;
              const sortTitle =
                direction === "asc"
                  ? `Sort ${column.datasetName} ${column.standardLabel} descending`
                  : direction === "desc"
                    ? `Restore default order for ${column.datasetName} ${column.standardLabel}`
                    : `Sort ${column.datasetName} ${column.standardLabel} ascending`;

              return (
                <th
                  className={`matrix-standard-heading ${
                    column.datasetId === focusedDatasetId ? "is-focused" : ""
                  }`}
                  key={column.id}
                  aria-sort={
                    direction === "asc"
                      ? "ascending"
                      : direction === "desc"
                        ? "descending"
                        : "none"
                  }
                >
                  <button
                    className={`matrix-sort ${isActive ? "is-active" : ""}`}
                    data-column-id={column.id}
                    data-sort-direction={direction ?? "default"}
                    onClick={() => onSort(column.id)}
                    title={`${sortTitle} (${column.detailLabel})`}
                    type="button"
                  >
                    <span>{column.standardLabel}</span>
                    <small>{column.detailLabel}</small>
                    {direction === "asc" ? (
                      <ArrowUp size={13} aria-hidden="true" />
                    ) : direction === "desc" ? (
                      <ArrowDown size={13} aria-hidden="true" />
                    ) : (
                      <ArrowDownUp size={13} aria-hidden="true" />
                    )}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <th className="matrix-sticky matrix-model-cell" scope="row">
                {row.paper.paper_url ? (
                  <a
                    className="matrix-citation-link"
                    href={row.paper.paper_url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <strong>{row.citation}</strong>
                    <ExternalLink size={12} aria-hidden="true" />
                  </a>
                ) : (
                  <strong>{row.citation}</strong>
                )}
                <span>{row.systemName}</span>
                <div className="matrix-row-meta">
                  {row.methodFamilies.slice(0, 2).map((method) => (
                    <MetricBadge key={method} label={method} tone="model" />
                  ))}
                  {row.modelTypes.slice(0, 2).map((modelType) => (
                    <MetricBadge key={modelType} label={modelType} tone="source" />
                  ))}
                </div>
              </th>
              <td className="matrix-year-cell">
                {row.paper.paper_url ? (
                  <a href={row.paper.paper_url} rel="noreferrer" target="_blank">
                    {row.year}
                  </a>
                ) : (
                  row.year
                )}
              </td>
              {columns.map((column) => {
                const cell = row.cells[column.id];
                const result = cell?.result;

                return (
                  <td
                    className={`matrix-score-cell ${
                      column.datasetId === focusedDatasetId ? "is-focused" : ""
                    } ${result?.isBestInGroup ? "is-best" : ""}`}
                    key={`${row.id}-${column.id}`}
                    title={
                      result
                        ? [
                            result.source,
                            result.source_quote_or_page,
                            result.notes,
                          ]
                            .filter(Boolean)
                            .join(" / ")
                        : "Unreported"
                    }
                  >
                    {result ? (
                      <>
                        <strong>{formatScore(result.score, result.score_display)}</strong>
                        <span>#{result.rank}</span>
                      </>
                    ) : (
                      <span className="missing-score">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
