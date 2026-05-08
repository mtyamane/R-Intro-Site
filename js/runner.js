// runner.js — WebR-based R execution for the watershed ecology tutorial.
// Assessment specifications live in assessments.js (loaded as a plain
// script before this module). This file handles WebR setup and code
// execution; if the WebR import fails, the toggle UI in main.js still
// works because it reads from window.__ASSESSMENTS, not from this module.

import { WebR } from 'https://webr.r-wasm.org/v0.5.9/webr.mjs';

const statusEl = document.getElementById('r-status');
const statusText = statusEl?.querySelector('.r-status-text');

function setStatus(state, text) {
  if (!statusEl) return;
  statusEl.classList.remove('ready', 'error');
  if (state) statusEl.classList.add(state);
  if (statusText) statusText.textContent = text;
}

// ---- WebR singleton ----
let webR = null;
let webRReady = null;

async function initWebR() {
  if (webRReady) return webRReady;

  setStatus(null, 'Downloading R…');

  webRReady = (async () => {
    try {
      webR = new WebR();
      await webR.init();

      setStatus(null, 'Loading ggplot2…');
      await webR.installPackages(['ggplot2'], { quiet: true });

      setStatus('ready', 'R ready');
      return webR;
    } catch (err) {
      console.error('WebR init failed:', err);
      setStatus('error', 'R failed to load');
      throw err;
    }
  })();

  return webRReady;
}

// ---- Output helpers ----
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function bitmapToCanvas(bitmap) {
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.style.maxWidth = '100%';
  canvas.style.height = 'auto';
  canvas.style.background = 'white';
  canvas.style.borderRadius = '4px';
  canvas.style.padding = '6px';
  canvas.style.margin = '8px 0';
  canvas.style.display = 'block';
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0);
  return canvas;
}

// =====================================================================
// Assessment glue
// =====================================================================
function getAssessment(id) {
  const map = window.__ASSESSMENTS || {};
  return map[id] || null;
}

// Build a single R script that runs the student code, then the validator,
// then prints a sentinel-wrapped result line.
function buildAssessmentScript(studentCode, exerciseId) {
  const spec = getAssessment(exerciseId);
  if (!spec) return studentCode;

  const validator = `

# ---- assessment validator (auto-injected) ----
${spec.code}
.results <- tryCatch(.assess(), error = function(e) {
  list(list(ok = FALSE, label = "Validator error", detail = conditionMessage(e)))
})

.flatten <- function(rs) {
  parts <- c()
  for (r in rs) {
    parts <- c(parts,
               if (isTRUE(r$ok)) "1" else "0",
               gsub("[|\\n\\r]", " ", as.character(r$label)),
               gsub("[|\\n\\r]", " ", as.character(r$detail)))
  }
  paste(parts, collapse = "|")
}
cat(paste0("\\n__ASSESS__|", .flatten(.results), "|__END__\\n"))
`;
  return studentCode + validator;
}

// JS-side textual check (for ex-5-1 and any future ones with textCheck)
function runTextCheck(studentCode, exerciseId) {
  const spec = getAssessment(exerciseId);
  if (!spec || !spec.textCheck) return null;
  const tc = spec.textCheck;
  const codeNoComments = studentCode.replace(/#[^\n]*/g, '');
  const missing = (tc.mustContain || []).filter((tok) => !codeNoComments.includes(tok));
  if (missing.length === 0) {
    return { ok: true, label: tc.label, detail: '' };
  }
  return {
    ok: false,
    label: tc.label,
    detail: `${tc.detail} (missing: ${missing.map((m) => '"' + m + '"').join(', ')})`,
  };
}

function parseAssessment(stdout) {
  const re = /__ASSESS__\|([\s\S]*?)\|__END__/;
  const m = stdout.match(re);
  if (!m) return null;
  const flat = m[1];
  const parts = flat.split('|');
  const results = [];
  for (let i = 0; i + 2 < parts.length; i += 3) {
    results.push({
      ok: parts[i] === '1',
      label: parts[i + 1],
      detail: parts[i + 2],
    });
  }
  return results;
}

function renderAssessmentFeedback(feedbackEl, results, allPass) {
  feedbackEl.classList.remove('pass', 'fail');
  feedbackEl.classList.add('visible', allPass ? 'pass' : 'fail');

  const icon = allPass ? '✓' : '✗';
  const title = allPass
    ? 'Looks correct!'
    : 'Not quite — see what to revisit:';

  let html = `<div><span class="feedback-icon">${icon}</span><span class="feedback-title">${escapeHtml(title)}</span></div>`;
  html += '<ul>';
  for (const r of results) {
    const mark = r.ok ? '✓' : '✗';
    html += `<li><strong>${mark}</strong> ${escapeHtml(r.label)}`;
    if (!r.ok && r.detail) {
      html += ` — <em>${escapeHtml(r.detail)}</em>`;
    }
    html += '</li>';
  }
  html += '</ul>';
  feedbackEl.innerHTML = html;
}

// ---- Run R code from a code cell ----
export async function runR(code, outputEl, button, options = {}) {
  const { assessmentId = null, feedbackEl = null } = options;

  outputEl.classList.add('visible');
  outputEl.innerHTML = '<span style="color:#9aa49a">Running…</span>';

  if (feedbackEl) {
    feedbackEl.classList.remove('visible', 'pass', 'fail');
    feedbackEl.innerHTML = '';
  }

  if (button) {
    button.disabled = true;
    button.classList.add('running');
  }

  let shelter = null;
  try {
    await initWebR();
    shelter = await new webR.Shelter();

    // Cell isolation: every run starts with a clean global environment so
    // variables from earlier cells can't satisfy a later cell's checks.
    // We prepend the reset to whatever script we're about to run.
    const ISOLATION_RESET = 'rm(list = ls(envir = globalenv()), envir = globalenv())\n';

    const baseScript = assessmentId
      ? buildAssessmentScript(code, assessmentId)
      : code;
    const codeToRun = ISOLATION_RESET + baseScript;

    const result = await shelter.captureR(codeToRun, {
      withAutoprint: true,
      captureStreams: true,
      captureConditions: false,
      captureGraphics: {
        width: 700,
        height: 500,
        bg: 'white',
      },
    });

    let rawStdout = '';
    for (const item of result.output || []) {
      if (item.type === 'stdout') rawStdout += item.data + '\n';
    }

    // Build the visible output (interleaving stdout and stderr in order),
    // hiding the assessment marker line from the user.
    outputEl.innerHTML = '';
    let displayHtml = '';
    for (const item of result.output || []) {
      if (item.type === 'stdout') {
        let txt = item.data;
        if (assessmentId && (txt.includes('__ASSESS__') || txt.includes('__END__'))) continue;
        displayHtml += escapeHtml(txt) + '\n';
      } else if (item.type === 'stderr') {
        displayHtml += `<span class="stderr">${escapeHtml(item.data)}</span>\n`;
      }
    }
    if (displayHtml.trim()) {
      const pre = document.createElement('div');
      pre.innerHTML = displayHtml;
      outputEl.appendChild(pre);
    }

    if (result.images && result.images.length > 0) {
      for (const img of result.images) {
        outputEl.appendChild(bitmapToCanvas(img));
      }
    }

    if (!displayHtml.trim() && (!result.images || result.images.length === 0)) {
      outputEl.innerHTML = '<span style="color:#9aa49a">(no output)</span>';
    }

    // Render assessment feedback
    if (assessmentId && feedbackEl) {
      const results = parseAssessment(rawStdout);
      const textResult = runTextCheck(code, assessmentId);
      if (results && results.length > 0) {
        const allResults = textResult ? [textResult, ...results] : results;
        const allPass = allResults.every((r) => r.ok);
        renderAssessmentFeedback(feedbackEl, allResults, allPass);
      } else {
        feedbackEl.classList.add('visible', 'fail');
        feedbackEl.innerHTML =
          '<div><span class="feedback-icon">✗</span><span class="feedback-title">Couldn\'t assess your code.</span></div>' +
          '<ul><li>Your code may have produced an error before the validator could run. Check the output above and try again.</li></ul>';
      }
    }
  } catch (err) {
    console.error('R execution error:', err);
    const msg = err?.message || String(err);
    outputEl.innerHTML = `<span class="stderr">Error: ${escapeHtml(msg)}</span>`;
    if (feedbackEl && assessmentId) {
      feedbackEl.classList.add('visible', 'fail');
      feedbackEl.innerHTML =
        '<div><span class="feedback-icon">✗</span><span class="feedback-title">Code didn\'t run.</span></div>' +
        '<ul><li>R hit an error before completing. Read the error message above and check for typos or missing parentheses.</li></ul>';
    }
  } finally {
    if (shelter) {
      try { await shelter.purge(); } catch (e) { /* ignore */ }
    }
    if (button) {
      button.disabled = false;
      button.classList.remove('running');
    }
  }
}

// Expose runR globally for main.js
window.__runR = runR;
window.__initWebR = initWebR;

// Kick off WebR init in the background
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initWebR().catch(() => {}));
} else {
  initWebR().catch(() => {});
}
