# Introduction to R for Watershed Ecology

An interactive, in-browser R tutorial for undergraduate watershed ecology students with no programming background. Code runs directly in the browser using [WebR](https://docs.r-wasm.org/webr/latest/) — no R installation required.

## Features

- **13 chapters** covering variables, vectors, data frames, operators, equation translation, while-loops, linear models, base R plotting, and ggplot2.
- **Interactive code cells** — students can read, run, and modify every example.
- **Empty answer cells** for each exercise.
- **Assessment toggle** on every non-plotting exercise. Students can choose "Just run" (execute without grading) or "Run & check" (execute and get pass/fail feedback per criterion). Plotting exercises (10.1, 11.1) skip the toggle since their output is visual.
- **Hide/reveal solutions** to encourage students to attempt exercises before peeking.
- **All examples are watershed-ecology themed** — discharge, DO, nitrate, EPT richness, stage-discharge curves, the Streeter-Phelps deficit equation, and so on.

## Deploy to GitHub Pages

1. Create a new GitHub repository (e.g., `intro-to-r-watershed`).
2. Copy the contents of this directory (including `.nojekyll` and `coi-serviceworker.js`) to the repository root.
3. Push to GitHub.
4. In the repository settings, go to **Pages** → set the source to the `main` branch, root folder.
5. Wait a minute, then visit `https://<your-username>.github.io/<your-repo>/`.

That's it. The page will work right away — the `coi-serviceworker.js` reloads the page once on first visit to enable the cross-origin isolation that WebR needs.

## Local development

Because of the cross-origin isolation requirement, you can't just open `index.html` directly. Use any simple static server, for example:

```bash
# Python (any modern version)
python3 -m http.server 8000

# Or, with Node:
npx serve .
```

Then open `http://localhost:8000`.

## File structure

```
.
├── index.html             # The tutorial page
├── coi-serviceworker.js   # Enables COOP/COEP headers for WebR (do not modify)
├── .nojekyll              # Tells GitHub Pages to skip Jekyll processing
├── css/
│   └── styles.css         # All styling
├── js/
│   ├── assessments.js     # Per-exercise grading specs (R validators + JS text checks)
│   ├── runner.js          # WebR initialization + code execution
│   └── main.js            # UI wiring (run buttons, toggles, TOC, progress bar)
└── README.md
```

## Adapting an assessment

Each exercise's grading logic lives in `js/assessments.js`. To change how a check works, edit the R validator code under that exercise's key. The validator function `.assess()` returns a list of `list(ok, label, detail)` items — one per criterion. Pass/fail is reported per item.

For example, to change the threshold for Exercise 6.1, edit `'ex-6-1'` and adjust the `abs(val - 1.5747) < 0.01` tolerance.

To add a JS-side textual check (used to verify that specific operators or function names appear in the student's code), add a `textCheck` block — see `'ex-5-1'` for the pattern.

## How it works

- **WebR** is the R interpreter compiled to WebAssembly. It downloads (~30 MB) on first visit and runs in a Web Worker.
- **`coi-serviceworker.js`** patches in `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` headers, which GitHub Pages doesn't set on its own. Without these, `SharedArrayBuffer` is unavailable and WebR can't run.
- Each `<textarea class="code-editor">` is a live editor; clicking **Run** sends the code to WebR and renders text + plot output.
- Solutions are hidden inside `<details>` elements until the student clicks **Reveal solution**.

## Customization

Need to adapt this for a different course or audience?

- **Edit `index.html`** to change the text, exercises, or starter code.
- **Edit `css/styles.css`** to change the color palette (defined in `:root` at the top).
- **Add packages**: in `js/runner.js`, the `installPackages` call pre-loads `ggplot2`. Add others like `dplyr` to that array. Note: not every CRAN package is yet available as a WebAssembly binary — see the [WebR package list](https://repo.r-wasm.org/).

## License

Course material — adapt freely for non-commercial educational use.

The bundled `coi-serviceworker.js` is MIT-licensed by gzuidhof.
WebR is owned by R-Wasm and the Posit team.
