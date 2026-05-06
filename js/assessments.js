// assessments.js — Assessment specifications for graded exercises.
// This is a plain (non-module) script so the toggle UI loads even if
// the WebR ES module is still downloading or fails to load.
//
// Each entry maps an exercise ID to:
//   - intro: short text shown in feedback banner (currently unused)
//   - code:  the R validator code that runs after the student's code
//   - textCheck (optional): JS-side check for required tokens in code
//
// The validator returns a list of { ok, label, detail } items.

(function (global) {
  global.__ASSESSMENTS = {

    // 3.1: discharge = w * d * v = 4.2 * 0.35 * 0.68 ≈ 0.9996
    'ex-3-1': {
      intro: "We'll check that you computed the discharge correctly using Q = w × d × v.",
      code: `
.assess <- function() {
  out <- list()
  vars <- ls(envir = globalenv())
  found <- FALSE
  for (v in vars) {
    val <- tryCatch(get(v, envir = globalenv()), error = function(e) NULL)
    if (is.numeric(val) && length(val) == 1 && !is.na(val)) {
      if (abs(val - 0.9996) < 0.01) { found <- TRUE; break }
    }
  }
  out[[1]] <- list(
    ok = found,
    label = "Discharge ≈ 1.00 m³/s",
    detail = if (found) "you computed the discharge correctly"
             else "no variable in your code holds the value Q = w × d × v ≈ 1.00 m³/s. Did you multiply width × depth × velocity?"
  )
  out
}
`
    },

    // 4.1: nitrate vector + count > 1.0 = 6
    'ex-4-1': {
      intro: "We'll check that you stored the nitrate vector and answered the three sub-questions.",
      code: `
.assess <- function() {
  out <- list()
  expected <- c(0.42, 1.85, 0.31, 2.94, 1.12, 0.58, 3.21, 0.27, 2.05, 1.43)
  has_vec <- exists("nitrate", envir = globalenv())
  vec_ok <- FALSE
  nit <- NULL
  if (has_vec) {
    nit <- get("nitrate", envir = globalenv())
    if (is.numeric(nit) && length(nit) == 10) {
      vec_ok <- all(abs(nit - expected) < 1e-6)
    }
  }
  out[[1]] <- list(
    ok = vec_ok,
    label = "Vector named 'nitrate' with all 10 values",
    detail = if (vec_ok) "vector stored correctly"
             else if (!has_vec) "no variable named 'nitrate' was created"
             else "the variable 'nitrate' exists but its values don't match the 10 listed in the prompt"
  )
  count_ok <- vec_ok && sum(nit > 1.0) == 6
  out[[2]] <- list(
    ok = count_ok,
    label = "Six sites exceed 1.0 mg/L",
    detail = if (count_ok) "the count is correct (6)"
             else "expected 6 sites with nitrate > 1.0; check your use of sum() and the > comparison"
  )
  out
}
`
    },

    // 5.1: forest mean EPT = 18.5, urban count = 3, sites < 15C = 6
    'ex-5-1': {
      intro: "We'll check that you recreated stream_data and answered all three parts.",
      code: `
.assess <- function() {
  out <- list()
  has_df <- exists("stream_data", envir = globalenv())
  df_ok <- FALSE
  sd <- NULL
  if (has_df) {
    sd <- get("stream_data", envir = globalenv())
    df_ok <- is.data.frame(sd) && nrow(sd) == 10 &&
             all(c("land_use", "ept_taxa", "temp_C") %in% names(sd))
  }
  out[[1]] <- list(
    ok = df_ok,
    label = "stream_data data frame is recreated",
    detail = if (df_ok) "data frame structure looks correct"
             else "couldn't find a 10-row data frame called stream_data with land_use, ept_taxa, and temp_C columns"
  )
  if (df_ok) {
    forest_mean <- mean(sd$ept_taxa[sd$land_use == "Forest"])
    out[[2]] <- list(
      ok = !is.na(forest_mean) && abs(forest_mean - 18.5) < 0.05,
      label = "Forest mean EPT richness ≈ 18.5",
      detail = "based on the rows where land_use is 'Forest'"
    )
    urban_n <- sum(sd$land_use == "Urban")
    out[[3]] <- list(
      ok = urban_n == 3,
      label = "Three urban sites in the dataset",
      detail = "use sum(stream_data$land_use == 'Urban')"
    )
    cool_rows <- sum(sd$temp_C < 15)
    out[[4]] <- list(
      ok = cool_rows == 6,
      label = "Six sites have temperature below 15°C",
      detail = "filter with stream_data[stream_data$temp_C < 15, ]"
    )
  }
  out
}
`
    },

    // 6.1: site_do >= 6 & site_temp < 20 → TRUE; textCheck enforces operators
    'ex-6-1': {
      intro: "We'll check your one-line condition uses the right operators and returns TRUE.",
      code: `
.assess <- function() {
  out <- list()
  inputs_ok <- exists("site_do", envir = globalenv()) &&
               exists("site_temp", envir = globalenv()) &&
               isTRUE(get("site_do") == 7.4) &&
               isTRUE(get("site_temp") == 17.8)
  out[[1]] <- list(
    ok = inputs_ok,
    label = "Inputs site_do = 7.4 and site_temp = 17.8 preserved",
    detail = if (inputs_ok) "inputs are intact"
             else "the values for site_do and site_temp were changed — please leave them as 7.4 and 17.8 to be assessed"
  )
  result_ok <- isTRUE(.Last.value)
  out[[2]] <- list(
    ok = result_ok,
    label = "Your expression evaluates to TRUE",
    detail = if (result_ok) "the criterion correctly returns TRUE for these inputs"
             else "your code did not return TRUE. Combine 'site_do >= 6.0' AND 'site_temp < 20' with the & operator."
  )
  out
}
`,
      textCheck: {
        mustContain: ['>=', '<', '&'],
        label: "Code uses >=, <, and & operators",
        detail: "your one-liner should use >= (greater than or equal to), < (less than), and & (logical AND)"
      }
    },

    // 7.1: Dt = 4.5 * exp(-0.35 * 3) ≈ 1.5747
    'ex-7-1': {
      intro: "We'll check the DO deficit value Dt at t = 3 days.",
      code: `
.assess <- function() {
  out <- list()
  vars <- ls(envir = globalenv())
  found <- FALSE
  for (v in vars) {
    val <- tryCatch(get(v, envir = globalenv()), error = function(e) NULL)
    if (is.numeric(val) && length(val) == 1 && !is.na(val)) {
      if (abs(val - 1.5747) < 0.01) { found <- TRUE; break }
    }
  }
  out[[1]] <- list(
    ok = found,
    label = "DO deficit Dt ≈ 1.575 mg/L after 3 days",
    detail = if (found) "you computed the deficit correctly"
             else "no variable in your code holds Dt = D0 * exp(-k2 * t) ≈ 1.575. Check that you used exp() and the right sign on -k2*t."
  )
  out
}
`
    },

    // 8.1: tds_mgL added, tds_concern correct
    'ex-8-1': {
      intro: "We'll check the new columns and the filtered subset.",
      code: `
.assess <- function() {
  out <- list()
  has_df <- exists("sc_data", envir = globalenv())
  df_ok <- has_df && is.data.frame(get("sc_data")) && nrow(get("sc_data")) == 8
  out[[1]] <- list(
    ok = df_ok,
    label = "sc_data data frame intact (8 rows)",
    detail = "data frame should still have all 8 sites"
  )
  if (df_ok) {
    sd <- get("sc_data")
    tds_ok <- "tds_mgL" %in% names(sd) &&
              all(abs(sd$tds_mgL - 0.65 * sd$sc_uScm) < 1e-6)
    out[[2]] <- list(
      ok = tds_ok,
      label = "tds_mgL column added with correct values",
      detail = if (tds_ok) "TDS values match 0.65 × SC"
               else "either tds_mgL is missing or its values aren't 0.65 × sc_uScm"
    )
    concern_ok <- "tds_concern" %in% names(sd) &&
                  is.logical(sd$tds_concern) &&
                  all(sd$tds_concern == (sd$tds_mgL > 500))
    out[[3]] <- list(
      ok = concern_ok,
      label = "tds_concern logical column is correct",
      detail = if (concern_ok) "TRUE/FALSE correctly marks sites with TDS > 500"
               else "tds_concern should be TRUE where tds_mgL > 500"
    )
  }
  out
}
`
    },

    // 9.1: for loop — count storm-flow days (discharge > 5.0); expected 3
    'ex-9-1': {
      intro: "We'll check that your for loop counted storm-flow days correctly.",
      code: `
.assess <- function() {
  out <- list()
  has_var <- exists("storm_days", envir = globalenv())
  val <- if (has_var) tryCatch(get("storm_days", envir = globalenv()), error = function(e) NULL) else NULL
  count_ok <- has_var && is.numeric(val) && length(val) == 1 && val == 3
  out[[1]] <- list(
    ok = count_ok,
    label = "storm_days equals 3",
    detail = if (count_ok) "you correctly identified 3 storm-flow days (8.7, 12.4, 7.8 m³/s)"
             else if (!has_var) "no variable named 'storm_days' was created"
             else "expected storm_days to be 3 — three of the 14 days exceed 5.0 m³/s. Check your threshold and the > comparison."
  )
  # Verify the discharge vector still exists and has the right values
  has_disch <- exists("discharge", envir = globalenv())
  disch_ok <- FALSE
  if (has_disch) {
    d <- get("discharge", envir = globalenv())
    expected <- c(2.1, 2.4, 8.7, 5.3, 3.2, 2.6, 2.3, 1.9, 2.0, 12.4, 7.8, 4.1, 2.5, 2.2)
    disch_ok <- is.numeric(d) && length(d) == 14 && all(abs(d - expected) < 1e-6)
  }
  out[[2]] <- list(
    ok = disch_ok,
    label = "discharge vector preserved",
    detail = if (disch_ok) "discharge vector has all 14 values"
             else "the discharge vector was changed — please leave the original 14 values intact"
  )
  out
}
`,
      // Require an actual for loop in the student's code.
      // R for-loops always have the form: for (X in Y) { ... }
      // We check both 'for' and the surrounding ' in ' (with spaces to avoid
      // matching 'in' inside words like 'index' or 'within').
      textCheck: {
        mustContain: ['for', ' in '],
        label: "Code uses a for loop",
        detail: "the exercise asks you to use a for loop — make sure your code has 'for (variable in vector)'"
      }
    },

    // 10.1: while loop — 30 days, final concentration < 1.0
    'ex-10-1': {
      intro: "We'll check that your loop counted the right number of days.",
      code: `
.assess <- function() {
  out <- list()
  vars <- ls(envir = globalenv())
  has_30 <- FALSE
  has_low_conc <- FALSE
  for (v in vars) {
    val <- tryCatch(get(v, envir = globalenv()), error = function(e) NULL)
    if (is.numeric(val) && length(val) == 1 && !is.na(val)) {
      if (val == 30) has_30 <- TRUE
      if (val < 1.0 && val > 0.5) has_low_conc <- TRUE
    }
  }
  out[[1]] <- list(
    ok = has_30,
    label = "Loop terminated at 30 days",
    detail = if (has_30) "the day counter reached 30"
             else "expected a counter variable equal to 30. Check that you start at 0 and add 1 each iteration."
  )
  out[[2]] <- list(
    ok = has_low_conc,
    label = "Final concentration is below 1.0 mg/L",
    detail = if (has_low_conc) "the concentration dropped below the threshold (≈ 0.98)"
             else "expected a final concentration just below 1.0. Make sure each iteration multiplies by 0.92."
  )
  out
}
`
    },

    // 11.1: linear model + slope ≈ -0.7344
    'ex-11-1': {
      intro: "We'll check that you fit the linear model and extracted the slope.",
      code: `
.assess <- function() {
  out <- list()
  has_df <- exists("gradient_data", envir = globalenv())
  df_ok <- has_df && is.data.frame(get("gradient_data")) && nrow(get("gradient_data")) == 8
  out[[1]] <- list(
    ok = df_ok,
    label = "gradient_data data frame created with 8 rows",
    detail = "should be a data frame combining distance_km and nitrate_mgL"
  )
  found_model <- FALSE
  slope_ok <- FALSE
  for (v in ls(envir = globalenv())) {
    val <- tryCatch(get(v, envir = globalenv()), error = function(e) NULL)
    if (inherits(val, "lm")) {
      found_model <- TRUE
      cf <- tryCatch(coef(val), error = function(e) NULL)
      if (!is.null(cf) && length(cf) >= 2) {
        if (abs(cf[2] - (-0.7344)) < 0.01) slope_ok <- TRUE
      }
    }
  }
  out[[2]] <- list(
    ok = found_model,
    label = "Linear model fit with lm()",
    detail = if (found_model) "an lm object exists in your environment"
             else "no lm() model was found. Use lm(nitrate ~ distance, data = gradient_data)"
  )
  out[[3]] <- list(
    ok = slope_ok,
    label = "Slope ≈ −0.73 mg/L per km",
    detail = if (slope_ok) "the slope matches the expected attenuation rate"
             else "slope didn't match expected value. Did you fit nitrate ~ distance (in that order)?"
  )
  out
}
`
    },
  };

  // Helper used by main.js
  global.__hasAssessment = function (id) {
    return Object.prototype.hasOwnProperty.call(global.__ASSESSMENTS, id);
  };
})(window);
