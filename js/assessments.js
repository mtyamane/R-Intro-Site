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
      intro: "We'll check that you computed the discharge and stored it in a variable called 'discharge'.",
      code: `
.assess <- function() {
  out <- list()
  has_var <- exists("discharge", envir = globalenv())
  val <- if (has_var) tryCatch(get("discharge", envir = globalenv()), error = function(e) NULL) else NULL
  out[[1]] <- list(
    ok = has_var,
    label = "Variable named 'discharge' was created",
    detail = if (has_var) "found a variable named 'discharge'"
             else "no variable named 'discharge' was created — the prompt asks you to store the answer in a variable with that name"
  )
  value_ok <- has_var && is.numeric(val) && length(val) == 1 &&
              !is.na(val) && abs(val - 0.9996) < 0.01
  out[[2]] <- list(
    ok = value_ok,
    label = "Discharge value ≈ 1.00 m³/s",
    detail = if (value_ok) "you computed the discharge correctly"
             else "the value of 'discharge' should be approximately 1.00 m³/s. Did you multiply width × depth × velocity?"
  )
  out
}
`
    },

    // 4.1: nitrate vector + nitrate_mean + nitrate_sd + n_high (count > 1.0)
    'ex-4-1': {
      intro: "We'll check the four named variables: nitrate, nitrate_mean, nitrate_sd, n_high.",
      code: `
.assess <- function() {
  out <- list()
  expected <- c(0.42, 1.85, 0.31, 2.94, 1.12, 0.58, 3.21, 0.27, 2.05, 1.43)

  # --- 1. nitrate vector ---
  has_vec <- exists("nitrate", envir = globalenv())
  nit <- if (has_vec) tryCatch(get("nitrate", envir = globalenv()), error = function(e) NULL) else NULL
  vec_ok <- has_vec && is.numeric(nit) && length(nit) == 10 &&
            all(abs(nit - expected) < 1e-6)
  out[[1]] <- list(
    ok = vec_ok,
    label = "Variable 'nitrate' is the 10-value vector",
    detail = if (vec_ok) "vector stored correctly"
             else if (!has_vec) "no variable named 'nitrate' was created"
             else "the variable 'nitrate' exists but its values don't match the 10 listed in the prompt"
  )

  # --- 2. nitrate_mean ---
  has_mean <- exists("nitrate_mean", envir = globalenv())
  m_val <- if (has_mean) tryCatch(get("nitrate_mean", envir = globalenv()), error = function(e) NULL) else NULL
  mean_ok <- has_mean && is.numeric(m_val) && length(m_val) == 1 &&
             !is.na(m_val) && abs(m_val - mean(expected)) < 1e-3
  out[[2]] <- list(
    ok = mean_ok,
    label = "Variable 'nitrate_mean' \u2248 1.418",
    detail = if (mean_ok) "mean is correct"
             else if (!has_mean) "no variable named 'nitrate_mean' was created"
             else "expected nitrate_mean to be approximately 1.418 \u2014 use mean(nitrate)"
  )

  # --- 3. nitrate_sd ---
  has_sd <- exists("nitrate_sd", envir = globalenv())
  s_val <- if (has_sd) tryCatch(get("nitrate_sd", envir = globalenv()), error = function(e) NULL) else NULL
  sd_ok <- has_sd && is.numeric(s_val) && length(s_val) == 1 &&
           !is.na(s_val) && abs(s_val - sd(expected)) < 1e-3
  out[[3]] <- list(
    ok = sd_ok,
    label = "Variable 'nitrate_sd' \u2248 1.077",
    detail = if (sd_ok) "standard deviation is correct"
             else if (!has_sd) "no variable named 'nitrate_sd' was created"
             else "expected nitrate_sd to be approximately 1.077 \u2014 use sd(nitrate)"
  )

  # --- 4. n_high (count > 1.0) ---
  has_n <- exists("n_high", envir = globalenv())
  n_val <- if (has_n) tryCatch(get("n_high", envir = globalenv()), error = function(e) NULL) else NULL
  n_ok <- has_n && is.numeric(n_val) && length(n_val) == 1 && !is.na(n_val) && n_val == 6
  out[[4]] <- list(
    ok = n_ok,
    label = "Variable 'n_high' equals 6",
    detail = if (n_ok) "six sites exceed 1.0 mg/L"
             else if (!has_n) "no variable named 'n_high' was created"
             else "expected n_high to be 6; try sum(nitrate > 1.0)"
  )
  out
}
`
    },

    // 5.1: stream_data + forest_ept_mean (≈18.5) + n_urban (==3) + cool_sites (6 rows)
    'ex-5-1': {
      intro: "We'll check stream_data and the three named answer variables.",
      code: `
.assess <- function() {
  out <- list()

  # --- 1. stream_data data frame ---
  has_df <- exists("stream_data", envir = globalenv())
  sd <- if (has_df) tryCatch(get("stream_data", envir = globalenv()), error = function(e) NULL) else NULL
  df_ok <- has_df && is.data.frame(sd) && nrow(sd) == 10 &&
           all(c("land_use", "ept_taxa", "temp_C") %in% names(sd))
  out[[1]] <- list(
    ok = df_ok,
    label = "Data frame 'stream_data' is recreated",
    detail = if (df_ok) "data frame structure looks correct"
             else if (!has_df) "no variable named 'stream_data' was created \u2014 you need to recreate the data frame at the top of your answer cell"
             else "stream_data exists but should have 10 rows and columns land_use, ept_taxa, and temp_C"
  )

  # --- 2. forest_ept_mean ---
  has_fm <- exists("forest_ept_mean", envir = globalenv())
  fm_val <- if (has_fm) tryCatch(get("forest_ept_mean", envir = globalenv()), error = function(e) NULL) else NULL
  fm_ok <- has_fm && is.numeric(fm_val) && length(fm_val) == 1 &&
           !is.na(fm_val) && abs(fm_val - 18.5) < 0.05
  out[[2]] <- list(
    ok = fm_ok,
    label = "Variable 'forest_ept_mean' \u2248 18.5",
    detail = if (fm_ok) "the forest-only mean is correct"
             else if (!has_fm) "no variable named 'forest_ept_mean' was created"
             else "expected forest_ept_mean \u2248 18.5; subset stream_data to land_use == 'Forest', then use mean(...$ept_taxa)"
  )

  # --- 3. n_urban ---
  has_nu <- exists("n_urban", envir = globalenv())
  nu_val <- if (has_nu) tryCatch(get("n_urban", envir = globalenv()), error = function(e) NULL) else NULL
  nu_ok <- has_nu && is.numeric(nu_val) && length(nu_val) == 1 && !is.na(nu_val) && nu_val == 3
  out[[3]] <- list(
    ok = nu_ok,
    label = "Variable 'n_urban' equals 3",
    detail = if (nu_ok) "three urban sites \u2014 correct"
             else if (!has_nu) "no variable named 'n_urban' was created"
             else "expected n_urban to be 3; try sum(stream_data$land_use == 'Urban')"
  )

  # --- 4. cool_sites (data frame with 6 rows where temp_C < 15) ---
  has_cs <- exists("cool_sites", envir = globalenv())
  cs_val <- if (has_cs) tryCatch(get("cool_sites", envir = globalenv()), error = function(e) NULL) else NULL
  cs_ok <- has_cs && is.data.frame(cs_val) && nrow(cs_val) == 6 &&
           "temp_C" %in% names(cs_val) && all(cs_val$temp_C < 15)
  out[[4]] <- list(
    ok = cs_ok,
    label = "Variable 'cool_sites' is the 6-row filtered data frame",
    detail = if (cs_ok) "filtered subset is correct"
             else if (!has_cs) "no variable named 'cool_sites' was created"
             else "expected cool_sites to be a data frame with 6 rows where temp_C < 15; try stream_data[stream_data$temp_C < 15, ]"
  )
  out
}
`
    },

    // 6.1: is_suitable <- site_do >= 6 & site_temp < 20 → TRUE
    'ex-6-1': {
      intro: "We'll check that you stored TRUE in 'is_suitable' using the right operators.",
      code: `
.assess <- function() {
  out <- list()

  # --- 1. inputs preserved ---
  inputs_ok <- exists("site_do", envir = globalenv()) &&
               exists("site_temp", envir = globalenv()) &&
               isTRUE(get("site_do") == 7.4) &&
               isTRUE(get("site_temp") == 17.8)
  out[[1]] <- list(
    ok = inputs_ok,
    label = "Inputs site_do = 7.4 and site_temp = 17.8 preserved",
    detail = if (inputs_ok) "inputs are intact"
             else "the values for site_do and site_temp were changed \u2014 please leave them as 7.4 and 17.8 to be assessed"
  )

  # --- 2. is_suitable variable created ---
  has_var <- exists("is_suitable", envir = globalenv())
  val <- if (has_var) tryCatch(get("is_suitable", envir = globalenv()), error = function(e) NULL) else NULL
  val_ok <- has_var && is.logical(val) && length(val) == 1 && !is.na(val) && isTRUE(val)
  out[[2]] <- list(
    ok = val_ok,
    label = "Variable 'is_suitable' is TRUE",
    detail = if (val_ok) "the site meets both criteria \u2014 correct"
             else if (!has_var) "no variable named 'is_suitable' was created \u2014 the prompt asks you to assign the result with <-"
             else if (!is.logical(val)) "is_suitable should be a logical value (TRUE or FALSE), not a number or string"
             else "is_suitable should be TRUE for site_do = 7.4 and site_temp = 17.8 \u2014 combine 'site_do >= 6.0' AND 'site_temp < 20' with the & operator"
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
  has_var <- exists("Dt", envir = globalenv())
  val <- if (has_var) tryCatch(get("Dt", envir = globalenv()), error = function(e) NULL) else NULL
  out[[1]] <- list(
    ok = has_var,
    label = "Variable named 'Dt' was created",
    detail = if (has_var) "found a variable named 'Dt'"
             else "no variable named 'Dt' was created — the prompt asks you to store the deficit in a variable with that name"
  )
  value_ok <- has_var && is.numeric(val) && length(val) == 1 &&
              !is.na(val) && abs(val - 1.5747) < 0.01
  out[[2]] <- list(
    ok = value_ok,
    label = "DO deficit Dt ≈ 1.575 mg/L after 3 days",
    detail = if (value_ok) "you computed the deficit correctly"
             else "the value of 'Dt' should be approximately 1.575. Check that you used exp() and the right sign on -k2*t."
  )
  out
}
`
    },

    // 8.1: sc_data with tds_mgL + tds_concern columns, plus concern_sites filtered df
    'ex-8-1': {
      intro: "We'll check sc_data's two new columns and the concern_sites filtered subset.",
      code: `
.assess <- function() {
  out <- list()

  # --- 1. sc_data with tds_mgL column (= 0.65 \u00d7 sc_uScm) ---
  has_df <- exists("sc_data", envir = globalenv())
  sd <- if (has_df) tryCatch(get("sc_data", envir = globalenv()), error = function(e) NULL) else NULL
  df_intact <- has_df && is.data.frame(sd) && nrow(sd) == 8 && "sc_uScm" %in% names(sd)
  tds_ok <- df_intact && "tds_mgL" %in% names(sd) &&
            is.numeric(sd$tds_mgL) &&
            all(abs(sd$tds_mgL - 0.65 * sd$sc_uScm) < 1e-6)
  out[[1]] <- list(
    ok = tds_ok,
    label = "sc_data has 'tds_mgL' column with correct values",
    detail = if (tds_ok) "TDS values match 0.65 \u00d7 sc_uScm"
             else if (!has_df) "no variable named 'sc_data' was created \u2014 keep the starter data frame in your answer"
             else if (!df_intact) "sc_data should still be an 8-row data frame containing the original sc_uScm column"
             else if (!("tds_mgL" %in% names(sd))) "sc_data is missing the 'tds_mgL' column"
             else "the values in 'tds_mgL' don't match 0.65 \u00d7 sc_uScm"
  )

  # --- 2. sc_data with tds_concern column (TRUE where tds_mgL > 500) ---
  concern_col_ok <- df_intact && "tds_concern" %in% names(sd) &&
                    "tds_mgL" %in% names(sd) &&
                    is.logical(sd$tds_concern) &&
                    all(sd$tds_concern == (sd$tds_mgL > 500))
  out[[2]] <- list(
    ok = concern_col_ok,
    label = "sc_data has 'tds_concern' logical column",
    detail = if (concern_col_ok) "TRUE where TDS > 500, FALSE elsewhere \u2014 correct"
             else if (!df_intact || !("tds_mgL" %in% names(sd))) "you need the tds_mgL column in place before adding tds_concern"
             else if (!("tds_concern" %in% names(sd))) "sc_data is missing the 'tds_concern' column"
             else if (!is.logical(sd$tds_concern)) "tds_concern should be a logical (TRUE/FALSE) column \u2014 use the comparison sd$tds_mgL > 500"
             else "tds_concern values don't match (tds_mgL > 500)"
  )

  # --- 3. concern_sites: filtered data frame with only TRUE rows ---
  has_cs <- exists("concern_sites", envir = globalenv())
  cs <- if (has_cs) tryCatch(get("concern_sites", envir = globalenv()), error = function(e) NULL) else NULL
  cs_ok <- has_cs && is.data.frame(cs) && "tds_concern" %in% names(cs) &&
           "tds_mgL" %in% names(cs) &&
           all(cs$tds_concern == TRUE) && all(cs$tds_mgL > 500) &&
           nrow(cs) > 0
  out[[3]] <- list(
    ok = cs_ok,
    label = "Variable 'concern_sites' is the filtered data frame",
    detail = if (cs_ok) "concern_sites contains only the rows where tds_concern is TRUE"
             else if (!has_cs) "no variable named 'concern_sites' was created"
             else if (!is.data.frame(cs)) "concern_sites should be a data frame, not a vector or other type"
             else "concern_sites should contain only the rows of sc_data where tds_concern is TRUE \u2014 try sc_data[sc_data$tds_concern, ]"
  )
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

    // 10.1: while loop — days = 30 and concentration just below 1.0
    'ex-10-1': {
      intro: "We'll check the 'days' counter and the final 'concentration' value.",
      code: `
.assess <- function() {
  out <- list()
  has_days <- exists("days", envir = globalenv())
  days_val <- if (has_days) tryCatch(get("days", envir = globalenv()), error = function(e) NULL) else NULL
  days_ok <- has_days && is.numeric(days_val) && length(days_val) == 1 &&
             !is.na(days_val) && days_val == 30
  out[[1]] <- list(
    ok = days_ok,
    label = "Variable 'days' equals 30",
    detail = if (days_ok) "the day counter reached 30"
             else if (!has_days) "no variable named 'days' was created"
             else "expected 'days' to be 30. Check that you start at 0 and add 1 each iteration of the while loop."
  )
  has_conc <- exists("concentration", envir = globalenv())
  conc_val <- if (has_conc) tryCatch(get("concentration", envir = globalenv()), error = function(e) NULL) else NULL
  conc_ok <- has_conc && is.numeric(conc_val) && length(conc_val) == 1 &&
             !is.na(conc_val) && conc_val < 1.0 && conc_val > 0.5
  out[[2]] <- list(
    ok = conc_ok,
    label = "Variable 'concentration' is just below 1.0 mg/L",
    detail = if (conc_ok) "concentration dropped below the threshold (≈ 0.98 mg/L)"
             else if (!has_conc) "no variable named 'concentration' was created"
             else "expected 'concentration' to be just below 1.0. Make sure each iteration multiplies by 0.92."
  )
  out
}
`
    },

    // 11.1: gradient_data + nitrate_mod (lm) + slope (≈ -0.7344)
    'ex-11-1': {
      intro: "We'll check gradient_data, the lm stored in nitrate_mod, and the slope variable.",
      code: `
.assess <- function() {
  out <- list()

  # --- 1. gradient_data ---
  has_df <- exists("gradient_data", envir = globalenv())
  gd <- if (has_df) tryCatch(get("gradient_data", envir = globalenv()), error = function(e) NULL) else NULL
  df_ok <- has_df && is.data.frame(gd) && nrow(gd) == 8 && ncol(gd) >= 2
  out[[1]] <- list(
    ok = df_ok,
    label = "Data frame 'gradient_data' has 8 rows",
    detail = if (df_ok) "data frame structure looks correct"
             else if (!has_df) "no variable named 'gradient_data' was created"
             else "gradient_data should be a data frame with 8 rows, combining distance_km and nitrate_mgL"
  )

  # --- 2. nitrate_mod is an lm object ---
  has_mod <- exists("nitrate_mod", envir = globalenv())
  mod <- if (has_mod) tryCatch(get("nitrate_mod", envir = globalenv()), error = function(e) NULL) else NULL
  mod_ok <- has_mod && inherits(mod, "lm")
  cf <- if (mod_ok) tryCatch(coef(mod), error = function(e) NULL) else NULL
  slope_correct_in_mod <- mod_ok && !is.null(cf) && length(cf) >= 2 &&
                          !is.na(cf[2]) && abs(cf[2] - (-0.7344)) < 0.01
  out[[2]] <- list(
    ok = mod_ok && slope_correct_in_mod,
    label = "Variable 'nitrate_mod' is the fitted linear model",
    detail = if (mod_ok && slope_correct_in_mod) "lm object stored in nitrate_mod with the expected slope"
             else if (!has_mod) "no variable named 'nitrate_mod' was created"
             else if (!mod_ok) "nitrate_mod exists but isn't an lm object \u2014 use lm(nitrate ~ distance, data = gradient_data)"
             else "nitrate_mod is an lm object but the slope doesn't match the expected value. Did you fit nitrate ~ distance (in that order)?"
  )

  # --- 3. slope variable ---
  has_slope <- exists("slope", envir = globalenv())
  sl <- if (has_slope) tryCatch(get("slope", envir = globalenv()), error = function(e) NULL) else NULL
  slope_ok <- has_slope && is.numeric(sl) && length(sl) == 1 &&
              !is.na(sl) && abs(sl - (-0.7344)) < 0.01
  out[[3]] <- list(
    ok = slope_ok,
    label = "Variable 'slope' \u2248 \u22120.73 mg/L per km",
    detail = if (slope_ok) "the slope matches the expected attenuation rate"
             else if (!has_slope) "no variable named 'slope' was created \u2014 the prompt asks you to extract the slope with coef() and store it"
             else if (!is.numeric(sl) || length(sl) != 1) "slope should be a single number; coef(nitrate_mod)[2] gives the slope"
             else "the value of slope doesn't match the expected ~\u22120.73. Did you take coef(nitrate_mod)[2]?"
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
