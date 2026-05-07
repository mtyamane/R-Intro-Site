// rmd-export.js — Build an R Markdown version of the guide on demand and
// trigger a file download. Runs as a plain script (not a module) so it
// works regardless of WebR's load state. Wires up to a Download button.
//
// Conversion philosophy:
//  - Worked example code cells become live ```{r} chunks (students can
//    knit the Rmd and see the same output as on the website).
//  - Exercise blocks keep the prompt and provide an empty ```{r} chunk
//    for the student to attempt — no solution code, no spoilers.
//  - Each exercise replaces its solution with a short description of the
//    expected result and a link back to the website's worked solution.
//  - Hero, TOC, R-engine status, and other UI chrome are excluded.

(function () {
  'use strict';

  // -----------------------------------------------------------------------
  // Per-exercise expected-output text. Keyed by exercise ID. These describe
  // (in plain prose) what the student's correct answer should produce, so
  // the Rmd reader has something to compare their attempt against without
  // seeing the actual solution code.
  // -----------------------------------------------------------------------
  const EXPECTED_OUTPUT = {
    'ex-3-1':
      'A single value of approximately **0.9996 m³/s** (the velocity-area discharge for w = 4.2 m, d = 0.35 m, v = 0.68 m/s).',
    'ex-4-1':
      'The mean of `nitrate` is approximately **1.418 mg/L**, the standard deviation is approximately **1.077 mg/L**, and **6 of the 10 sites** exceed 1.0 mg/L.',
    'ex-5-1':
      'For the recreated `stream_data`: the mean EPT richness in **Forest** sites is **18.5**, there are **3 Urban** sites, and **6 sites** have temperatures below 15 °C.',
    'ex-6-1':
      'The expression returns `TRUE` for the inputs `site_do = 7.4` and `site_temp = 17.8`.',
    'ex-7-1':
      'A single value of approximately **1.575 mg/L** for the dissolved-oxygen deficit at t = 3 days.',
    'ex-8-1':
      'A data frame with the new `tds_mgL` column (= 0.65 × `sc_uScm`) and a logical `tds_concern` column. **2 sites** exceed 500 mg/L TDS.',
    'ex-9-1':
      'The variable `storm_days` should equal **3** — three days of the 14-day series have discharge above 5.0 m³/s (8.7, 12.4, and 7.8 m³/s).',
    'ex-10-1':
      'The loop should terminate after **30 days**, with a final concentration just below 1.0 mg/L (approximately **0.984 mg/L**).',
    'ex-11-1':
      'A linear model with intercept ≈ **4.66** and slope ≈ **-0.73 mg/L per km** (the longitudinal nitrate attenuation rate).',
    'ex-12-1':
      'A base-R scatterplot of `nitrate` vs `distance_km`, with the fitted regression line drawn through the points using `abline()`.',
    'ex-13-1':
      'A ggplot scatterplot of `nitrate` vs `distance_km` with a fitted linear smooth line (e.g., from `geom_smooth(method = "lm")`).',
  };

  // The site URL the Rmd document links back to for solutions. Default
  // is the production GitHub Pages URL; when the page is opened from
  // localhost or a file:// URL, fall back to the current href.
  function getSiteBase() {
    return window.location.href.split('#')[0];
  }

  // -----------------------------------------------------------------------
  // Inline-content conversion: turn an HTMLElement's inner HTML into
  // markdown text, preserving common inline formatting.
  // -----------------------------------------------------------------------
  function inlineToMarkdown(node) {
    if (!node) return '';
    let out = '';
    for (const child of node.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        out += child.textContent;
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const tag = child.tagName.toLowerCase();
        const inner = inlineToMarkdown(child);
        switch (tag) {
          case 'strong':
          case 'b':
            out += `**${inner}**`;
            break;
          case 'em':
          case 'i':
            out += `*${inner}*`;
            break;
          case 'code':
            // Wrap in single backticks; if the content itself contains
            // a backtick, use double backticks with padding.
            if (inner.includes('`')) {
              out += `\`\` ${inner} \`\``;
            } else {
              out += `\`${inner}\``;
            }
            break;
          case 'kbd':
            out += `\`${inner}\``;
            break;
          case 'a': {
            const href = child.getAttribute('href') || '';
            // Internal anchor links: prefix with site URL so the link
            // resolves back to the website even when the Rmd is rendered
            // and viewed elsewhere.
            if (href.startsWith('#')) {
              out += `[${inner}](${getSiteBase()}${href})`;
            } else {
              out += `[${inner}](${href})`;
            }
            break;
          }
          case 'br':
            out += '  \n';
            break;
          case 'span':
          case 'sup':
          case 'sub':
            out += inner;
            break;
          default:
            out += inner;
        }
      }
    }
    return out;
  }

  // Collapse whitespace in a paragraph but keep intentional line breaks.
  function tidyParagraph(text) {
    return text.replace(/[ \t]+/g, ' ').replace(/\s+\n/g, '\n').trim();
  }

  // -----------------------------------------------------------------------
  // Block-level conversion of a single child element of a section.
  // Returns markdown text (possibly multi-line) or an empty string for
  // elements that should be skipped.
  // -----------------------------------------------------------------------
  function blockToMarkdown(el, ctx) {
    const tag = el.tagName.toLowerCase();

    if (el.classList.contains('chapter-header')) {
      const num = el.querySelector('.chapter-number')?.textContent.trim() || '';
      const title = el.querySelector('.chapter-title')?.textContent.trim() || '';
      // # for chapter titles, italic chapter number above
      return `\n# ${title}\n\n*${num}*\n`;
    }

    if (tag === 'h3') return `\n## ${tidyParagraph(inlineToMarkdown(el))}\n`;
    if (tag === 'h4') return `\n### ${tidyParagraph(inlineToMarkdown(el))}\n`;

    if (tag === 'p') {
      // Skip purely decorative paragraphs that exist only for visual flourish
      if (el.classList.contains('closing-mark')) return '';
      const txt = tidyParagraph(inlineToMarkdown(el));
      if (!txt) return '';
      // Category-style labels in the "Where to Go Next" cards: bold them
      if (el.classList.contains('next-card-tag')) {
        return `\n**${txt}**\n`;
      }
      return `\n${txt}\n`;
    }

    if (tag === 'ul' || tag === 'ol') {
      const isOrdered = tag === 'ol';
      const items = Array.from(el.children).filter((c) => c.tagName.toLowerCase() === 'li');
      const lines = items.map((li, i) => {
        const marker = isOrdered ? `${i + 1}.` : '-';
        // Process inline content; if li contains nested ul/ol, recurse with indent
        const directInline = [];
        const nested = [];
        for (const c of li.childNodes) {
          if (c.nodeType === Node.ELEMENT_NODE && (c.tagName.toLowerCase() === 'ul' || c.tagName.toLowerCase() === 'ol')) {
            nested.push(c);
          } else {
            directInline.push(c);
          }
        }
        const wrapper = document.createElement('span');
        directInline.forEach((c) => wrapper.appendChild(c.cloneNode(true)));
        let line = `${marker} ${tidyParagraph(inlineToMarkdown(wrapper))}`;
        for (const sub of nested) {
          const subMd = blockToMarkdown(sub, ctx);
          // Indent every line of the nested list by 2 spaces
          line += '\n' + subMd.split('\n').map((l) => (l ? '  ' + l : l)).join('\n');
        }
        return line;
      });
      return '\n' + lines.join('\n') + '\n';
    }

    if (el.classList.contains('aside-note')) {
      // Render aside notes as a block quote so they stand apart from prose
      const md = inlineToMarkdown(el).trim();
      return '\n' + md.split('\n').map((l) => `> ${l}`).join('\n') + '\n';
    }

    if (tag === 'figure') {
      // Skip figures (the RStudio screenshot, image placeholders), but
      // keep the caption as italic prose for context.
      const cap = el.querySelector('figcaption');
      if (cap) {
        return `\n*${tidyParagraph(inlineToMarkdown(cap))}*\n`;
      }
      return '';
    }

    if (el.classList.contains('code-cell')) {
      return codeCellToMarkdown(el, ctx);
    }

    if (el.classList.contains('exercise')) {
      return exerciseToMarkdown(el, ctx);
    }

    // Generic fallback: walk children
    if (tag === 'div') {
      const parts = [];
      for (const c of el.children) {
        const p = blockToMarkdown(c, ctx);
        if (p) parts.push(p);
      }
      return parts.join('\n');
    }

    return '';
  }

  function codeCellToMarkdown(cell, ctx) {
    const editor = cell.querySelector('.code-editor');
    if (!editor) return '';
    const code = editor.value !== undefined ? editor.value : editor.textContent;
    const trimmed = code.replace(/\s+$/, '');
    const label = cell.querySelector('.code-cell-label')?.textContent.trim() || '';
    let header = '';
    // If the cell has a meaningful label other than just "R", surface it
    // as an italic caption above the chunk so the reader has context.
    if (label && !/^R$/i.test(label) && !/^R\s*·\s*Solution$/i.test(label)) {
      header = `\n*${label}*\n`;
    }
    return `${header}\n\`\`\`{r}\n${trimmed}\n\`\`\`\n`;
  }

  function exerciseToMarkdown(ex, ctx) {
    const id = ex.dataset.exerciseId || '';
    const tag = ex.querySelector('.exercise-tag')?.textContent.trim() || 'Exercise';
    const meta = ex.querySelector('.exercise-meta')?.textContent.trim() || '';
    const prompt = ex.querySelector('.exercise-prompt');

    let out = `\n---\n\n### ${tag}${meta ? ' — ' + meta : ''}\n`;

    if (prompt) {
      // Render each child of the prompt
      for (const c of prompt.children) {
        const block = blockToMarkdown(c, ctx);
        if (block) out += block;
      }
    }

    // Empty code chunk for the student to attempt
    out += '\n```{r}\n# Your code here\n\n```\n';

    // Expected output description
    const expected = EXPECTED_OUTPUT[id];
    if (expected) {
      out += `\n**Expected result.** ${expected}\n`;
    }

    // Link back to the website for the worked solution
    const sectionId = ex.closest('section')?.id;
    if (sectionId) {
      out += `\n*The worked solution is available on the website at [${tag}](${getSiteBase()}#${sectionId}).*\n`;
    }

    return out + '\n';
  }

  // -----------------------------------------------------------------------
  // Top-level: walk all chapter sections and assemble the Rmd document.
  // -----------------------------------------------------------------------
  function buildRmd() {
    const today = new Date().toISOString().slice(0, 10);
    const lines = [];

    // YAML header
    lines.push('---');
    lines.push('title: "An Introduction to R for Watershed Ecology"');
    lines.push('subtitle: "Practice document — exercises only, no solutions"');
    lines.push(`date: "${today}"`);
    lines.push('output:');
    lines.push('  html_document:');
    lines.push('    toc: true');
    lines.push('    toc_float: true');
    lines.push('    number_sections: false');
    lines.push('---');
    lines.push('');
    lines.push('```{r setup, include=FALSE}');
    lines.push('knitr::opts_chunk$set(echo = TRUE)');
    lines.push('```');
    lines.push('');

    // Front matter: brief explanation of what this document is
    lines.push('> **About this document.** This is the printable / knittable companion to the *R for Watershed Ecology* online guide. It contains the chapter prose and the worked examples (which are runnable R chunks), plus an empty code chunk for each exercise so you can write and knit your own attempt. **Solution code is intentionally omitted** — see the description of the expected result and the link back to the website at the end of each exercise. Reading the worked solution before attempting an exercise yourself is the easiest way to short-circuit the learning, so try first, then check.');
    lines.push('');
    lines.push('---');
    lines.push('');

    // Walk every section.chapter inside main
    const sections = document.querySelectorAll('main section.chapter');
    for (const section of sections) {
      for (const child of section.children) {
        const md = blockToMarkdown(child, {});
        if (md) lines.push(md);
      }
    }

    // Tidy: collapse multiple blank lines
    let text = lines.join('\n');
    text = text.replace(/\n{3,}/g, '\n\n');
    return text;
  }

  // -----------------------------------------------------------------------
  // Trigger a download of the assembled Rmd as a .Rmd file.
  // -----------------------------------------------------------------------
  function downloadRmd() {
    let text;
    try {
      text = buildRmd();
    } catch (err) {
      console.error('Rmd build failed:', err);
      alert('Sorry — could not build the R Markdown export. Please reload the page and try again.');
      return;
    }
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'intro_to_R_watershed.Rmd';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  }

  // -----------------------------------------------------------------------
  // Wire up: find any element with [data-rmd-download] and bind click.
  // -----------------------------------------------------------------------
  function wire() {
    const buttons = document.querySelectorAll('[data-rmd-download]');
    buttons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        downloadRmd();
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }

  // Expose for debugging / manual invocation
  window.__downloadRmd = downloadRmd;
  window.__buildRmd = buildRmd;
})();
