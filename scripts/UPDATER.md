# Auto-updater setup

Slatepad uses the [Tauri updater](https://v2.tauri.app/plugin/updater/) to download updates from GitHub Releases.

## One-time: generate signing keys

```bash
npx tauri signer generate -w ~/.tauri/slatepad.key
```

This creates:
- `~/.tauri/slatepad.key` — private key (keep secret)
- `~/.tauri/slatepad.key.pub` — public key

## Configure GitHub Actions

Add these repository secrets in GitHub → Settings → Secrets:

| Secret | Value |
|--------|--------|
| `TAURI_SIGNING_PRIVATE_KEY` | Contents of `~/.tauri/slatepad.key` |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Password you chose (or empty) |
| `TAURI_SIGNING_PUBLIC_KEY` | Contents of `~/.tauri/slatepad.key.pub` |

The release workflow uses these to sign update bundles and upload `latest.json`.

## Local builds with updater artifacts

```bash
export TAURI_SIGNING_PRIVATE_KEY="$(cat ~/.tauri/slatepad.key)"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD=""
export TAURI_SIGNING_PUBLIC_KEY="$(cat ~/.tauri/slatepad.key.pub)"
npm run tauri build
```

## Note on macOS Gatekeeper

Auto-update replaces the app in `/Applications` but does **not** remove the quarantine flag on first install from a browser or Homebrew. Users still need `xattr -dr com.apple.quarantine` once after the **first** manual install. Updates applied in-app should not require it again.
