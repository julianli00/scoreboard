import {
  BookOpenCheck,
  Database,
  Download,
  FileJson,
  FileText,
  Moon,
  Search,
  ShieldCheck,
  Sun,
} from "lucide-react";
import { useMemo, useState } from "react";
import { MatrixScoreboard } from "./components/MatrixScoreboard";
import { Methodology } from "./components/Methodology";
import { PaperList } from "./components/PaperList";
import datasetsData from "./data/datasets.json";
import papersData from "./data/papers.json";
import resultsData from "./data/results.json";
import { filterResults, toCsv } from "./utils/filters";
import { buildMatrix, matrixToCsv, sortMatrixRows, YEAR_SORT_COLUMN_ID } from "./utils/matrix";
import { enrichResults } from "./utils/ranking";
import { standardizeScoreboardResults } from "./utils/scoreboardStandards";
import type { FilterState } from "./utils/filters";
import type { MatrixSortState } from "./utils/matrix";
import type { Dataset, Paper, Result } from "./utils/types";

const datasets = datasetsData as Dataset[];
const papers = papersData as Paper[];
const results = resultsData as Result[];

const initialFilters: FilterState = {
  query: "",
  metric: "",
  unit: "",
  methodFamily: "",
  modelType: "",
};

export default function App() {
  const [focusedDatasetId, setFocusedDatasetId] = useState("nlpcc2018");
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [matrixSort, setMatrixSort] = useState<MatrixSortState | null>(null);
  const [darkMode, setDarkMode] = useState(false);

  const standardizedResults = useMemo(
    () => standardizeScoreboardResults(results),
    [],
  );
  const scoreboardResults = useMemo(
    () => enrichResults(standardizedResults.included, papers, datasets),
    [standardizedResults],
  );
  const filteredResults = filterResults(scoreboardResults, filters);
  const exportMatrix = buildMatrix(filteredResults, datasets);
  const sortedExportRows = sortMatrixRows(exportMatrix.rows, matrixSort);
  const datasetMatrices = datasets.map((dataset) => {
    const seededResultCount = scoreboardResults.filter((result) => result.dataset_id === dataset.id).length;
    const datasetResults = filteredResults.filter((result) => result.dataset_id === dataset.id);
    const matrix = buildMatrix(datasetResults, [dataset]);
    const sortApplies =
      matrixSort?.columnId === YEAR_SORT_COLUMN_ID ||
      matrix.groups.some((group) =>
        group.columns.some((column) => column.id === matrixSort?.columnId),
      );
    const sortState = sortApplies ? matrixSort : null;

    return {
      dataset,
      filteredResultCount: datasetResults.length,
      matrix,
      rows: sortMatrixRows(matrix.rows, sortState),
      seededResultCount,
      sortState,
    };
  });
  const focusedDataset = datasets.find((dataset) => dataset.id === focusedDatasetId) ?? datasets[0];
  const allRankGroups = new Set(scoreboardResults.map((result) => result.rank_group)).size;

  function updateFilter<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function handleMatrixSort(columnId: string) {
    setMatrixSort((current) => {
      if (current?.columnId !== columnId) {
        return { columnId, direction: "asc" };
      }

      if (current.direction === "asc") {
        return { columnId, direction: "desc" };
      }

      return null;
    });
  }

  return (
    <div className={`app ${darkMode ? "theme-dark" : ""}`}>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="CGEC Scoreboard home">
          <span>CGEC</span>
          Scoreboard
        </a>
        <nav className="notranslate" translate="no">
          <a href="#leaderboards">Tables</a>
          <a href="#papers">Papers</a>
          <a href="#policy">Policy</a>
        </nav>
        <button
          className="icon-button"
          type="button"
          onClick={() => setDarkMode((value) => !value)}
          title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </header>

      <aside className="side-nav notranslate" aria-label="Page sections" translate="no">
        <span className="side-nav-label">Tables</span>
        <div className="side-nav-sublist" aria-label="Dataset tables">
          {datasets.map((dataset) => (
            <a
              href={`#matrix-${dataset.id}`}
              key={dataset.id}
              onClick={() => setFocusedDatasetId(dataset.id)}
            >
              {dataset.name}
            </a>
          ))}
        </div>
        <a href="#papers">
          <FileText size={15} aria-hidden="true" />
          <span>Papers</span>
        </a>
        <a href="#policy">
          <ShieldCheck size={15} aria-hidden="true" />
          <span>Policy</span>
        </a>
      </aside>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Published-paper CGEC comparison matrix</p>
            <h1>Chinese Grammatical Error Correction Scoreboard</h1>
            <p>
              Dataset-by-dataset leaderboards for published CGEC systems,
              evaluation standards, and source-linked paper results.
            </p>
            <div className="hero-actions">
              <a className="primary-action" href="#leaderboards">
                <BookOpenCheck size={18} />
                View Tables
              </a>
              <button
                className="secondary-action"
                type="button"
                onClick={() =>
                  downloadText("cgec-results.json", JSON.stringify(resultsData, null, 2), "application/json")
                }
              >
                <FileJson size={18} />
                JSON
              </button>
            </div>
          </div>

          <div className="hero-visual" aria-label="Annotated Chinese correction example">
            <img src="./cgec-evidence-strip.png" alt="" />
          </div>
        </section>

        <section className="section leaderboard-section" id="leaderboards">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Dataset Tables</p>
              <h2>Models by dataset</h2>
            </div>
            <p>
              Each dataset has one dedicated table. Rows are citation-style
              paper/system entries, and each result chip keeps the evaluation
              unit and scorer visible.
            </p>
          </div>

          <div
            className="dataset-jump-list notranslate"
            id="metrics-overview"
            aria-label="Dataset table shortcuts"
            translate="no"
          >
            {datasets.map((dataset) => (
              <a
                className={dataset.id === focusedDataset.id ? "is-active" : ""}
                href={`#matrix-${dataset.id}`}
                key={dataset.id}
                onClick={() => setFocusedDatasetId(dataset.id)}
              >
                {dataset.name}
              </a>
            ))}
          </div>

          <div className="filter-panel notranslate" translate="no">
            <label className="search-box">
              <Search size={18} aria-hidden="true" />
              <input
                onChange={(event) => updateFilter("query", event.target.value)}
                placeholder="Search paper, system, year, metric..."
                type="search"
                value={filters.query}
              />
            </label>

            <div className="filter-actions">
              {filters.query ? (
                <button
                  className="secondary-action compact"
                  onClick={() => setFilters(initialFilters)}
                  type="button"
                >
                  Reset
                </button>
              ) : null}
              <button
                className="secondary-action compact"
                onClick={() => downloadText("cgec-filtered-results.csv", toCsv(filteredResults), "text/csv")}
                type="button"
              >
                <Download size={16} />
                Rows CSV
              </button>
              <button
                className="secondary-action compact"
                onClick={() =>
                  downloadText(
                    "cgec-matrix.csv",
                    matrixToCsv(exportMatrix.groups, sortedExportRows),
                    "text/csv",
                  )
                }
                type="button"
              >
                <Download size={16} />
                Matrix CSV
              </button>
            </div>
          </div>

          <div className="dataset-scoreboards">
            {datasetMatrices.map(
              ({ dataset, filteredResultCount, matrix, rows, seededResultCount, sortState }) => (
                <article className="dataset-scoreboard" id={`matrix-${dataset.id}`} key={dataset.id}>
                  <div className="dataset-scoreboard-heading">
                    <div>
                      <p className="eyebrow">{dataset.population} dataset</p>
                      <h3>{dataset.name}</h3>
                      <div className="dataset-source-row">
                        {dataset.url ? (
                          <a href={dataset.url} rel="noreferrer" target="_blank">
                            <Database size={14} aria-hidden="true" />
                            Source
                          </a>
                        ) : null}
                        <span>{dataset.domain}</span>
                      </div>
                    </div>
                    <p>{dataset.evaluation_notes}</p>
                    <div className="dataset-scoreboard-meta">
                      <span>{seededResultCount} seeded results</span>
                      <span>{filteredResultCount} visible</span>
                    </div>
                  </div>
                  <dl className="dataset-inline-facts">
                    <div>
                      <dt>Format</dt>
                      <dd>{dataset.correction_format}</dd>
                    </div>
                    <div>
                      <dt>References</dt>
                      <dd>{dataset.multi_reference}</dd>
                    </div>
                    <div>
                      <dt>Labels</dt>
                      <dd>{dataset.error_label_explicitness}</dd>
                    </div>
                    <div>
                      <dt>QC</dt>
                      <dd>{dataset.documentation_qc}</dd>
                    </div>
                  </dl>

                  {seededResultCount === 0 ? (
                    <div className="empty-state dataset-empty">
                      No normalized test F0.5 result rows from the survey are seeded for this dataset yet.
                    </div>
                  ) : filteredResultCount === 0 ? (
                    <div className="empty-state dataset-empty">
                      No rows for this dataset match the current filters.
                    </div>
                  ) : (
                    <MatrixScoreboard
                      focusedDatasetId={dataset.id}
                      groups={matrix.groups}
                      onSort={handleMatrixSort}
                      rows={rows}
                      sortState={sortState}
                    />
                  )}
                </article>
              ),
            )}
          </div>
        </section>

        <section className="stats-strip" aria-label="Scoreboard summary">
          <Stat label="Datasets" value={datasets.length} />
          <Stat label="Papers" value={papers.length} />
          <Stat label="Result rows" value={scoreboardResults.length} />
          <Stat label="Rank groups" value={allRankGroups} />
        </section>

        <PaperList papers={papers} results={scoreboardResults} />
        <Methodology />
      </main>

      <footer className="site-footer">
        <span>Last updated: 2026-06-10</span>
        <span>Prototype data source: local CGEC survey PDF, Tables 2, 5, and 6.</span>
      </footer>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-card">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function downloadText(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
