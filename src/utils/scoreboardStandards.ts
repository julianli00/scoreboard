import type { Result } from "./types";

export type ExcludedStandard = {
  datasetId: string;
  paperId: string;
  resultId: string;
  split: string;
  metric: string;
  unit: string;
  scorer: string;
  systemName: string;
  reason: string;
};

export type MarkedStandard = ExcludedStandard;

const DEFAULT_SCORER = "ChERRANT";

export function standardizeScoreboardResults(results: Result[]): {
  included: Result[];
  marked: MarkedStandard[];
  excluded: ExcludedStandard[];
} {
  const included: Result[] = [];
  const marked: MarkedStandard[] = [];
  const excluded: ExcludedStandard[] = [];

  for (const result of results) {
    if (result.metric !== "F0.5" || !isTestSplit(result.split)) {
      continue;
    }

    const unit = normalizeUnit(result.unit);
    if (!unit) {
      excluded.push({
        datasetId: result.dataset_id,
        paperId: result.paper_id,
        resultId: result.id,
        split: result.split,
        metric: result.metric,
        unit: result.unit,
        scorer: result.scorer,
        systemName: result.system_name,
        reason: "Unsupported F0.5 unit for the compact standard view",
      });
      continue;
    }

    const domainLabel = getDomainLabel(result.split);
    const hasMarkedScorer = hasExplicitNonDefaultScorer(result.scorer);
    if (hasMarkedScorer) {
      marked.push({
        datasetId: result.dataset_id,
        paperId: result.paper_id,
        resultId: result.id,
        split: result.split,
        metric: result.metric,
        unit: normalizeUnitLabel(result.unit),
        scorer: result.scorer,
        systemName: result.system_name,
        reason: "Explicit non-ChERRANT F0.5 scorer included in compact table",
      });
    }

    const notes = [
      result.notes,
      result.unit !== unit ? "Display unit normalized to word/span-level." : "",
      result.scorer === "unknown" ? "Display scorer defaults to ChERRANT." : "",
      hasMarkedScorer ? `Original scorer explicitly reported as ${result.scorer}.` : "",
      domainLabel ? `Original split retained in row label: ${domainLabel} test.` : "",
    ]
      .filter(Boolean)
      .join(" ");
    const scorerLabel = hasMarkedScorer ? result.scorer : "";
    const rowQualifiers = [domainLabel ? `${domainLabel} test` : "", scorerLabel].filter(Boolean);

    included.push({
      ...result,
      split: "test",
      system_name: rowQualifiers.length
        ? `${result.system_name} (${rowQualifiers.join("; ")})`
        : result.system_name,
      model_variant: rowQualifiers.length
        ? `${result.model_variant} / ${rowQualifiers.join("; ")}`
        : result.model_variant,
      unit,
      scorer: DEFAULT_SCORER,
      rank_group: [
        result.dataset_id,
        "test",
        "f0.5",
        standardKey(unit),
        "cherrant",
      ].join("__"),
      notes,
    });
  }

  return { included, marked, excluded };
}

function isTestSplit(split: string): boolean {
  const value = split.toLowerCase();
  return value.includes("test") && !value.includes("validation") && !value.includes("dev");
}

function hasExplicitNonDefaultScorer(scorer: string): boolean {
  const value = scorer.trim().toLowerCase();
  return value !== "" && value !== "unknown" && !value.includes("cherrant");
}

function normalizeUnit(unit: string): string {
  const value = unit.trim().toLowerCase();
  if (value === "character") return "character";
  if (value === "word" || value === "span") return "word/span";
  if (value === "unknown") return "unknown";
  return "";
}

function normalizeUnitLabel(unit: string): string {
  return normalizeUnit(unit) || unit;
}

function getDomainLabel(split: string): string {
  const value = split
    .replace(/\btest\b/gi, "")
    .replace(/[_-]+/g, " ")
    .trim();

  if (!value) return "";
  return value
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function standardKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
