# Quality gates

Run `pnpm verify` on a clean checkout. The command runs Prettier, ESLint,
strict TypeScript, V8 coverage, then real Electron UI tests. Each gate also has
its own `pnpm` script. `pnpm build` produces the renderer, main, and preload
bundles; `pnpm start` opens that build.

Coverage includes production domain, main-process service, and renderer files.
Only declaration files and pure entry-point wiring are excluded; the desktop
entry points are covered by the Electron UI smoke. Aggregate minimums are 80%
lines, statements, and functions, plus 75% branches. Before their modules
are complete, add explicit per-module checks for Markdown conversion, change
validation, review decisions, and history recovery at 90% lines and 85%
branches. Every nontrivial production file needs at least 60% line coverage.
Do not lower thresholds to accommodate an implementation.

The UI suite uses isolated temporary content folders. Run it on the pinned
Windows environment before accepting visual baselines. Failed screenshots and
traces are retained under `test-results/`; routine runner output is captured
in CI artifacts and summarized in the command result.
