import type { Dataset, EnrichedResult, Paper } from "./types";

export type MatrixColumn = {
  id: string;
  datasetId: string;
  datasetName: string;
  split: string;
  metric: string;
  unit: string;
  scorer: string;
  higherIsBetter: boolean;
  standardLabel: string;
  detailLabel: string;
};

export type MatrixDatasetGroup = {
  dataset: Dataset;
  columns: MatrixColumn[];
};

export type MatrixCell = {
  result: EnrichedResult;
};

export type MatrixRow = {
  id: string;
  paper: Paper;
  year: number;
  citation: string;
  systemName: string;
  methodFamilies: string[];
  modelTypes: string[];
  variants: string[];
  cells: Record<string, MatrixCell>;
  searchableText: string;
};

export type MatrixSortState = {
  columnId: string;
  direction: "asc" | "desc";
};

export const YEAR_SORT_COLUMN_ID = "__matrix_year__";

export function buildMatrix(
  results: EnrichedResult[],
  datasets: Dataset[],
): { groups: MatrixDatasetGroup[]; rows: MatrixRow[] } {
  const datasetOrder = new Map(datasets.map((dataset, index) => [dataset.id, index]));
  const datasetMap = new Map(datasets.map((dataset) => [dataset.id, dataset]));
  const columnsById = new Map<string, MatrixColumn>();
  const rowsById = new Map<string, MatrixRow>();

  for (const result of results) {
    const columnId = result.rank_group;
    if (!columnsById.has(columnId)) {
      columnsById.set(columnId, {
        id: columnId,
        datasetId: result.dataset_id,
        datasetName: result.dataset.name,
        split: result.split,
        metric: result.metric,
        unit: result.unit,
        scorer: result.scorer,
        higherIsBetter: result.higher_is_better,
        standardLabel: makeStandardLabel(result),
        detailLabel: makeDetailLabel(result),
      });
    }

    const rowId = makeRowId(result);
    const row = rowsById.get(rowId) ?? {
      id: rowId,
      paper: result.paper,
      year: result.paper.year,
      citation: result.paper.citation,
      systemName: result.system_name,
      methodFamilies: [],
      modelTypes: [],
      variants: [],
      cells: {},
      searchableText: "",
    };

    addUnique(row.methodFamilies, result.method_family);
    addUnique(row.modelTypes, result.model_type);
    addUnique(row.variants, result.model_variant);
    row.cells[columnId] = { result };
    row.searchableText = [
      row.citation,
      row.systemName,
      row.year,
      row.methodFamilies.join(" "),
      row.modelTypes.join(" "),
      row.variants.join(" "),
      result.paper.title,
    ].join(" ");

    rowsById.set(rowId, row);
  }

  const columns = [...columnsById.values()].sort((a, b) => {
    const datasetCompare =
      (datasetOrder.get(a.datasetId) ?? 999) - (datasetOrder.get(b.datasetId) ?? 999);
    if (datasetCompare !== 0) return datasetCompare;
    const splitCompare = splitWeight(a.split) - splitWeight(b.split);
    if (splitCompare !== 0) return splitCompare;
    const metricCompare = a.metric.localeCompare(b.metric);
    if (metricCompare !== 0) return metricCompare;
    const unitCompare = unitWeight(a.unit) - unitWeight(b.unit);
    if (unitCompare !== 0) return unitCompare;
    return a.scorer.localeCompare(b.scorer);
  });

  const groupsByDataset = new Map<string, MatrixColumn[]>();
  for (const column of columns) {
    const group = groupsByDataset.get(column.datasetId) ?? [];
    group.push(column);
    groupsByDataset.set(column.datasetId, group);
  }

  const groups = [...groupsByDataset.entries()].map(([datasetId, groupColumns]) => {
    const dataset = datasetMap.get(datasetId);
    if (!dataset) {
      throw new Error(`Unknown dataset in matrix columns: ${datasetId}`);
    }

    return {
      dataset,
      columns: groupColumns,
    };
  });

  const rows = [...rowsById.values()].sort((a, b) => {
    const yearCompare = b.year - a.year;
    if (yearCompare !== 0) return yearCompare;
    return a.citation.localeCompare(b.citation);
  });

  return { groups, rows };
}

export function sortMatrixRows(rows: MatrixRow[], sortState: MatrixSortState | null): MatrixRow[] {
  if (!sortState) return rows;

  return [...rows].sort((a, b) => {
    if (sortState.columnId === YEAR_SORT_COLUMN_ID) {
      const yearCompare = a.year - b.year;
      if (yearCompare !== 0) {
        return sortState.direction === "asc" ? yearCompare : -yearCompare;
      }

      const citationCompare = a.citation.localeCompare(b.citation);
      if (citationCompare !== 0) return citationCompare;
      return a.systemName.localeCompare(b.systemName);
    }

    const left = a.cells[sortState.columnId]?.result.score;
    const right = b.cells[sortState.columnId]?.result.score;

    if (left === undefined && right === undefined) {
      const yearCompare = b.year - a.year;
      if (yearCompare !== 0) return yearCompare;
      return a.citation.localeCompare(b.citation);
    }
    if (left === undefined) return 1;
    if (right === undefined) return -1;

    const scoreCompare = left - right;
    if (scoreCompare !== 0) {
      return sortState.direction === "asc" ? scoreCompare : -scoreCompare;
    }

    return a.citation.localeCompare(b.citation);
  });
}

export function matrixToCsv(groups: MatrixDatasetGroup[], rows: MatrixRow[]): string {
  const columns = groups.flatMap((group) => group.columns);
  const header = [
    "paper/system",
    "year",
    "method_family",
    "model_type",
    "variant",
    ...columns.map((column) => `${column.datasetName} ${column.standardLabel} ${column.detailLabel}`),
  ];

  const body = rows.map((row) => [
    `${row.citation} - ${row.systemName}`,
    row.year,
    row.methodFamilies.join("; "),
    row.modelTypes.join("; "),
    row.variants.join("; "),
    ...columns.map((column) => row.cells[column.id]?.result.score_display ?? ""),
  ]);

  return [header, ...body].map((line) => line.map(escapeCsvCell).join(",")).join("\n");
}

function makeRowId(result: EnrichedResult): string {
  return [
    result.paper_id,
    result.system_name,
    result.model_variant,
    result.method_family,
    result.model_type,
  ]
    .join("__")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function makeStandardLabel(result: EnrichedResult): string {
  return `${result.split} ${result.metric}`;
}

function makeDetailLabel(result: EnrichedResult): string {
  const unit = result.unit === "unknown" ? "unknown unit" : `${result.unit}-level`;
  return `${unit} / ${result.scorer}`;
}

function addUnique(target: string[], value: string) {
  if (value && !target.includes(value)) {
    target.push(value);
  }
}

function splitWeight(split: string): number {
  if (split.includes("test")) return 0;
  if (split.includes("dev")) return 1;
  if (split.includes("validation")) return 2;
  return 3;
}

function unitWeight(unit: string): number {
  const order = ["character", "word/span", "word", "span", "unknown", "official", "diagnosis"];
  const index = order.indexOf(unit);
  return index === -1 ? 99 : index;
}

function escapeCsvCell(value: string | number): string {
  const text = String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}
