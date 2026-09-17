# Step 1 — risk score (proportional-odds mixed model)

Fitting source for `src/lib/data/risk-model.json`, the coefficient file
`src/lib/riskScore.ts` reads at runtime (see that file's header comment for
the math). The fit itself is an `ordinal::clmm` proportional-odds mixed
model in R, with per-study random effects (see `risk_score_model.R` in the
`collaborative_care_analysis` repo):

```r
ordered(y) ~ y0_c + ns(age_c, knots = age_knots[2:3], Boundary.knots = age_knots[c(1, 4)]) + sex +
  (1 | study) + (0 + y0_c | study)
```

`y0_c`/`age_c` are centered/scaled baseline PHQ-9 and age; the risk score
this app uses (`eta`) is the model's linear predictor with the per-study
random effect set to zero, **not** an expected 0–27 PHQ-9 value like the
previous `rms::orm`-based Step 1 model. GAD-7 was dropped as a predictor in
this refit.

## Regenerating `risk-model.json` from a fitted model

```sh
Rscript model/step1_risk_score/export_risk_model_json.R /path/to/risk_score_model.rds
```

This overwrites `src/lib/data/risk-model.json`. Diff it before committing.

The `.rds` is the `model` list `risk_score_model.R`'s `fit_and_export()`
saves — aggregate parameters only (`thresholds`, `beta`, `fixed_form`,
`age_knots`, `age_range`, `scaling`, `ylevels`, `sex_levels`, `sigma0`,
`sigma1`, `n_studies`, `n_dev`, `cohort`, `fitted_on`, `r_version`) — that
script never stores the fitted `clmm` object itself, since that would carry
the development data.

### Why the browser doesn't run `splines::ns()`

Age enters via `splines::ns()`, a natural cubic spline. Rather than port
`ns()`'s own basis construction (B-spline design matrix + a QR-based
natural-boundary-condition transform) into TypeScript, the export script
evaluates the fitted age contribution — `g(age_c) = ns(age_c, ...) %*%
beta[ns_names]` — at exactly the 4 knots, and `src/lib/riskScore.ts`
reconstructs `g()` for any `age_c` from just those 4 numbers via a
from-scratch natural cubic spline (tridiagonal solve + standard
interpolation/extrapolation). This is exact, not an approximation: `g()` is
itself a fixed linear combination of natural-cubic-spline basis functions,
so it's itself a natural cubic spline with knots at `age_knots`, uniquely
determined by its own values at those knots plus the natural (zero
second-derivative) boundary condition beyond the outer two. Verified
against R's actual `ns()`-based predictions across a wide grid of ages
(including outside the training range, to check the linear extrapolation)
to floating-point-noise-level agreement (~1e-14) — see the PR this
refit landed in for the validation script.

## ⚠️ Data safety — read before touching this directory

`risk_score_model.R`'s own `fit_and_export()` already keeps per-patient
data out of the saved `.rds` (the fitted `clmm` object itself is never
stored). Still:

Rules for this directory:

- **Never commit a `.rds` file here.** `model/.gitignore` blocks `*.rds` as
  a backstop, but don't rely on it — treat any `.rds` as sensitive by
  default and keep it outside the repo entirely (it only needs to exist
  locally, wherever you run the export script from).
- **`export_risk_model_json.R` must only ever read the aggregate fields
  listed above** — `thresholds`, `beta`, `age_knots`, `age_range`,
  `scaling`, `ylevels`, `sex_levels`, `sigma0`, `sigma1`, `n_studies`,
  `n_dev`, `cohort`, `fitted_on`, `r_version`. If you're extending this
  script, do not add access to a training dataframe or the fitted `clmm`
  object.

## Step 1 / Step 2 coupling — read before refitting

`src/lib/model.ts` (Step 2, the CNMA) was fit using `risk_score` (`eta`)
values that came out of _this_ Step 1 model. If you refit Step 1 with new
data or a different formula, the `risk_score` distribution it produces
shifts, and Step 2's `lambda_risk` / `delta_component_risk` — calibrated
against the old distribution — become stale. There's no automated check for
this (neither JSON file carries a version tying them together yet); refit
or at minimum sanity-check both steps together, don't update this file in
isolation.

**Also see the TODO in `src/lib/riskScore.ts`** on `RISK_SCORE_TRAINING`:
the range to clamp `eta` to (the range Step 2 was actually trained on) has
to be computed from the same training rows Step 2 was fit against — it
can't be derived from this script's aggregate-only output, and is currently
left unclamped as a placeholder.
