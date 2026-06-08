import type { Dataset, EnrichedResult, Paper, Result, SortState } from "./types";

export function enrichResults(
  results: Result[],
  papers: Paper[],
  datasets: Dataset[],
): EnrichedResult[] {
  const paperMap = new Map(papers.map((paper) => [paper.id, paper]));
  const datasetMap = new Map(datasets.map((dataset) => [dataset.id, dataset]));

  const byGroup = new Map<string, Result[]>();
  for (const result of results) {
    const group = byGroup.get(result.rank_group) ?? [];
    group.push(result);
    byGroup.set(result.rank_group, group);
  }

  const ranks = new Map<string, { rank: number; isBestInGroup: boolean }>();
  for (const groupResults of byGroup.values()) {
    const sorted = [...groupResults].sort((a, b) => {
      return a.higher_is_better ? b.score - a.score : a.score - b.score;
    });

    let rank = 0;
    let previousScore: number | null = null;
    for (let index = 0; index < sorted.length; index += 1) {
      const result = sorted[index];
      if (previousScore === null || result.score !== previousScore) {
        rank = index + 1;
        previousScore = result.score;
      }

      ranks.set(result.id, {
        rank,
        isBestInGroup: rank === 1,
      });
    }
  }

  return results.map((result) => {
    const paper = paperMap.get(result.paper_id);
    const dataset = datasetMap.get(result.dataset_id);
    const rankInfo = ranks.get(result.id);

    if (!paper || !dataset || !rankInfo) {
      throw new Error(`Invalid result reference: ${result.id}`);
    }

    return {
      ...result,
      paper,
      dataset,
      rank: rankInfo.rank,
      isBestInGroup: rankInfo.isBestInGroup,
    };
  });
}

export function sortResults(
  results: EnrichedResult[],
  sortState: SortState,
): EnrichedResult[] {
  const multiplier = sortState.direction === "asc" ? 1 : -1;

  return [...results].sort((a, b) => {
    if (sortState.key === "rank") {
      const rankCompare = (a.rank ?? 9999) - (b.rank ?? 9999);
      if (rankCompare !== 0) return rankCompare;
      return b.score - a.score;
    }

    if (sortState.key === "score") {
      return (a.score - b.score) * multiplier;
    }

    if (sortState.key === "year") {
      return (a.paper.year - b.paper.year) * multiplier;
    }

    const fieldA = getStringSortValue(a, sortState.key);
    const fieldB = getStringSortValue(b, sortState.key);
    return fieldA.localeCompare(fieldB) * multiplier;
  });
}

function getStringSortValue(result: EnrichedResult, key: SortState["key"]): string {
  switch (key) {
    case "paper":
      return result.paper.citation;
    case "method":
      return result.method_family;
    case "unit":
      return result.unit;
    case "metric":
      return result.metric;
    default:
      return result.id;
  }
}

export function groupResultsByRankGroup(results: EnrichedResult[]): Map<string, EnrichedResult[]> {
  const groups = new Map<string, EnrichedResult[]>();

  for (const result of results) {
    const group = groups.get(result.rank_group) ?? [];
    group.push(result);
    groups.set(result.rank_group, group);
  }

  return new Map(
    [...groups.entries()].sort(([, a], [, b]) => {
      const left = a[0];
      const right = b[0];
      const datasetCompare = left.dataset.name.localeCompare(right.dataset.name);
      if (datasetCompare !== 0) return datasetCompare;
      const splitCompare = left.split.localeCompare(right.split);
      if (splitCompare !== 0) return splitCompare;
      const metricCompare = left.metric.localeCompare(right.metric);
      if (metricCompare !== 0) return metricCompare;
      return left.unit.localeCompare(right.unit);
    }),
  );
}

export function rankGroupLabel(results: EnrichedResult[]): string {
  const first = results[0];
  const scorer = first.scorer === "unknown" ? "unknown scorer" : first.scorer;
  return `${first.dataset.name} / ${first.split} / ${first.metric} / ${first.unit} / ${scorer}`;
}
