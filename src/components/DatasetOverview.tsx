import { Database, ExternalLink } from "lucide-react";
import type { Dataset, EnrichedResult } from "../utils/types";
import { MetricBadge } from "./MetricBadge";

type DatasetOverviewProps = {
  datasets: Dataset[];
  results: EnrichedResult[];
  activeDatasetId: string;
  onSelectDataset: (id: string) => void;
};

export function DatasetOverview({
  datasets,
  results,
  activeDatasetId,
  onSelectDataset,
}: DatasetOverviewProps) {
  return (
    <section className="section" id="datasets">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Dataset Overview</p>
          <h2>Benchmarks stay separate</h2>
        </div>
        <p>
          Dataset population, source domain, correction format, references, and
          evaluation unit are first-class fields.
        </p>
      </div>

      <div className="dataset-grid">
        {datasets.map((dataset) => {
          const datasetResults = results.filter((result) => result.dataset_id === dataset.id);
          const isActive = dataset.id === activeDatasetId;

          return (
            <article className={`dataset-card ${isActive ? "is-active" : ""}`} key={dataset.id}>
              <div className="dataset-card-header">
                <button
                  aria-pressed={isActive}
                  className="dataset-card-select"
                  onClick={() => onSelectDataset(dataset.id)}
                  type="button"
                >
                  <span className="dataset-icon" aria-hidden="true">
                    <Database size={18} />
                  </span>
                  <span className="dataset-name">{dataset.name}</span>
                </button>
                {dataset.url ? (
                  <a
                    aria-label={`${dataset.name} source link`}
                    className="mini-link source-link"
                    href={dataset.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Source
                    <ExternalLink size={14} />
                  </a>
                ) : null}
              </div>

              <div className="dataset-meta">
                <MetricBadge label={dataset.population} tone="unit" />
                <span>{datasetResults.length} results</span>
              </div>

              <p>{dataset.domain}</p>
              <dl>
                <div>
                  <dt>Format</dt>
                  <dd>{dataset.correction_format}</dd>
                </div>
                <div>
                  <dt>References</dt>
                  <dd>{dataset.multi_reference}</dd>
                </div>
              </dl>
            </article>
          );
        })}
      </div>
    </section>
  );
}
