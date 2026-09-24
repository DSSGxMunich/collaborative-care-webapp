# Computes RISK_SCORE_TRAINING (src/lib/riskScore.ts) from a fitted
# risk_score_model.rds: the real min/max of the marginal risk score (E[Y])
# over the fitted model's actual training domain -- age_range (the real
# training-sample age extremes) x baseline PHQ-9's real [0, 27] instrument
# bounds x both sex levels. See RISK_SCORE_TRAINING's own comment in
# src/lib/riskScore.ts for why this is a dense grid search rather than just
# the domain's 8 corners (the age spline isn't monotonic).
#
# Usage:
#   Rscript model/step1_risk_score/compute_risk_score_range.R /path/to/risk_score_model.rds
#
# Prints min/max -- copy them into RISK_SCORE_TRAINING by hand (this script
# only reads the aggregate model list, same data-safety rules as
# export_risk_model_json.R -- see that script and this directory's README).

suppressWarnings(suppressMessages(library(splines)))

args <- commandArgs(trailingOnly = TRUE)
if (length(args) < 1) {
  stop("Usage: Rscript compute_risk_score_range.R <path-to-risk_score_model.rds>")
}
model <- readRDS(args[1])

C_CONST <- 16 * sqrt(3) / (15 * pi) # Zeger, Liang & Albert (1988) logistic/normal-mixture constant

predict_eta_and_y0c <- function(y0, age, sex) {
  y0_c <- (y0 - model$scaling$y0_mu) / model$scaling$y0_sd
  age_c <- (age - model$scaling$age_mu) / model$scaling$age_sd
  ns_beta <- model$beta[grep("^ns\\(", names(model$beta))]
  g <- as.vector(
    ns(age_c, knots = model$age_knots[2:3], Boundary.knots = model$age_knots[c(1, 4)]) %*% ns_beta
  )
  sexMale <- ifelse(sex == "Male", 1, 0)
  list(eta = model$beta[["y0_c"]] * y0_c + g + model$beta[["sexMale"]] * sexMale, y0_c = y0_c)
}

marginal_expected_phq9 <- function(eta, y0_c) {
  levels <- as.numeric(model$ylevels)
  total_var <- model$sigma0^2 + (y0_c^2) * model$sigma1^2
  denom <- sqrt(1 + C_CONST^2 * total_var)
  cumP <- c(plogis((model$thresholds - eta) / denom), 1)
  pmf <- diff(c(0, cumP))
  sum(levels * pmf)
}

ages <- seq(model$age_range[1], model$age_range[2], length.out = 400)
y0s <- seq(0, 27, length.out = 400)
grid <- expand.grid(y0 = y0s, age = ages, sex = model$sex_levels)
grid$risk_score <- mapply(function(y0, age, sex) {
  e <- predict_eta_and_y0c(y0, age, sex)
  marginal_expected_phq9(e$eta, e$y0_c)
}, grid$y0, grid$age, grid$sex)

cat("min:", min(grid$risk_score), "\n")
cat("max:", max(grid$risk_score), "\n")
cat("argmin:\n")
print(grid[which.min(grid$risk_score), ])
cat("argmax:\n")
print(grid[which.max(grid$risk_score), ])
