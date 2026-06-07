# Slatepad

**Local-first offline notes** — a desktop app inspired by Notion and AFFiNE. Your notes live in SQLite on your machine: no accounts, no sync, no cloud by default.

**Website:** [yasharma.github.io/Slatepad](https://yasharma.github.io/Slatepad/)

![Slatepad — note editor with AI assistant](docs/screenshot.png)

## Features

### Notes
- Sidebar with **folders**, pinned notes, tags, and sort (Modified / Created / A–Z)
- **Hide sidebar** with `⌘B` for a focused writing view
- Full-text search via **Quick Switcher** (`⌘K`) — titles, tags, and note content
- **Note templates** — Blank, Daily Tasks, Meeting Notes
- Archive (soft delete) with restore and empty archive
- Direct delete from note menu, sidebar context menu, or `⌘Delete`
- Auto-save to local SQLite (~500ms debounce)
- Per-note emoji icon for quick visual identification
- Duplicate note, copy as Markdown, and **Export PDF** (system print dialog)
- **Backup / restore** — export or import the full SQLite database from Settings

### Editor
- Rich text: bold, italic, strikethrough, headings, lists
- Todo lists with checkboxes, quotes, code blocks, links, dividers
- **Tables** — insert via `/table` slash command, edit rows/columns in bubble menu
- **Markdown** — paste Markdown as rich text; type `# ` / `## ` / `### ` for headings
- **Image paste** — paste screenshots inline (base64 in note)
- Insert today's date or timestamp
- **`/` slash menu** for quick blocks
- **Bubble menu** on text selection (B, I, strike, link, code)
- **Find in note** (`⌘F`) with match highlighting
- **Full width / Standard** layout toggle in the note menu

### AI assistant (optional)
- Right-side **AI chat panel** (`⌘⇧A`) with the open note as context
- Works with **Ollama**, **LiteLLM**, or any OpenAI-compatible API
- **Test connection** in Settings → AI before chatting
- Rendered markdown replies with **Copy** and **Apply to note**
- See [scripts/AI.md](scripts/AI.md) for setup

### Shortcuts
| Shortcut | Action |
|----------|--------|
| `⌘/Ctrl N` | New note |
| `⌘/Ctrl K` | Quick switcher (search all notes) |
| `⌘/Ctrl F` | Find within note |
| `⌘/Ctrl B` | Show / hide sidebar |
| `⌘/Ctrl ⇧ A` | Toggle AI assistant |
| `⌘/Ctrl P` | Pin / unpin note |
| `⌘/Ctrl Backspace` | Archive note |
| `⌘/Ctrl Delete` | Delete note permanently |
| `/` | Slash commands in editor |
| `?` | Keyboard shortcuts help |
| Right-click note | Pin, Duplicate, Export PDF, Archive, Delete |

### Appearance
- Light / dark / system theme (saved locally)
- Native macOS title bar blends with sidebar and note area

## Tech stack

- [Tauri 2](https://tauri.app/) — native shell
- React 19 + TypeScript + Vite
- Tailwind CSS 4
- [TipTap](https://tiptap.dev/) — rich text editor
- SQLite via [`tauri-plugin-sql`](https://github.com/tauri-apps/plugins-workspace)

## Install (macOS)

### Option 1 — Homebrew (recommended)

```bash
brew tap yasharma/tap
brew install --cask slatepad

# One-time: allow the unsigned app through Gatekeeper
xattr -dr com.apple.quarantine /Applications/Slatepad.app

open /Applications/Slatepad.app
```

### Option 2 — Download the DMG

Grab the right installer from the [latest release](https://github.com/yasharma/Slatepad/releases/latest):

- **Apple Silicon (M1/M2/M3/M4):** `Slatepad_<version>_aarch64.dmg`
- **Intel Mac:** `Slatepad_<version>_x64.dmg`

Open the DMG, drag **Slatepad.app** to `/Applications`, then run the same Gatekeeper bypass:

```bash
xattr -dr com.apple.quarantine /Applications/Slatepad.app
```

### Why the `xattr` step?

Slatepad isn't signed with an Apple Developer certificate yet, so macOS Gatekeeper will say _"Slatepad is damaged and can't be opened"_ on first launch. The `xattr` command strips the quarantine flag macOS automatically attaches to anything downloaded from the internet. It's a **one-time** step per install — after that the app launches normally.

### Upgrading

```bash
brew update
brew upgrade --cask slatepad
xattr -dr com.apple.quarantine /Applications/Slatepad.app   # re-run after each upgrade
```

### Uninstall

```bash
brew uninstall --cask slatepad             # keep notes
brew uninstall --cask --zap slatepad       # also delete ~/Library/Application Support/com.ysharma.slatepad
```

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Rust](https://www.rust-lang.org/tools/install) (for Tauri)
- [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your OS

## Development setup

```bash
git clone https://github.com/yasharma/Slatepad.git
cd Slatepad
npm install
source "$HOME/.cargo/env"   # if Rust is not on PATH
npm run tauri dev
```

For frontend-only work (no Tauri window), you can run `npm run dev`.

## Build for production

```bash
npm run build          # web assets
npm run tauri build    # platform installer / bundle
```

Artifacts are written under `src-tauri/target/release/` (exact paths depend on OS).

## Data location

Notes are stored in **`notes.db`** (SQLite):

| OS | Path |
|----|------|
| macOS | `~/Library/Application Support/com.ysharma.slatepad/notes.db` |

Back up that one file and you've backed up everything — or use **Settings → Export backup** for a portable `.db` file.

**Upgrading from local-plus:** the app identifier changed from `com.ysharma.local-plus` to `com.ysharma.slatepad`, so macOS treats this as a new app. Your old database remains at `~/Library/Application Support/com.ysharma.local-plus/notes.db` but is **not** migrated automatically — copy `notes.db` into the new folder if you want to keep existing notes.

Theme preferences in the webview are migrated automatically from `local-plus-theme` to `slatepad-theme` in localStorage.

## License

This project is licensed under the [MIT License](LICENSE).

## Contributing

Contributions are welcome. For a short checklist, see [CONTRIBUTING.md](CONTRIBUTING.md).

1. **Fork** the repository on GitHub.
2. **Clone** your fork and create a branch: `git checkout -b your-feature`.
3. **Install and run**: `npm install`, then `npm run tauri dev`.
4. **Make changes**, keep the diff focused on the feature or fix.
5. **Verify**: `npm run build` (and `npm run tauri build` if you touched Rust or Tauri config).
6. **Open a pull request** against `main` with a clear description and test notes.

**Guidelines:** match existing code style, avoid drive-by refactors, and do not commit secrets or local databases (`notes.db`).
