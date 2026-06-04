# Contributing to Slatepad

Thank you for helping improve Slatepad.

## Quick start

1. Fork [yasharma/Slatepad](https://github.com/yasharma/Slatepad) on GitHub.
2. Clone your fork and add upstream if you like:
   ```bash
   git clone https://github.com/YOUR_USER/Slatepad.git
   cd Slatepad
   git remote add upstream https://github.com/yasharma/Slatepad.git
   ```
3. Create a branch: `git checkout -b short-description`.
4. Install dependencies and run the app:
   ```bash
   npm install
   npm run tauri dev
   ```
5. Make your changes. Keep PRs small and scoped to one topic when possible.
6. Before opening a PR:
   ```bash
   npm run build
   ```
   Run `npm run tauri build` if you changed Rust, Tauri config, or native plugins.
7. Push to your fork and open a pull request against `main`.

## What not to commit

- `node_modules/`, `dist/`, `src-tauri/target/`
- Local databases (`notes.db`) or `.env` files with secrets

## Code style

- TypeScript/React: follow patterns in nearby files; prefer minimal, readable diffs.
- Rust: run `cargo fmt` in `src-tauri/` if you edit Rust.

Questions or ideas? Open an issue before large changes so we can align on approach.
