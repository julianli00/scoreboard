export type Dataset = {
  id: string;
  name: string;
  aliases: string[];
  population: string;
  domain: string;
  localization_basis: string;
  correction_format: string;
  multi_reference: string;
  common_metrics: string[];
  evaluation_notes: string;
  url: string;
  notes: string;
  source: string;
};

export type Paper = {
  id: string;
  citation: string;
  title: string;
  year: number;
  venue: string;
  paper_url: string;
  code_url: string;
  verified_source: string;
  datasets_reported: string[];
  metrics_reported: string[];
  notes: string;
};

export type Result = {
  id: string;
  paper_id: string;
  dataset_id: string;
  split: string;
  system_name: string;
  method_family: string;
  model_variant: string;
  metric: string;
  unit: string;
  scorer: string;
  score: number;
  score_display: string;
  higher_is_better: boolean;
  rank_group: string;
  model_type: string;
  source: string;
  source_quote_or_page: string;
  verified: boolean;
  notes: string;
};

export type EnrichedResult = Result & {
  paper: Paper;
  dataset: Dataset;
  rank: number | null;
  isBestInGroup: boolean;
};

export type SortKey =
  | "rank"
  | "paper"
  | "year"
  | "score"
  | "method"
  | "unit"
  | "metric";

export type SortState = {
  key: SortKey;
  direction: "asc" | "desc";
};
