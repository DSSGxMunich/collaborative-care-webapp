# Step 1 — risk score (ordinal regression)

Fitting source for `src/lib/data/risk-model.json`, the coefficient file
`src/lib/riskScore.ts` reads at runtime (see that file's header comment for
the math). The fit itself is an `rms::orm` ordinal regression in R:

```r
orm(phq9_12mo ~ rcs(age, 4) + sex + rcs(baseline_phq9, 4) + rcs(gad7_total, 4),
    data = df)
```

## Regenerating `risk-model.json` from a fitted model

```sh
Rscript model/step1_risk_score/export_risk_model_json.R /path/to/orm_fit.rds
```

This overwrites `src/lib/data/risk-model.json`. Diff it before committing —
values should match the previous file to within the last couple of decimal
places (see "Precision" below), not change structurally.

## ⚠️ Data safety — read before touching this directory

An `orm` fit saved with `x = TRUE, y = TRUE` (some analysis scripts turn
these on for residual diagnostics; the rms default is `FALSE`) embeds the
**entire per-patient training design matrix and outcome vector** inside the
`.rds` object, not just the fitted coefficients. For this model that's real
individual patient data (IPD) from the source trials.

Rules for this directory:

- **Never commit a `.rds` file here.** `model/.gitignore` blocks `*.rds` as
  a backstop, but don't rely on it — treat any `.rds` as sensitive by
  default and keep it outside the repo entirely (it only needs to exist
  locally, wherever you run the export script from).
- **`export_risk_model_json.R` must only ever read `coef(obj)`,
  `obj$Design$parms`, `obj$interceptRef`, and `obj$non.slopes`** — the
  fitted summary, not the data. If you're extending this script, do not
  add access to `obj$x`, `obj$y`, `obj$linear.predictors`, `obj$weights`,
  or `obj$na.action`.
- If you need a clean copy of the model artifact to hand around, re-save it
  with `x = FALSE, y = FALSE` (or `resid = FALSE`, matching whatever
  attached the data) rather than exporting fields from the original.

## Precision

`export_risk_model_json.R` writes full double precision. The version of
`risk-model.json` originally committed was hand-rounded to 4 decimal
places (see `riskScore.ts`'s file header on this), which makes the derived
`risk_score` differ by roughly 1e-3–2e-3 from the full-precision export at
typical baseline PHQ-9 values — well within the model's own uncertainty,
not a discrepancy. Verified against a real fitted `orm` object 2026-09-14:
knots, `interceptRef`, `non.slopes`, and all 30 coefficients matched the
committed JSON to within that same rounding.

## Step 1 / Step 2 coupling — read before refitting

`src/lib/model.ts` (Step 2, the CNMA) was fit using `risk_score` values
that came out of _this_ Step 1 model. If you refit Step 1 with new data or
a different formula, the `risk_score` distribution it produces shifts, and
Step 2's `lambda_risk` / `delta_component_risk` — calibrated against the
old distribution — become stale. There's no automated check for this
(neither JSON file carries a version tying them together yet); refit or at
minimum sanity-check both steps together, don't update this file in
isolation.
