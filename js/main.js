// main.js — UI wiring: run buttons, TOC active state, progress bar,
// and the assessment-mode toggle for non-plotting exercises.

(function () {
  // ============================================
  // 0. Strip browser writing-assistant behaviors from every code editor.
  //    Code is not prose: no spell check, no autocorrect, no auto-capitalize,
  //    no autocomplete, and no third-party grammar extensions (Grammarly,
  //    LanguageTool). Without this, R function names get red-underlined
  //    and quotes/apostrophes can be silently transformed.
  // ============================================
  function makeEditorBehavior(editor) {
    editor.setAttribute('spellcheck', 'false');
    editor.setAttribute('autocomplete', 'off');
    editor.setAttribute('autocorrect', 'off');
    editor.setAttribute('autocapitalize', 'off');
    // Grammarly opts (covers all known attribute spellings)
    editor.setAttribute('data-gramm', 'false');
    editor.setAttribute('data-gramm_editor', 'false');
    editor.setAttribute('data-enable-grammarly', 'false');
    // LanguageTool opt-out
    editor.setAttribute('data-lt-active', 'false');
  }

  // ============================================
  // 1. Wire up Run buttons in every code cell
  // ============================================
  function wireRunButtons() {
    const cells = document.querySelectorAll('.code-cell');
    cells.forEach((cell) => {
      const btn = cell.querySelector('.run-btn');
      const editor = cell.querySelector('.code-editor');
      const output = cell.querySelector('[data-output]');
      if (!btn || !editor || !output) return;

      // Apply IDE-style behavior to this editor
      makeEditorBehavior(editor);

      // ---- Assessment-mode setup (only if this cell has data-assess) ----
      const assessId = cell.dataset.assess || null;
      const assessable = assessId && window.__hasAssessment && window.__hasAssessment(assessId);

      let modeState = { mode: 'practice' }; // 'practice' or 'assess'
      let feedbackEl = null;

      if (assessable) {
        // Insert the toggle into the cell header, before the run button
        const header = cell.querySelector('.code-cell-header');
        const actionsWrap = document.createElement('div');
        actionsWrap.className = 'code-cell-header-actions';

        const toggle = document.createElement('div');
        toggle.className = 'mode-toggle';
        toggle.setAttribute('role', 'tablist');
        toggle.setAttribute('aria-label', 'Run mode');
        toggle.innerHTML = `
          <button type="button" data-mode="practice" class="active" role="tab" aria-selected="true" title="Just run the code without checking">Just run</button>
          <button type="button" data-mode="assess" role="tab" aria-selected="false" title="Run and check whether your answer is correct">Run &amp; check</button>
        `;
        toggle.querySelectorAll('button').forEach((b) => {
          b.addEventListener('click', () => {
            modeState.mode = b.dataset.mode;
            toggle.querySelectorAll('button').forEach((bb) => {
              const active = bb === b;
              bb.classList.toggle('active', active);
              bb.setAttribute('aria-selected', active ? 'true' : 'false');
            });
            // Hide any previous feedback when switching modes
            if (feedbackEl) {
              feedbackEl.classList.remove('visible', 'pass', 'fail');
              feedbackEl.innerHTML = '';
            }
          });
        });

        // Replace the existing button position with [toggle][button]
        btn.remove();
        actionsWrap.appendChild(toggle);
        actionsWrap.appendChild(btn);
        header.appendChild(actionsWrap);

        // Create a feedback element below the output
        feedbackEl = document.createElement('div');
        feedbackEl.className = 'assessment-feedback';
        // Insert AFTER the output (output is inside the cell)
        output.insertAdjacentElement('afterend', feedbackEl);
      }

      // ---- Click handler ----
      btn.addEventListener('click', () => {
        const code = editor.value;
        if (window.__runR) {
          const opts = {};
          if (assessable && modeState.mode === 'assess') {
            opts.assessmentId = assessId;
            opts.feedbackEl = feedbackEl;
          } else if (feedbackEl) {
            // Practice mode: clear any old feedback
            feedbackEl.classList.remove('visible', 'pass', 'fail');
            feedbackEl.innerHTML = '';
          }
          window.__runR(code, output, btn, opts);
        } else {
          output.classList.add('visible');
          output.innerHTML = '<span class="stderr">R engine not yet loaded — try again in a moment.</span>';
        }
      });

      // Cmd/Ctrl + Enter shortcut to run
      editor.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
          e.preventDefault();
          btn.click();
        }
        if (e.key === 'Tab') {
          e.preventDefault();
          const start = editor.selectionStart;
          const end = editor.selectionEnd;
          editor.value = editor.value.substring(0, start) + '  ' + editor.value.substring(end);
          editor.selectionStart = editor.selectionEnd = start + 2;
        }
      });

      // Strip OS-level smart-typography substitutions that break R syntax.
      // macOS in particular will silently convert "..." → "…",  -> →,
      // and -- → — even when autocorrect is off, because it happens at the
      // text-input service level. We undo it on every input event.
      const SMART_PAIRS = [
        [/[\u2018\u2019\u201A\u201B]/g, "'"],   // smart single quotes
        [/[\u201C\u201D\u201E\u201F]/g, '"'],   // smart double quotes
        [/\u2013/g, '-'],                        // en dash
        [/\u2014/g, '--'],                       // em dash
        [/\u2026/g, '...'],                      // ellipsis
        [/\u2192/g, '->'],                       // rightwards arrow
        [/\u2190/g, '<-'],                       // leftwards arrow
      ];
      const stripSmartTypography = () => {
        const original = editor.value;
        let fixed = original;
        for (const [re, rep] of SMART_PAIRS) fixed = fixed.replace(re, rep);
        if (fixed === original) return;

        // Adjust cursor to account for any length changes that happened
        // before the current cursor position.
        const cursor = editor.selectionStart;
        const beforeCursorOriginal = original.slice(0, cursor);
        let beforeCursorFixed = beforeCursorOriginal;
        for (const [re, rep] of SMART_PAIRS) beforeCursorFixed = beforeCursorFixed.replace(re, rep);
        const newCursor = beforeCursorFixed.length;

        editor.value = fixed;
        editor.selectionStart = editor.selectionEnd = newCursor;
      };

      // Auto-resize textarea to fit content
      const autoresize = () => {
        editor.style.height = 'auto';
        editor.style.height = Math.max(60, editor.scrollHeight) + 'px';
      };
      editor.addEventListener('input', () => {
        stripSmartTypography();
        autoresize();
      });
      requestAnimationFrame(autoresize);
    });
  }

  // ============================================
  // 2. TOC active section highlighting + mobile dropdown behavior
  // ============================================
  function wireTocActiveState() {
    const links = Array.from(document.querySelectorAll('.toc-list a'));
    if (!links.length) return;

    const summaryCurrent = document.querySelector('.toc-summary-current');
    const tocDetails = document.querySelector('.toc-details');

    const sectionMap = new Map();
    links.forEach((a) => {
      const id = a.getAttribute('href').slice(1);
      const sec = document.getElementById(id);
      if (sec) sectionMap.set(sec, a);
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          const a = sectionMap.get(e.target);
          if (!a) return;
          if (e.isIntersecting) {
            links.forEach((l) => l.classList.remove('active'));
            a.classList.add('active');
            // Update mobile summary's "current section" label
            if (summaryCurrent) {
              // Use the link text minus its number prefix
              const numEl = a.querySelector('.toc-num');
              const numText = numEl ? numEl.textContent.trim() : '';
              const fullText = a.textContent.trim();
              const labelText = numText ? fullText.slice(numText.length).trim() : fullText;
              summaryCurrent.textContent = labelText;
            }
          }
        });
      },
      {
        rootMargin: '-20% 0px -70% 0px',
        threshold: 0,
      }
    );
    sectionMap.forEach((a, sec) => observer.observe(sec));

    // --- Mobile dropdown behavior ---
    // When a TOC link is clicked at mobile widths, collapse the dropdown
    // so the destination section is visible immediately.
    function isMobile() {
      return window.matchMedia('(max-width: 980px)').matches;
    }

    if (tocDetails) {
      links.forEach((a) => {
        a.addEventListener('click', () => {
          if (isMobile()) {
            // Close the dropdown after navigation
            tocDetails.open = false;
          }
        });
      });

      // Force open at desktop widths, closed at mobile widths.
      const enforceState = () => {
        tocDetails.open = !isMobile();
      };
      window.addEventListener('resize', enforceState);
      enforceState();
    }
  }

  // ============================================
  // 3. Reading progress bar
  // ============================================
  function wireProgress() {
    const fill = document.getElementById('progress-fill');
    if (!fill) return;
    const update = () => {
      const h = document.documentElement;
      const total = h.scrollHeight - h.clientHeight;
      const pct = total > 0 ? (h.scrollTop / total) * 100 : 0;
      fill.style.width = pct + '%';
    };
    document.addEventListener('scroll', update, { passive: true });
    update();
  }

  // ============================================
  // 4. Init
  // ============================================
  function init() {
    wireRunButtons();
    wireTocActiveState();
    wireProgress();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
