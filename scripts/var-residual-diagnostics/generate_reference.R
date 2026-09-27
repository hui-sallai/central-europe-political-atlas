args <- commandArgs(trailingOnly = TRUE)
if (length(args) != 4) stop("usage: generate_reference.R INPUT_CSV META_CSV OUTPUT_CSV ENV_CSV")

input_path <- args[[1]]
meta_path <- args[[2]]
output_path <- args[[3]]
environment_path <- args[[4]]

research_library <- Sys.getenv("VAR_RESIDUAL_R_LIB", unset = "")
if (research_library != "") .libPaths(c(research_library, .libPaths()))
suppressPackageStartupMessages(library(vars))

inputs <- read.csv(input_path, stringsAsFactors = FALSE)
metadata <- read.csv(meta_path, stringsAsFactors = FALSE)
rows <- list()

append_row <- function(case_id, test_id, horizon, statistic, distribution, df1, df2, p_value) {
  rows[[length(rows) + 1]] <<- data.frame(
    case_id = case_id,
    test_id = test_id,
    lag_horizon = horizon,
    statistic = as.numeric(statistic),
    distribution = distribution,
    df1 = as.numeric(df1),
    df2 = if (is.null(df2)) NA_real_ else as.numeric(df2),
    p_value = as.numeric(p_value),
    stringsAsFactors = FALSE
  )
}

for (index in seq_len(nrow(metadata))) {
  meta <- metadata[index, ]
  case_data <- inputs[inputs$case_id == meta$case_id, ]
  y <- as.matrix(case_data[, c("y1", "y2", "y3")])
  exogen <- NULL
  if (meta$deterministic_spec == "constant_plus_11_month_dummies") {
    exogen <- matrix(0, nrow = nrow(case_data), ncol = 11)
    for (row in seq_len(nrow(case_data))) {
      month <- case_data$month_index[[row]] + 1
      if (month <= 11) exogen[row, month] <- 1
    }
    colnames(exogen) <- paste0("month_", 1:11)
  }
  fit <- VAR(y, p = meta$true_lag, type = "const", exogen = exogen)
  horizon <- meta$lag_horizon
  pt <- serial.test(fit, lags.pt = horizon, type = "PT.adjusted")$serial
  bg <- serial.test(fit, lags.bg = horizon, type = "BG")$serial
  es <- serial.test(fit, lags.bg = horizon, type = "ES")$serial
  append_row(meta$case_id, "pt_adjusted", horizon, pt$statistic, "chi_square", pt$parameter, NULL, pt$p.value)
  append_row(meta$case_id, "bg_lm", horizon, bg$statistic, "chi_square", bg$parameter, NULL, bg$p.value)
  append_row(meta$case_id, "edgerton_shukur_f", horizon, es$statistic, "F", es$parameter[[1]], es$parameter[[2]], es$p.value)
}

write.csv(do.call(rbind, rows), output_path, row.names = FALSE, na = "")

packages <- c("vars", "MASS", "lmtest", "sandwich", "urca", "strucchange")
environment <- data.frame(
  key = c("R", "platform", packages),
  value = c(R.version.string, R.version$platform, vapply(packages, function(package) as.character(packageVersion(package)), character(1))),
  stringsAsFactors = FALSE
)
write.csv(environment, environment_path, row.names = FALSE)
