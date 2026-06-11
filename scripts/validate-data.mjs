import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const datasets = readJson("src/data/datasets.json");
const papers = readJson("src/data/papers.json");
const results = readJson("src/data/results.json");

const datasetIds = new Set(datasets.map((dataset) => dataset.id));
const paperIds = new Set(papers.map((paper) => paper.id));
const errors = [];
const warnings = [];

for (const dataset of datasets) {
  for (const field of [
    "id",
    "name",
    "population",
    "domain",
    "localization_basis",
    "correction_format",
    "error_label_explicitness",
    "multi_reference",
    "documentation_qc",
    "evaluation_notes",
    "source",
  ]) {
    if (dataset[field] === undefined || dataset[field] === "") {
      errors.push(`${dataset.id ?? "unknown dataset"}: missing required dataset field ${field}`);
    }
  }
}

for (const result of results) {
  if (!paperIds.has(result.paper_id)) {
    errors.push(`${result.id}: unknown paper_id ${result.paper_id}`);
  }

  if (!datasetIds.has(result.dataset_id)) {
    errors.push(`${result.id}: unknown dataset_id ${result.dataset_id}`);
  }

  for (const field of ["metric", "unit", "source", "rank_group", "split", "score"]) {
    if (result[field] === undefined || result[field] === "") {
      errors.push(`${result.id}: missing required field ${field}`);
    }
  }

  if (typeof result.score !== "number" || Number.isNaN(result.score)) {
    errors.push(`${result.id}: score must be numeric`);
  }

  if (/f0\.5|f1|gleu|official/i.test(result.metric) && result.score > 1) {
    warnings.push(`${result.id}: score ${result.score} is above 1.0; confirm scale`);
  }

  if (result.unit === "unknown") {
    warnings.push(`${result.id}: unit is unknown and should remain visible as an unknown-unit column`);
  }

  if (!String(result.rank_group).startsWith(`${result.dataset_id}__`)) {
    warnings.push(`${result.id}: rank_group should start with dataset_id`);
  }
}

const duplicateKeys = new Map();
for (const result of results) {
  const key = [
    result.paper_id,
    result.dataset_id,
    result.split,
    result.metric,
    result.unit,
    result.scorer,
    result.system_name,
  ].join(" | ");
  const seen = duplicateKeys.get(key) ?? [];
  seen.push(result.id);
  duplicateKeys.set(key, seen);
}

for (const [key, ids] of duplicateKeys.entries()) {
  if (ids.length > 1) {
    warnings.push(`possible duplicate rows for ${key}: ${ids.join(", ")}`);
  }
}

const rankGroups = new Map();
for (const result of results) {
  const rows = rankGroups.get(result.rank_group) ?? [];
  rows.push(result);
  rankGroups.set(result.rank_group, rows);
}

for (const [rankGroup, rows] of rankGroups.entries()) {
  const units = new Set(rows.map((result) => result.unit));
  const scorers = new Set(rows.map((result) => result.scorer));
  if (units.size > 1) {
    errors.push(`${rankGroup}: mixes units ${[...units].join(", ")}`);
  }
  if (scorers.size > 1) {
    errors.push(`${rankGroup}: mixes scorers ${[...scorers].join(", ")}`);
  }
}

printList("Warnings", warnings);
printList("Errors", errors);

console.log(
  `Validated ${datasets.length} datasets, ${papers.length} papers, ${results.length} results, ${rankGroups.size} rank groups.`,
);

if (errors.length > 0) {
  process.exitCode = 1;
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function printList(label, items) {
  if (items.length === 0) {
    console.log(`${label}: none`);
    return;
  }

  console.log(`${label}:`);
  for (const item of items) {
    console.log(`- ${item}`);
  }
}
