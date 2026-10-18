# Qio — Qoder project guidance

## Project
- Qio is a Persian-first desktop companion built with Tauri 2, Rust, TypeScript and Vite.
- Target desktop platforms are Windows and macOS. Do not claim Linux or mobile support is production-ready.
- Keep the interface compact, accessible, responsive, and right-to-left for Persian text.

## Engineering rules
- Preserve existing behavior unless a change is required to fix a demonstrated defect.
- Never commit API keys, tokens, private logs, user prompts, or machine-specific paths.
- Do not automatically approve agent/tool permission requests.
- Keep error messages useful without exposing secrets or full provider responses.
- Add or update regression tests for bug fixes when practical.
- Run `npm test`, `npm run build`, and `cargo check --manifest-path src-tauri/Cargo.toml` when the environment supports them.
- Clearly report checks that could not be run; never claim a build passed without its actual result.
- Review dependency and GitHub Actions changes for least privilege and untrusted-input injection.
- Prefer small, reviewable changes and open a pull request rather than pushing changes directly to `main`.
