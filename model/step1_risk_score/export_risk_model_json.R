# Regenerates src/lib/data/risk-model.json from a fitted rms::orm object.
#
# Usage:
#   Rscript model/step1_risk_score/export_risk_model_json.R <path-to-orm-fit.rds> [output.json]
#
# The .rds must be an `orm` fit (rms package) of:
#   phq9_12mo ~ rcs(age, 4) + sex + rcs(baseline_phq9, 4) + rcs(gad7_total, 4)
#
# IMPORTANT — DATA SAFETY:
# If the .rds was saved with orm(..., x = TRUE, y = TRUE) (the rms default is
# x = FALSE, y = FALSE, but many analysis scripts turn these on for residual
# diagnostics), the object also embeds the full per-patient training design
# matrix and outcome vector. This script deliberately reads ONLY the fitted
# summary — coef(), Design$parms (spline knots), interceptRef, non.slopes —
# and never touches obj$x, obj$y, obj$linear.predictors, obj$weights, or
# obj$na.action. Never edit this script to print or export those fields:
# they are real individual patient data from the source trials and must
# never be committed to this repo. Keep the .rds itself out of git — it is
# covered by the *.rds ignore rule in model/.gitignore.
#
# The script never installs or requires packages beyond base R (no jsonlite
# dependency), specifically so it stays runnable in restricted/offline
# environments and so its JSON output format is fully under our control.

args <- commandArgs(trailingOnly = TRUE)
if (length(args) < 1) {
  stop("Usage: Rscript export_risk_model_json.R <path-to-orm-fit.rds> [output.json]")
}
rds_path <- args[1]
out_path <- if (length(args) >= 2) args[2] else "src/lib/data/risk-model.json"

obj <- readRDS(rds_path)
if (!inherits(obj, "orm")) {
  stop("Expected an object of class 'orm' (rms::orm fit), got: ", paste(class(obj), collapse = ", "))
}

coefs <- coef(obj)
if (is.null(names(coefs)) || any(names(coefs) == "")) {
  stop("coef(obj) has unnamed entries -- cannot export a name -> value map safely.")
}

parms <- obj$Design$parms
required_predictors <- c("age", "baseline_phq9", "gad7_total")
missing_predictors <- setdiff(required_predictors, names(parms))
if (length(missing_predictors) > 0) {
  stop("Design$parms is missing expected predictor(s): ", paste(missing_predictors, collapse = ", "))
}

intercept_ref <- obj$interceptRef
non_slopes <- obj$non.slopes
y_levels <- seq.int(0, non_slopes)

# ---- minimal JSON writer (base R only, no jsonlite dependency) ------------
# Handles exactly the shapes this script needs: named number maps, named
# arrays-of-arrays, scalars, and number arrays. Not a general-purpose
# serializer on purpose -- keeps this script dependency-free.

json_string <- function(x) paste0('"', gsub('"', '\\"', x, fixed = TRUE), '"')

json_number <- function(x) {
  # Full double precision, trimmed of trailing zeros where safe; digits=15
  # avoids R's default 7-significant-figure rounding in as.character().
  # formatC() right-pads for column alignment when given other args, so
  # trim explicitly rather than relying on width=0 behavior.
  trimws(formatC(x, digits = 15, format = "g"))
}

json_number_array <- function(values) {
  paste0("[", paste(vapply(values, json_number, character(1)), collapse = ", "), "]")
}

# Renders a named list whose values are already-serialized JSON strings.
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
  setNames(lapply(unname(coefs), json_number), names(coefs)),
  indent = "  "
)

knots_json <- json_object_raw(
  list(
    age = json_number_array(parms$age),
    baseline_phq9 = json_number_array(parms$baseline_phq9),
    gad7_total = json_number_array(parms$gad7_total)
  ),
  indent = "  "
)

top_level <- json_object_raw(
  list(
    coefficients = coefficients_json,
    interceptRef = json_number(intercept_ref),
    knots = knots_json,
    yLevels = json_number_array(y_levels)
  ),
  indent = ""
)

writeLines(top_level, out_path)
cat("Wrote", length(coefs), "coefficients,", length(y_levels), "y-levels ->", out_path, "\n")
