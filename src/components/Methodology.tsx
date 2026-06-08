import { FileCheck2, GitPullRequest, ShieldCheck } from "lucide-react";

export function Methodology() {
  return (
    <section className="section policy-section" id="policy">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Methodology</p>
          <h2>Published-paper-only data policy</h2>
        </div>
        <p>
          Scores are grouped by dataset, split, metric, evaluation unit, and
          scorer. Unknowns stay visible until the original paper resolves them.
        </p>
      </div>

      <div className="policy-grid">
        <article>
          <FileCheck2 aria-hidden="true" />
          <h3>Source of truth</h3>
          <p>
            V1 uses manually curated rows from the local CGEC survey PDF. Future
            rows should cite the original published paper, table, page, scorer,
            and split.
          </p>
        </article>
        <article>
          <ShieldCheck aria-hidden="true" />
          <h3>Comparison rules</h3>
          <p>
            Character-level, word-level, span-level, official, detection, and
            correction metrics are never merged into one global rank.
          </p>
        </article>
        <article>
          <GitPullRequest aria-hidden="true" />
          <h3>Submit / update</h3>
          <p>
            Authors can open a GitHub issue or pull request with a paper link,
            reported table, dataset split, score, evaluation unit, scorer, and
            any preprocessing notes.
          </p>
        </article>
      </div>

      <div className="future-work">
        <h3>Future local extraction workflow</h3>
        <p>
          A maintainer may later process an authorized PDF locally with an LLM,
          output structured JSON, manually verify each field, and add the result
          to the static data files. The public V1 site has no account system, no
          live PDF upload, and no server-side evaluation.
        </p>
      </div>
    </section>
  );
}
