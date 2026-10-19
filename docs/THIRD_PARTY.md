# Third-party review

The first scaffold uses Electron, React, Vite, TypeScript, ESLint, Prettier,
Vitest, Playwright, and Node's built-in SQLite module. Pin versions in the
lockfile and record a license and Windows packaging review for each runtime
dependency before the MVP exit gate.

MVP local videos are user-selected and copied beside their Markdown section.
The app ships no video decoder, FFmpeg binary, transcription model, or video
download helper in this phase; it uses Electron's supported media playback.
YouTube videos are represented by their original URL and played online through
an isolated embed with a link fallback. Later extraction work must separately
review FFmpeg/OCR/model redistribution licenses and model asset sizes before
those binaries enter an installer.
