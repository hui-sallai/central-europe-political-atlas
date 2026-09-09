# Atlas-owned reference harness. The externally supplied author file stays outside
# this repository. No author implementation is copied or modified here.
args <- commandArgs(trailingOnly=TRUE)
source(args[1])
fixtures <- jsonlite::fromJSON(args[2], simplifyVector=FALSE)
rows <- function(x) do.call(rbind, lapply(x, unlist))
outputs <- list()
for (case in fixtures$cases) {
  inputs <- case$inputs
  params <- list(y=unlist(inputs$y), X=rows(inputs$shocks),
                 s=rows(inputs$characteristics), i_index=unlist(inputs$units),
                 t_index=unlist(inputs$times), H=case$horizon,
                 cumulative=case$cumulative, small_sample=FALSE)
  if (length(inputs$fixed_effects)) params$FE <- do.call(cbind, lapply(inputs$fixed_effects, unlist))
  if (length(inputs$controls)) params$W <- rows(inputs$controls)
  result <- do.call(panel_LP, params)
  outputs[[case$id]] <- result
  if (case$id == "joint_two_shocks_two_characteristics") {
    params$small_sample <- TRUE
    negative <- tryCatch({do.call(panel_LP, params); "unexpected_success"},
                         error=function(e) paste("unsupported_reference_configuration", conditionMessage(e), sep=": "))
  }
}
versions <- sapply(c("pracma", "fixest", "tidyverse", "lubridate", "jsonlite"), function(p) as.character(packageVersion(p)))
jsonlite::write_json(list(runtime=R.version.string, packages=as.list(versions), cases=outputs,
                         small_sample_negative=negative), args[3], digits=NA, auto_unbox=TRUE, pretty=TRUE)
