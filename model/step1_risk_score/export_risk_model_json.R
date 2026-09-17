# Regenerates src/lib/data/risk-model.json from a fitted risk_score_model.rds
# (see risk_score_model.R in the collaborative_care_analysis repo — a
# proportional-odds mixed model, package `ordinal`, function `clmm`).
#
# Usage:
#   Rscript model/step1_risk_score/export_risk_model_json.R <path-to-risk_score_model.rds> [output.json]
#
# The .rds must be the `model` list risk_score_model.R's fit_and_export()
# saves: thresholds, beta, fixed_form, age_knots, age_range, scaling,
# ylevels, sex_levels, sigma0, sigma1, n_studies, n_dev, cohort, fitted_on,
# r_version — aggregate parameters only, by that script's own design (it
# never stores the fitted clmm object, since that would carry the
# development data). This script only ever reads those same named list
# entries; it does not (and cannot) touch any per-patient data, since none
# is present in the file.
#
# The model uses a natural cubic spline (splines::ns) for age, evaluated in
# JS/TS via a from-scratch natural-spline reconstruction (src/lib/riskScore.ts)
# rather than porting ns()'s own basis construction: since age's fixed-effect
# contribution is a fixed linear combination of ns() basis functions, it is
# itself exactly a natural cubic spline in age_c with knots at age_knots, so
# it's fully and exactly reproducible from its own value at just those 4
# knots (age_knots) plus natural (zero second derivative) boundary
# conditions beyond the outer two. This script evaluates that combination
# once per knot (`gAtAgeKnots` below) so the browser never needs `ns()`
# itself. Verified against R's own ns()-based predictions across a wide
# grid of ages (including outside the training range, to check the natural
# linear extrapolation) to double-precision-noise-level agreement — see the
# PR this landed in for the validation script.
#
# IMPORTANT — DATA SAFETY:
# This script deliberately reads ONLY the aggregate fields named above.
# If you're extending it, do not add code that reads a training dataframe,
# a fitted `clmm` object, or anything else that could carry per-patient
# rows. Keep the .rds itself out of git.

suppressWarnings(suppressMessages(library(splines)))

args <- commandArgs(trailingOnly = TRUE)
if (length(args) < 1) {
  stop("Usage: Rscript export_risk_model_json.R <path-to-risk_score_model.rds> [output.json]")
}
rds_path <- args[1]
out_path <- if (length(args) >= 2) args[2] else "src/lib/data/risk-model.json"

model <- readRDS(rds_path)

required_fields <- c(
  "thresholds", "beta", "fixed_form", "age_knots", "age_range", "scaling",
  "ylevels", "sex_levels", "sigma0", "sigma1", "n_studies", "n_dev",
  "cohort", "fitted_on", "r_version"
)
missing_fields <- setdiff(required_fields, names(model))
if (length(missing_fields) > 0) {
  stop("risk_score_model.rds is missing expected field(s): ", paste(missing_fields, collapse = ", "))
}

beta_names <- names(model$beta)
if (is.null(beta_names) || any(beta_names == "")) {
  stop("model$beta has unnamed entries -- cannot export a name -> value map safely.")
}
if (!("y0_c" %in% beta_names) || !("sexMale" %in% beta_names)) {
  stop("model$beta is missing expected entries 'y0_c' and/or 'sexMale': ",
       paste(beta_names, collapse = ", "))
}
ns_names <- grep("^ns\\(", beta_names, value = TRUE)
if (length(ns_names) != length(model$age_knots) - 1) {
  stop("expected ", length(model$age_knots) - 1, " ns() coefficient(s) for ",
       length(model$age_knots), " age knots, found ", length(ns_names))
}

# The age fixed effect, g(age_c) = ns(age_c, ...) %*% beta[ns_names],
# evaluated at exactly the 4 knots -- see file header for why this alone is
# enough to exactly reconstruct g() for any age_c in JS/TS.
g_at_age_knots <- as.vector(
  ns(model$age_knots, knots = model$age_knots[2:3], Boundary.knots = model$age_knots[c(1, 4)]) %*%
    model$beta[ns_names]
)

# ---- minimal JSON writer (base R only, no jsonlite dependency) ------------

json_string <- function(x) paste0('"', gsub('"', '\\"', x, fixed = TRUE), '"')

json_number <- function(x) {
  trimws(formatC(x, digits = 15, format = "g"))
}

json_number_array <- function(values) {
  paste0("[", paste(vapply(values, json_number, character(1)), collapse = ", "), "]")
}

json_string_array <- function(values) {
  paste0("[", paste(vapply(values, json_string, character(1)), collapse = ", "), "]")
}

json_object_raw <- function(named_json_values, indent) {
  inner <- paste0(indent, "  ")
  entries <- vapply(
    names(named_json_values),
    function(k) paste0(inner, json_string(k), ": ", named_json_values[[k]]),
    character(1)
  )
  paste0("{\n", paste(entries, collapse = ",\n"), "\n", indent, "}")
}

coefficients_json <- json_object_raw(
  list(y0_c = json_number(model$beta[["y0_c"]]), sexMale = json_number(model$beta[["sexMale"]])),
  indent = "  "
)

scaling_json <- json_object_raw(
  list(
    y0Mu = json_number(model$scaling$y0_mu),
    y0Sd = json_number(model$scaling$y0_sd),
    ageMu = json_number(model$scaling$age_mu),
    ageSd = json_number(model$scaling$age_sd)
  ),
  indent = "  "
)

thresholds_json <- json_object_raw(
  setNames(lapply(unname(model$thresholds), json_number), names(model$thresholds)),
  indent = "  "
)

top_level <- json_object_raw(
  list(
    coefficients = coefficients_json,
    ageKnots = json_number_array(model$age_knots),
    gAtAgeKnots = json_number_array(g_at_age_knots),
    scaling = scaling_json,
    ageRange = json_number_array(model$age_range),
    yLevels = json_number_array(model$ylevels),
    sexLevels = json_string_array(model$sex_levels),
    thresholds = thresholds_json,
    sigma0 = json_number(model$sigma0),
    sigma1 = json_number(model$sigma1),
    nStudies = json_number(model$n_studies),
    nDev = json_number(model$n_dev),
    cohort = json_string(model$cohort),
    fittedOn = json_string(format(model$fitted_on)),
    rVersion = json_string(model$r_version)
  ),
  indent = ""
)

writeLines(top_level, out_path)
cat("Wrote", length(model$beta), "coefficients, ", length(model$age_knots), "age knots -> ", out_path, "\n")
