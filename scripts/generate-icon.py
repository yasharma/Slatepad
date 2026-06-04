#!/usr/bin/env python3
"""Regenerate Slatepad source icon.

The icon is a hand-drawn forward "S" on a slate tile. The original artwork
lives in this repo as src-tauri/icons/source-icon.png. This script re-runs
the post-processing (square crop + slate-fill of outer corners) from the
cached AI-generated source if it is present; otherwise it is a no-op so we
never clobber the artwork.

After running, regenerate platform icons:

    npm run tauri icon src-tauri/icons/source-icon.png
"""
from collections import deque
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src-tauri" / "icons" / "source-icon.png"
ASSET = Path.home() / ".cursor/projects/Users-y-sharma-local-plus/assets/slatepad-icon-source.png"

SLATE = (0x46, 0x55, 0x66)  # slate blue-gray, like a real slate tile


def main() -> int:
    if not ASSET.exists():
        print(f"No cached AI source at {ASSET}; keeping existing {OUT}.")
        return 0

    try:
        from PIL import Image
    except ImportError:
        print("Pillow not available. Install with: /usr/bin/python3 -m pip install Pillow")
        return 1

    src = Image.open(ASSET).convert("RGB")
    w, h = src.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    square = src.crop((left, top, left + side, top + side)).copy()
    W, H = square.size
    px = square.load()

    def is_bg(c):
        r, g, b = c
        return r > 215 and g > 215 and b > 215

    # Recolor the charcoal interior of the AI artwork to slate-blue.
    # The original background is very dark (<~70) and the S is white (>~200);
    # anti-aliased edges in between are blended below.
    for y in range(H):
        for x in range(W):
            r, g, b = px[x, y]
            m = max(r, g, b)
            if m < 110:
                # solid background → straight slate
                px[x, y] = SLATE
            elif m < 200:
                # antialiased edge → blend toward slate by darkness
                t = (200 - m) / 130  # 0 (near white) → 1 (near dark)
                t = min(1.0, max(0.0, t))
                px[x, y] = (
                    int(r * (1 - t) + SLATE[0] * t),
                    int(g * (1 - t) + SLATE[1] * t),
                    int(b * (1 - t) + SLATE[2] * t),
                )

    visited = [[False] * W for _ in range(H)]
    queue = deque()
    for sx, sy in [(0, 0), (W - 1, 0), (0, H - 1), (W - 1, H - 1)]:
        if is_bg(px[sx, sy]) and not visited[sy][sx]:
            queue.append((sx, sy))
            visited[sy][sx] = True
    while queue:
        x, y = queue.popleft()
        px[x, y] = SLATE
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < W and 0 <= ny < H and not visited[ny][nx]:
                if is_bg(px[nx, ny]):
                    visited[ny][nx] = True
                    queue.append((nx, ny))

    to_fill = []
    for y in range(H):
        for x in range(W):
            r, g, b = px[x, y]
            if 180 < r < 250 and 180 < g < 250 and 180 < b < 250:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < W and 0 <= ny < H and px[nx, ny] == SLATE:
                        to_fill.append((x, y))
                        break
    for x, y in to_fill:
        px[x, y] = SLATE

    from PIL import ImageDraw

    square = square.convert("RGBA")
    mask = Image.new("L", (W, H), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, W - 1, H - 1), radius=180, fill=255)
    square.putalpha(mask)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    square.save(OUT, "PNG")
    print(f"Wrote {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
