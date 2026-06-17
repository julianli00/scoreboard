import { ExternalLink } from "lucide-react";
import type { EnrichedResult, Paper } from "../utils/types";
import { MetricBadge } from "./MetricBadge";

type PaperListProps = {
  papers: Paper[];
  results: EnrichedResult[];
};

export function PaperList({ papers, results }: PaperListProps) {
  return (
    <section className="section" id="papers">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Bibliography</p>
          <h2>Papers currently represented</h2>
        </div>
        <p>
          Citation-style names make the table easy to reuse when preparing
          previous-work comparison sections.
        </p>
      </div>

      <div className="paper-list">
        {papers.map((paper) => {
          const paperResults = results.filter((result) => result.paper_id === paper.id);

          return (
            <article className="paper-item" key={paper.id}>
              <div className="paper-main">
                <h3>{paper.citation}</h3>
                <p>{paper.title}</p>
                <small className="paper-venue">
                  {paper.venue} / {paper.year}
                </small>
                {paper.notes ? <small className="paper-note">{paper.notes}</small> : null}
              </div>
              <div className="paper-tags">
                {paper.datasets_reported.map((dataset) => (
                  <MetricBadge key={`dataset-${dataset}`} label={dataset} tone="unit" />
                ))}
                {paper.metrics_reported.slice(0, 3).map((metric) => (
                  <MetricBadge key={`metric-${metric}`} label={metric} tone="metric" />
                ))}
                <MetricBadge label={`${paperResults.length} rows`} tone="source" />
              </div>
              <div className="paper-actions">
                {paper.paper_url ? (
                  <a className="paper-link" href={paper.paper_url} rel="noreferrer" target="_blank">
                    <ExternalLink size={14} />
                    Paper
                  </a>
                ) : null}
                {paper.code_url ? (
                  <a className="paper-link" href={paper.code_url} rel="noreferrer" target="_blank">
                    <ExternalLink size={14} />
                    Code
                  </a>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
