import type { EnrichedResult } from "./types";
import { normalizeLabel } from "./formatScore";

export type FilterState = {
  query: string;
  metric: string;
  unit: string;
  methodFamily: string;
  modelType: string;
};

export function filterResults(
  results: EnrichedResult[],
  filters: FilterState,
): EnrichedResult[] {
  const query = normalizeLabel(filters.query);

  return results.filter((result) => {
    const haystack = normalizeLabel(
      [
        result.paper.citation,
        result.paper.title,
        result.paper.year,
        result.dataset.name,
        result.system_name,
        result.method_family,
        result.model_variant,
        result.metric,
        result.unit,
        result.scorer,
        result.model_type,
        result.notes,
      ].join(" "),
    );

    return (
      (!query || haystack.includes(query)) &&
      (!filters.metric || result.metric === filters.metric) &&
      (!filters.unit || result.unit === filters.unit) &&
      (!filters.methodFamily || result.method_family === filters.methodFamily) &&
      (!filters.modelType || result.model_type === filters.modelType)
    );
  });
}

export function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].filter(Boolean).sort((a, b) => a.localeCompare(b));
}

export function toCsv(results: EnrichedResult[]): string {
  const header = [
    "dataset",
    "split",
    "rank_group",
    "rank",
    "paper",
    "year",
    "system",
    "method_family",
    "model_variant",
    "metric",
    "unit",
    "scorer",
    "score",
    "source",
    "notes",
  ];

  const rows = results.map((result) => [
    result.dataset.name,
    result.split,
    result.rank_group,
    result.rank ?? "",
    result.paper.citation,
    result.paper.year,
    result.system_name,
    result.method_family,
    result.model_variant,
    result.metric,
    result.unit,
    result.scorer,
    result.score_display,
    `${result.source}; ${result.source_quote_or_page}`,
    result.notes,
  ]);

  return [header, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}

function escapeCsvCell(value: string | number): string {
  const text = String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}
