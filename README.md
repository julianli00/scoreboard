# CGEC Scoreboard

A static, GitHub Pages-compatible prototype for a Chinese Grammatical Error
Correction scoreboard. It is a curated previous-work comparison resource, not a
public prediction-upload evaluator.

Live site: https://julianli00.github.io/scoreboard/

The initial data is seeded from a local CGEC survey PDF, especially Table 2,
Table 5, and Table 6.

## What V1 Includes

- Dataset overview cards for CGED, NLPCC2018, MuCGEC, YACLC, FlaCGEC, FCGEC,
  CCTC, NaCGEC, NaSGEC, and CEFE.
- A two-dimensional comparison matrix: rows are paper/system/model entries,
  top-level columns are datasets, and second-level columns are evaluation
  standards such as `test F0.5 / word-level` or `test F0.5 / span-level /
  ChERRANT`.
- Clickable standard headers for ascending/descending score sorting. Missing
  scores remain visible as `—` and stay at the bottom when sorting by a score
  column.
- Rank groups scoped by dataset, split, metric, evaluation unit, and scorer.
- Badges for character, word, span, ChERRANT, official, diagnosis, model type,
  and unknown units.
- Search and filters by paper/system/year text, metric, unit, method family, and
  model type.
- CSV export for both the filtered row ledger and the current matrix view, plus
  JSON export for the raw result data.
- A bibliography section and a published-paper-only data policy.

## Run Locally

```bash
npm install
npm run validate:data
npm run dev
```

Then open the URL printed by Vite, usually `http://localhost:5173`.

## Build

```bash
npm run validate:data
npm run build
```

The static site is emitted to `dist/`.

## Deploy to GitHub Pages

This project uses `base: "./"` in `vite.config.ts`, so the built assets work
under a project subpath.

GitHub Pages is deployed by `.github/workflows/pages.yml`. Each push to `main`
runs data validation, builds the Vite app, and publishes `dist/` as the Pages
artifact.

## Data Files

```text
src/data/datasets.json
src/data/papers.json
src/data/results.json
src/data/aliases.json
```

### Add a Dataset

Add one object to `src/data/datasets.json` with:

- `id`
- `name`
- `aliases`
- `population`
- `domain`
- `localization_basis`
- `correction_format`
- `multi_reference`
- `common_metrics`
- `evaluation_notes`
- `url`
- `notes`
- `source`

Also add aliases to `src/data/aliases.json` if the dataset has common short
names.

### Add a Paper

Add one object to `src/data/papers.json` with a stable `id`, citation label,
title, year, venue, URLs if available, datasets reported, metrics reported, and
verification notes.

Use citation-style labels such as `Zhao and Wang (2020)` or
`Yang and Quan (2024)`.

### Add a Result

Add one object to `src/data/results.json`.

Required fields include:

- `paper_id`
- `dataset_id`
- `split`
- `system_name`
- `method_family`
- `metric`
- `unit`
- `scorer`
- `score`
- `score_display`
- `higher_is_better`
- `rank_group`
- `model_type`
- `source`
- `source_quote_or_page`
- `verified`
- `notes`

Use `unknown` only when the original paper or survey table does not make the
unit/scorer clear. Keep that uncertainty visible in `notes`.

## Ranking Rules

Rows are ranked only within `rank_group`:

```text
{dataset_id}__{split}__{metric}__{unit}__{scorer}
```

Examples:

```text
nlpcc2018__test__f0.5__word__unknown
fcgec__test__f0.5__span__cherrant
```

Do not rank character-level F0.5 against word-level F0.5, span-level ChERRANT
F0.5, official scores, detection F1, or correction F1. Do not rank dev,
validation, and test splits together.

## Matrix Layout

The primary scoreboard view follows the meeting-note comparison-table idea:

```text
Paper/System rows x Dataset/Standard columns
```

The first header row groups columns by dataset, for example `NLPCC2018`,
`MuCGEC`, `FCGEC`, and `NaCGEC`. The second header row contains the exact
evaluation standard derived from each result's rank group:

- split
- metric
- unit
- scorer

Examples:

```text
NLPCC2018 -> test F0.5 -> word-level
MuCGEC -> test F0.5 -> span-level / ChERRANT
CGED -> CGED 2021 test Official score -> official-level / CGED shared task
```

Click a second-level standard header to sort models by that score. Click the
same header again to toggle ascending/descending order. This sort is only for
the selected column; it does not create a global cross-dataset ranking.

## Validation

Run:

```bash
npm run validate:data
```

The script checks:

- every result references a valid paper and dataset
- required result fields are present
- rank groups do not mix units or scorers
- likely duplicate rows
- scores that may be on the wrong 0-1 vs percentage scale
- rows whose unit is still unknown

Warnings are expected for intentionally marked `unknown` units in this prototype.
Errors should be fixed before deployment.

## Future Local LLM Extraction

V1 deliberately has no backend. A later maintainer workflow can be:

1. Receive an official paper URL or authorized PDF.
2. Verify publication source, preferably ACL Anthology, publisher, or official
   proceedings.
3. Run a local LLM extraction prompt.
4. Produce structured JSON.
5. Manually verify dataset, split, metric, unit, scorer, score, and table/page.
6. Add rows to `results.json`.
7. Run validation and rebuild the static site.

## Known Prototype Uncertainties

- Some NLPCC2018 Table 5 rows report F0.5 without explicitly stating character
  or word unit in the survey table. These rows are marked `unit: "unknown"`.
- Some paper URLs are not yet filled because the seed data was verified from the
  local survey table first.
- The scoreboard is not complete and should be presented as an initial curated
  prototype.

## Demo Notes

For a meeting demo, show:

- the reason CGEC needs a broad previous-work comparison table
- the two-dimensional matrix where rows are models and columns are grouped by
  dataset, then evaluation standard
- sorting NLPCC2018 word-level F0.5 descending and ascending from the column
  header
- the FCGEC columns showing span-level ChERRANT and dev/test split separation
- the dataset overview cards from survey Table 2
- the data policy and JSON/CSV maintenance path
