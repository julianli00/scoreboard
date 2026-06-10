import {
  BookOpenCheck,
  Database,
  Download,
  FileJson,
  FileText,
  LayoutGrid,
  Moon,
  Search,
  ShieldCheck,
  Sun,
} from "lucide-react";
import { useMemo, useState } from "react";
import { DatasetOverview } from "./components/DatasetOverview";
import { MatrixScoreboard } from "./components/MatrixScoreboard";
import { Methodology } from "./components/Methodology";
import { PaperList } from "./components/PaperList";
import datasetsData from "./data/datasets.json";
import papersData from "./data/papers.json";
import resultsData from "./data/results.json";
import { filterResults, toCsv, uniqueSorted } from "./utils/filters";
import { buildMatrix, matrixToCsv, sortMatrixRows, YEAR_SORT_COLUMN_ID } from "./utils/matrix";
import { enrichResults } from "./utils/ranking";
import { standardizeScoreboardResults } from "./utils/scoreboardStandards";
import type { FilterState } from "./utils/filters";
import type { MatrixSortState } from "./utils/matrix";
import type { Dataset, Paper, Result } from "./utils/types";

const datasets = datasetsData as Dataset[];
const papers = papersData as Paper[];
const results = resultsData as Result[];
const compactStandards = [
  { label: "character-level", unit: "character" },
  { label: "word/span-level", unit: "word/span" },
  { label: "unknown unit", unit: "unknown" },
];

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
  const markedStandardsByDataset = useMemo(() => {
    const paperMap = new Map(papers.map((paper) => [paper.id, paper]));
    const grouped = new Map<string, string[]>();

    for (const marked of standardizedResults.marked) {
      const paper = paperMap.get(marked.paperId);
      const label = [
        paper?.citation ?? marked.paperId,
        marked.systemName,
        `${marked.split} ${marked.metric}`,
        `${marked.unit} / ${marked.scorer}`,
      ]
        .filter(Boolean)
        .join(" - ");
      const items = grouped.get(marked.datasetId) ?? [];
      items.push(label);
      grouped.set(marked.datasetId, items);
    }

    return grouped;
  }, [standardizedResults]);
  const metricCoverageRows = datasets.map((dataset) => {
    const datasetResults = scoreboardResults.filter((result) => result.dataset_id === dataset.id);
    const countsByUnit = new Map<string, number>();

    for (const result of datasetResults) {
      countsByUnit.set(result.unit, (countsByUnit.get(result.unit) ?? 0) + 1);
    }

    return {
      dataset,
      countsByUnit,
      markedCount: markedStandardsByDataset.get(dataset.id)?.length ?? 0,
      resultCount: datasetResults.length,
    };
  });

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

  const metrics = uniqueSorted(scoreboardResults.map((result) => result.metric));
  const units = uniqueSorted(scoreboardResults.map((result) => result.unit));
  const methodFamilies = uniqueSorted(scoreboardResults.map((result) => result.method_family));
  const modelTypes = uniqueSorted(scoreboardResults.map((result) => result.model_type));

  function updateFilter<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function handleDatasetSelect(id: string) {
    setFocusedDatasetId(id);
    const section = document.getElementById(`matrix-${id}`) ?? document.getElementById("leaderboards");
    section?.scrollIntoView({ behavior: "smooth", block: "start" });
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
          <a href="#metrics-overview">Metrics</a>
          <a href="#datasets">Datasets</a>
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
        <a href="#metrics-overview">
          <LayoutGrid size={15} aria-hidden="true" />
          <span>Metrics</span>
        </a>
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
        <a href="#datasets">
          <Database size={15} aria-hidden="true" />
          <span>Datasets</span>
        </a>
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
              A model-by-dataset matrix for published CGEC systems, metrics,
              evaluation units, and missing-score comparison.
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
              <p className="eyebrow">Comparison Matrix</p>
              <h2>Models by dataset and standard</h2>
            </div>
            <p>
              Each dataset now has one dedicated table. Rows are citation-style
              paper/system entries. Columns are normalized to test F0.5
              character-level, word/span-level, or unknown unit, with ChERRANT
              treated as the default scorer unless a row explicitly marks a
              different test F0.5 scorer.
            </p>
          </div>

          <div className="dataset-jump-list notranslate" aria-label="Dataset table shortcuts" translate="no">
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

          <div className="metric-dataset-overview" id="metrics-overview">
            <div className="metric-overview-header">
              <div>
                <p className="eyebrow">Metric Coverage</p>
                <h3>Evaluation standards by dataset</h3>
              </div>
              <p>Compact test F0.5 columns used by the dataset tables below.</p>
            </div>
            <div className="metric-overview-shell notranslate" translate="no">
              <table className="metric-dataset-table">
                <thead>
                  <tr>
                    <th scope="col">Dataset</th>
                    {compactStandards.map((standard) => (
                      <th scope="col" key={standard.unit}>
                        test F0.5
                        <span>{standard.label}</span>
                      </th>
                    ))}
                    <th scope="col">Marked</th>
                    <th scope="col">Rows</th>
                  </tr>
                </thead>
                <tbody>
                  {metricCoverageRows.map(({ countsByUnit, dataset, markedCount, resultCount }) => (
                    <tr key={dataset.id}>
                      <th scope="row">
                        <a href={`#matrix-${dataset.id}`} onClick={() => setFocusedDatasetId(dataset.id)}>
                          {dataset.name}
                        </a>
                        <span>{dataset.population}</span>
                      </th>
                      {compactStandards.map((standard) => {
                        const count = countsByUnit.get(standard.unit) ?? 0;
                        return (
                          <td className={count ? "has-standard" : ""} key={standard.unit}>
                            {count ? `${count} row${count === 1 ? "" : "s"}` : "—"}
                          </td>
                        );
                      })}
                      <td className={markedCount ? "has-standard" : ""}>
                        {markedCount ? `${markedCount} marked` : "—"}
                      </td>
                      <td>{resultCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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

            <SelectFilter
              label="Metric"
              onChange={(value) => updateFilter("metric", value)}
              options={metrics}
              value={filters.metric}
            />
            <SelectFilter
              label="Unit"
              onChange={(value) => updateFilter("unit", value)}
              options={units}
              value={filters.unit}
            />
            <SelectFilter
              label="Method"
              onChange={(value) => updateFilter("methodFamily", value)}
              options={methodFamilies}
              value={filters.methodFamily}
            />
            <SelectFilter
              label="Model"
              onChange={(value) => updateFilter("modelType", value)}
              options={modelTypes}
              value={filters.modelType}
            />

            <button
              className="secondary-action compact"
              onClick={() => setFilters(initialFilters)}
              type="button"
            >
              Reset
            </button>
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

          <div className="dataset-scoreboards">
            {datasetMatrices.map(
              ({ dataset, filteredResultCount, matrix, rows, seededResultCount, sortState }) => (
                <article className="dataset-scoreboard" id={`matrix-${dataset.id}`} key={dataset.id}>
                  <div className="dataset-scoreboard-heading">
                    <div>
                      <p className="eyebrow">{dataset.population} dataset</p>
                      <h3>{dataset.name}</h3>
                    </div>
                    <p>{dataset.evaluation_notes}</p>
                    <div className="dataset-scoreboard-meta">
                      <span>{seededResultCount} seeded results</span>
                      <span>{filteredResultCount} visible</span>
                    </div>
                  </div>
                  {markedStandardsByDataset.get(dataset.id)?.length ? (
                    <div className="standard-note">
                      <strong>Marked in this compact table</strong>
                      <ul>
                        {markedStandardsByDataset.get(dataset.id)?.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

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

        <DatasetOverview
          activeDatasetId={focusedDataset.id}
          datasets={datasets}
          onSelectDataset={handleDatasetSelect}
          results={scoreboardResults}
        />

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

function SelectFilter({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}) {
  return (
    <label className="select-filter">
      <span>{label}</span>
      <select onChange={(event) => onChange(event.target.value)} value={value}>
        <option value="">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
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
