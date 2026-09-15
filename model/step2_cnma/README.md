# Step 2 — CNMA (component network meta-analysis)

Fitting source for `src/lib/data/nma-posterior.json`, which `src/lib/model.ts`
reads at runtime (see that file's header comment for the math). The fit is a
PyMC model, its posterior saved via ArviZ as a `.nc` (NetCDF) file, plus a
companion `manifest.json` carrying the structural metadata (model name,
study/component order, allowed component packages, the Step‑1 risk‑score
training range).

## Files you should have from whoever ran the fit

- **`*_posterior.nc`** — an ArviZ `InferenceData` (`idata.to_netcdf(...)`).
  Its `posterior` group holds the actual MCMC draws for `alpha_study`
  (per study), `lambda_risk`, `beta_component` (per component),
  `delta_component_risk` (per component), `sigma` — 4 chains × 4000 draws
  each, per the file already committed.
- **`*_manifest.json`** — structural metadata that isn't a statistic, using
  these exact snake_case keys (verified against a real manifest 2026-09-15
  — see `MANIFEST_REQUIRED_FIELDS` in the script for the source of truth
  if this ever drifts):
  - `model_name`, `artifact_version`, `outcome`
  - `study_order`, `component_order` — lists of names. Cross-checked by
    the script against the `.nc` file's own coordinate labels (exact
    match, order-sensitive) before anything is exported.
  - `allowed_component_packages` — a **list of objects**, one per package,
    each mapping `{component_name: 0 | 1}` (not a list of arrays — the
    script converts to the array shape `nma-posterior.json` uses,
    positionally ordered by `component_order`, validating every package's
    keys match `component_order` exactly).
  - `risk_score` — an object with (at least) `training_min` and
    `training_max`; other fields (`source`, `transformation`, ...) are
    provenance notes and aren't carried into the output.
  - There is **no `thinning` field** — that's a `--thinning` CLI flag on
    `export` instead (default 8, matching the committed file), since it's
    an export-time choice, not something the model-fitting side records.

## Setup

Requires `arviz`, `xarray`, `netCDF4`, `numpy` (not part of this repo's own
JS toolchain — this is dev-time tooling, run locally, the same way
`export_risk_model_json.R` needs a local R + `rms`). **Use a dedicated
virtualenv, not your system/global Python** — a global `numpy` shared with
other projects is a common source of broken installs (mixed pip/conda
installs, architecture mismatches on Apple Silicon, etc.) that have
nothing to do with this script but will crash it with a confusing
C-extension import error:

```sh
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r model/step2_cnma/requirements.txt
```

## Regenerating `nma-posterior.json`

```sh
# 1. Inspect first — structure only, no values, and flags any group
#    besides "posterior" so you know what else is in the file.
python3 model/step2_cnma/export_nma_posterior_json.py inspect \
  model/step2_cnma/source/posterior.nc

# 2. Export.
python3 model/step2_cnma/export_nma_posterior_json.py export \
  model/step2_cnma/source/posterior.nc \
  model/step2_cnma/source/manifest.json
```

This overwrites `src/lib/data/nma-posterior.json` and then, if `bun` is on
your `PATH`, runs `bunx prettier --write` on it automatically — Python's
`json.dump` always breaks every nested array one-element-per-line
regardless of `indent`, which is valid JSON but produces an ~8x larger,
unreviewable diff; Prettier collapses short arrays/objects onto one line
the same way the committed file already looks. If `bun` isn't found, the
script prints a reminder to run `bun run format -- src/lib/data/nma-posterior.json`
yourself before committing — the file is still correct either way, just
harder to review unformatted.

Diff it before committing — see "What a good diff looks like" below.

## ⚠️ Data safety — read before touching this directory

Same issue as the Step 1 `.rds` (see `model/step1_risk_score/README.md`),
different container: an ArviZ `InferenceData` can carry groups beyond
`posterior` — `observed_data`, `constant_data`, `log_likelihood`,
`posterior_predictive`, `sample_stats` — and for a model built straight
from a per-patient DataFrame (as this one was), those groups can embed
real per-patient covariates or outcomes, indexed by observation.

Rules for this directory:

- **Never commit a `.nc` or `manifest.json` here.** Put both under
  `model/step2_cnma/source/`, which `model/.gitignore` ignores wholesale
  (folder-based, not by extension — deliberately, since `manifest.json`
  has no distinguishing extension of its own). Don't rely on the ignore
  rule alone — treat anything under `source/` as sensitive by default.
- **`export_nma_posterior_json.py` must only ever read the `posterior`
  group.** `inspect` lists other group _names_ (via `netCDF4` directly, no
  values) specifically so you can check what else is in a new file before
  trusting it. If you're extending this script, do not add code that reads
  `observed_data`, `constant_data`, `log_likelihood`,
  `posterior_predictive`, or `sample_stats`.
- Everything this script exports is a hyperparameter (per-study or
  per-component posterior draws/summaries) — never a per-patient value.

## What a good diff looks like

Re-running the export against the _same_ fit should change
`src/lib/data/nma-posterior.json` in only two ways, neither of which is
"the model changed":

1. **Precision/rounding** in `draws` and `summary` (this script rounds
   draws to 5 dp and summaries to 4 dp by default, matching the committed
   file's convention — see `--draws-round` to change it).
2. **Different posterior draws for the same chains/draws/thinning config**
   if MCMC was literally re-run (even an identical model re-sampled gets a
   different RNG stream) — small shifts in `draws`/`summary`, not a
   different `nDraws` count or different `studyOrder`/`componentOrder`/
   `allowedComponentPackages`.

If a diff changes `nDraws`, reorders/renames studies or components, or
changes `allowedComponentPackages`, that's a structural change — stop and
make sure `src/lib/model.ts`'s hardcoded `COMPONENT_ORDER` (which relies on
_positional_ correspondence with this file's arrays, not name matching —
see that file) still lines up before committing.

## Step 1 / Step 2 coupling

See `model/step1_risk_score/README.md`'s "Step 1 / Step 2 coupling"
section — it applies here too, in the other direction: this file's
`lambda_risk` / `delta_component_risk` were fit against a specific Step‑1
`risk_score` distribution. Refitting Step 2 alone (new trial data, a
different `allowed_component_packages` set) is fine; refitting _Step 1_
without also refitting Step 2 against the new `risk_score` values is not
(the coefficients here would still work, just against a subtly wrong
target). This file's `riskScore.trainingMin`/`trainingMax` field is also
manually duplicated as the hardcoded `RISK_SCORE_TRAINING` constant in
`src/lib/riskScore.ts:38-41` — if that range changes here, update it there
too; nothing currently checks the two stay in sync.
