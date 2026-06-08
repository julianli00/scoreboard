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
import { buildMatrix, matrixToCsv, sortMatrixRows } from "./utils/matrix";
import { enrichResults } from "./utils/ranking";
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

  const enrichedResults = useMemo(
    () => enrichResults(results, papers, datasets),
    [],
  );

  const focusedDataset = datasets.find((dataset) => dataset.id === focusedDatasetId) ?? datasets[0];
  const filteredResults = filterResults(enrichedResults, filters);
  const matrix = buildMatrix(filteredResults, datasets);
  const sortedMatrixRows = sortMatrixRows(matrix.rows, matrixSort);
  const allRankGroups = new Set(enrichedResults.map((result) => result.rank_group)).size;

  const metrics = uniqueSorted(enrichedResults.map((result) => result.metric));
  const units = uniqueSorted(enrichedResults.map((result) => result.unit));
  const methodFamilies = uniqueSorted(enrichedResults.map((result) => result.method_family));
  const modelTypes = uniqueSorted(enrichedResults.map((result) => result.model_type));

  function updateFilter<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function handleDatasetSelect(id: string) {
    setFocusedDatasetId(id);
    const leaderboard = document.getElementById("leaderboards");
    leaderboard?.scrollIntoView({ behavior: "smooth", block: "start" });
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
          <a href="#leaderboards">Matrix</a>
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
        <a href="#leaderboards">
          <LayoutGrid size={15} aria-hidden="true" />
          <span>Matrix</span>
        </a>
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
                View Matrix
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
              Rows are citation-style paper/system entries. Columns are grouped
              by dataset, then split into evaluation standards such as F0.5
              word-level, F0.5 character-level, span-level ChERRANT, F1, and
              official scores. Click a standard to cycle ascending, descending,
              and default order.
            </p>
          </div>

          <div className="dataset-tabs notranslate" aria-label="Dataset focus controls" translate="no">
            {datasets
              .filter((dataset) => enrichedResults.some((result) => result.dataset_id === dataset.id))
              .map((dataset) => (
                <button
                  className={dataset.id === focusedDataset.id ? "is-active" : ""}
                  key={dataset.id}
                  onClick={() => handleDatasetSelect(dataset.id)}
                  type="button"
                >
                  {dataset.name}
                </button>
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
                  matrixToCsv(matrix.groups, sortedMatrixRows),
                  "text/csv",
                )
              }
              type="button"
            >
              <Download size={16} />
              Matrix CSV
            </button>
          </div>

          <MatrixScoreboard
            focusedDatasetId={focusedDataset.id}
            groups={matrix.groups}
            onSort={handleMatrixSort}
            rows={sortedMatrixRows}
            sortState={matrixSort}
          />

          <div className="dataset-context">
            <div>
              <strong>Focused dataset: {focusedDataset.name}</strong>
              <span>{focusedDataset.evaluation_notes}</span>
            </div>
            <div>
              <strong>Sorting rule</strong>
              <span>
                Sorting applies to the selected standard column only; missing
                scores remain at the bottom and are shown as —.
              </span>
            </div>
          </div>
        </section>

        <section className="stats-strip" aria-label="Scoreboard summary">
          <Stat label="Datasets" value={datasets.length} />
          <Stat label="Papers" value={papers.length} />
          <Stat label="Result rows" value={results.length} />
          <Stat label="Rank groups" value={allRankGroups} />
        </section>

        <DatasetOverview
          activeDatasetId={focusedDataset.id}
          datasets={datasets}
          onSelectDataset={handleDatasetSelect}
          results={enrichedResults}
        />

        <PaperList papers={papers} results={enrichedResults} />
        <Methodology />
      </main>

      <footer className="site-footer">
        <span>Last updated: 2026-06-06</span>
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
