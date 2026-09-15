#!/usr/bin/env python3
"""Regenerates src/lib/data/nma-posterior.json from a fitted CNMA artifact.

Usage:
    python3 export_nma_posterior_json.py inspect  <posterior.nc>
    python3 export_nma_posterior_json.py export    <posterior.nc> <manifest.json> [output.json]

`inspect` prints only structure (group names, variable names, dims, shapes,
coordinate labels) — never any sampled values. Run it first on any new .nc
file before exporting.

`export` reads the fitted CNMA (Component Network Meta-Analysis) posterior —
an ArviZ InferenceData saved with idata.to_netcdf(...) — and a companion
manifest.json (structural metadata: model name, study/component order,
allowed component packages, risk-score training range, thinning factor),
and writes src/lib/data/nma-posterior.json in the exact shape
src/lib/model.ts expects (see that file's header comment for the model
formula this feeds).

IMPORTANT — DATA SAFETY:
An ArviZ InferenceData object can carry groups besides "posterior" —
`observed_data`, `constant_data`, `log_likelihood`, `posterior_predictive`,
`sample_stats` — and for a model built directly from a per-patient
DataFrame (as this CNMA was — see model/step1_risk_score/README.md for the
same issue in the Step 1 .rds), these groups can embed real per-patient
covariates or outcomes, indexed by observation. This script:
  - only ever opens the "posterior" group (via az.from_netcdf(..., group=
    "posterior") is avoided in favor of loading the full InferenceData
    then touching only `idata.posterior`, but no other group's data is
    ever read or written anywhere in this file);
  - `inspect` uses netCDF4 directly to list group *names* only, never their
    contents, specifically so you can confirm what's in a new file before
    trusting it;
  - exports only aggregate posterior draws/summaries of alpha_study,
    lambda_risk, beta_component, delta_component_risk, sigma — all
    hyperparameters (per-study or per-component), never per-patient values.
If you're extending this script, do not add code that touches any group
other than "posterior". Keep the .nc and manifest.json out of git — both
belong in model/step2_cnma/source/, which model/.gitignore ignores
wholesale (see that file and model/step2_cnma/README.md).

Dependencies: arviz, xarray, netCDF4, numpy (not in this repo's own
toolchain — this script is dev-time tooling, run locally with a Python
env that has the PyMC/ArviZ stack, same as export_risk_model_json.R is run
with a local R + rms install; see model/step2_cnma/README.md).
"""

from __future__ import annotations

import argparse
import json
import sys

import numpy as np

# Fields nma-posterior.json needs from manifest.json. See
# model/step2_cnma/README.md for what each means.
MANIFEST_REQUIRED_FIELDS = [
    "modelName",
    "artifactVersion",
    "outcome",
    "studyOrder",
    "componentOrder",
    "allowedComponentPackages",
    "riskScore",  # {"trainingMin": ..., "trainingMax": ...}
    "thinning",
]

POSTERIOR_SCALAR_VARS = ["lambda_risk", "sigma"]
POSTERIOR_PER_STUDY_VAR = "alpha_study"
POSTERIOR_PER_COMPONENT_VARS = ["beta_component", "delta_component_risk"]


def list_groups(nc_path: str) -> list[str]:
    """Group *names* only, via netCDF4 directly — never reads any values.
    Use this to confirm a new .nc doesn't need groups beyond 'posterior'
    inspected before you ever call `export`."""
    import netCDF4  # local import: only needed for this safety check

    with netCDF4.Dataset(nc_path) as ds:
        return list(ds.groups.keys())


def load_posterior(nc_path: str):
    import arviz as az

    idata = az.from_netcdf(nc_path)
    if not hasattr(idata, "posterior"):
        raise SystemExit("No 'posterior' group in this InferenceData — nothing to export.")
    return idata.posterior  # xarray.Dataset — the only group this script ever reads


def cmd_inspect(args: argparse.Namespace) -> None:
    groups = list_groups(args.nc_path)
    print("Groups present in this file (names only, no values read):")
    for g in groups:
        flag = "  <- will be read" if g == "posterior" else "  (ignored by this script)"
        print(f"  - {g}{flag}")
    non_posterior = [g for g in groups if g != "posterior"]
    if non_posterior:
        print(
            "\nNote: groups other than 'posterior' are present. This script never reads them, "
            "but if you're unsure what they contain, inspect with ArviZ/ncdump yourself before "
            "treating this file as safe to keep around — see the data-safety note at the top of "
            "this script."
        )

    posterior = load_posterior(args.nc_path)
    print("\nposterior dims:", dict(posterior.sizes))
    print("posterior variables:")
    for name, da in posterior.data_vars.items():
        print(f"  {name}: dims={da.dims} shape={da.shape}")
    print("posterior coordinates (labels, not values):")
    for coord in posterior.coords:
        if coord not in ("chain", "draw"):
            print(f"  {coord}: {list(posterior.coords[coord].values)}")


def _flatten_chain_draw(da) -> np.ndarray:
    """(chain, draw, ...) -> (chain*draw, ...), concatenating chains in
    order. Deterministic; downstream thinning takes a fixed stride over
    this axis, which samples roughly evenly across all chains."""
    return da.values.reshape(-1, *da.shape[2:])


def _quantile_ci(values: np.ndarray, round_to: int = 4) -> list[float]:
    lo, hi = np.quantile(values, [0.025, 0.975])
    return [round(float(lo), round_to), round(float(hi), round_to)]


def _summarize_scalar(da, round_to: int = 4) -> dict:
    flat = _flatten_chain_draw(da).reshape(-1)
    return {"mean": round(float(flat.mean()), round_to), "ci": _quantile_ci(flat, round_to)}


def _summarize_per_label(da, labels: list[str], round_to: int = 4) -> dict:
    flat = _flatten_chain_draw(da)  # (n_samples, n_labels)
    if flat.shape[1] != len(labels):
        raise SystemExit(
            f"Variable '{da.name}' has {flat.shape[1]} entries in the .nc but manifest.json "
            f"lists {len(labels)} labels for it — these must match exactly (same count AND "
            f"same order) or the exported summary/draws would be silently mislabeled."
        )
    return {
        label: {
            "mean": round(float(flat[:, i].mean()), round_to),
            "ci": _quantile_ci(flat[:, i], round_to),
        }
        for i, label in enumerate(labels)
    }


def cmd_export(args: argparse.Namespace) -> None:
    with open(args.manifest_path, encoding="utf-8") as f:
        manifest = json.load(f)

    missing = [f for f in MANIFEST_REQUIRED_FIELDS if f not in manifest]
    if missing:
        raise SystemExit(f"manifest.json is missing required field(s): {', '.join(missing)}")

    study_order: list[str] = manifest["studyOrder"]
    component_order: list[str] = manifest["componentOrder"]
    thinning: int = manifest["thinning"]

    posterior = load_posterior(args.nc_path)

    required_vars = [POSTERIOR_PER_STUDY_VAR, *POSTERIOR_SCALAR_VARS, *POSTERIOR_PER_COMPONENT_VARS]
    missing_vars = [v for v in required_vars if v not in posterior.data_vars]
    if missing_vars:
        raise SystemExit(
            f"posterior group is missing expected variable(s): {', '.join(missing_vars)}. "
            f"Run `inspect` to see what's actually in this file."
        )

    chains = int(posterior.sizes["chain"])
    draws_per_chain = int(posterior.sizes["draw"])

    # ---- summary: posterior mean + 95% CI from the FULL unthinned posterior ----
    summary = {
        "alphaStudy": _summarize_per_label(posterior[POSTERIOR_PER_STUDY_VAR], study_order),
        "lambdaRisk": _summarize_scalar(posterior["lambda_risk"]),
        "betaComponent": _summarize_per_label(posterior["beta_component"], component_order),
        "deltaComponentRisk": _summarize_per_label(
            posterior["delta_component_risk"], component_order
        ),
        "sigma": _summarize_scalar(posterior["sigma"]),
    }

    # ---- draws: thinned, for the browser's Monte Carlo simulation ----
    alpha_study_flat = _flatten_chain_draw(posterior[POSTERIOR_PER_STUDY_VAR])  # (N, n_study)
    lambda_risk_flat = _flatten_chain_draw(posterior["lambda_risk"]).reshape(-1)  # (N,)
    beta_component_flat = _flatten_chain_draw(posterior["beta_component"])  # (N, n_component)
    delta_component_risk_flat = _flatten_chain_draw(posterior["delta_component_risk"])

    thinned_idx = slice(None, None, thinning)
    # alpha_study is averaged across studies per draw (no single pooled
    # intercept — see model.ts's file header on this) before thinning is
    # irrelevant to order, so thin first then average, or average then
    # thin -- same result; average first is cheaper.
    alpha_study_mean_per_draw = alpha_study_flat.mean(axis=1)[thinned_idx]
    lambda_risk_draws = lambda_risk_flat[thinned_idx]
    beta_component_draws = beta_component_flat[thinned_idx]
    delta_component_risk_draws = delta_component_risk_flat[thinned_idx]

    n_draws = len(lambda_risk_draws)
    draws_round = args.draws_round
    draws = {
        "alphaStudyMean": [round(float(v), draws_round) for v in alpha_study_mean_per_draw],
        "lambdaRisk": [round(float(v), draws_round) for v in lambda_risk_draws],
        "betaComponent": [
            [round(float(x), draws_round) for x in row] for row in beta_component_draws
        ],
        "deltaComponentRisk": [
            [round(float(x), draws_round) for x in row] for row in delta_component_risk_draws
        ],
    }

    output = {
        "modelName": manifest["modelName"],
        "artifactVersion": manifest["artifactVersion"],
        "outcome": manifest["outcome"],
        "chains": chains,
        "drawsPerChain": draws_per_chain,
        "thinning": thinning,
        "nDraws": n_draws,
        "studyOrder": study_order,
        "componentOrder": component_order,
        "riskScore": manifest["riskScore"],
        "allowedComponentPackages": manifest["allowedComponentPackages"],
        "draws": draws,
        "summary": summary,
    }

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(f"Wrote {n_draws} thinned draws ({chains} chains x {draws_per_chain} draws, "
          f"thinning={thinning}) -> {args.output}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True)

    p_inspect = sub.add_parser("inspect", help="Print structure only (no values) of a .nc file")
    p_inspect.add_argument("nc_path")
    p_inspect.set_defaults(func=cmd_inspect)

    p_export = sub.add_parser("export", help="Export nma-posterior.json from .nc + manifest.json")
    p_export.add_argument("nc_path")
    p_export.add_argument("manifest_path")
    p_export.add_argument("output", nargs="?", default="src/lib/data/nma-posterior.json")
    p_export.add_argument(
        "--draws-round",
        type=int,
        default=5,
        help="Decimal places for the thinned draws array (default 5, matches the committed file's convention)",
    )
    p_export.set_defaults(func=cmd_export)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
