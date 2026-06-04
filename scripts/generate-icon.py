#!/usr/bin/env python3
"""Generate Slatepad 1024x1024 source icon (stdlib only)."""
import math
import struct
import zlib
from pathlib import Path

SIZE = 1024
BG = (0x37, 0x35, 0x2F)  # Notion-like slate
FG = (0xFF, 0xFF, 0xFF)
CORNER_RADIUS = 180  # subtle app-icon rounding


def inside_rounded_rect(x, y, w, h, r):
    if x < r and y < r:
        return (x - r) ** 2 + (y - r) ** 2 <= r * r
    if x > w - r and y < r:
        return (x - (w - r)) ** 2 + (y - r) ** 2 <= r * r
    if x < r and y > h - r:
        return (x - r) ** 2 + (y - (h - r)) ** 2 <= r * r
    if x > w - r and y > h - r:
        return (x - (w - r)) ** 2 + (y - (h - r)) ** 2 <= r * r
    return True


def dist_to_segment(px, py, x1, y1, x2, y2):
    dx, dy = x2 - x1, y2 - y1
    if dx == 0 and dy == 0:
        return math.hypot(px - x1, py - y1)
    t = max(0, min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)))
    proj_x = x1 + t * dx
    proj_y = y1 + t * dy
    return math.hypot(px - proj_x, py - proj_y)


def dist_to_bezier(px, py, p0, p1, p2, p3, steps=32):
    best = float("inf")
    prev = p0
    for i in range(1, steps + 1):
        t = i / steps
        u = 1 - t
        x = u**3 * p0[0] + 3 * u**2 * t * p1[0] + 3 * u * t**2 * p2[0] + t**3 * p3[0]
        y = u**3 * p0[1] + 3 * u**2 * t * p1[1] + 3 * u * t**2 * p2[1] + t**3 * p3[1]
        cur = (x, y)
        best = min(best, dist_to_segment(px, py, prev[0], prev[1], cur[0], cur[1]))
        prev = cur
    return best


def draw_s(img, cx, cy, scale):
    """Minimal geometric S from two arcs + connector."""
    stroke = 92 * scale
    # Upper arc (opens right)
    upper = [
        (cx + 120 * scale, cy - 180 * scale),
        (cx + 260 * scale, cy - 260 * scale),
        (cx - 40 * scale, cy - 260 * scale),
        (cx - 120 * scale, cy - 180 * scale),
    ]
    # Lower arc (opens left)
    lower = [
        (cx - 120 * scale, cy + 180 * scale),
        (cx - 260 * scale, cy + 260 * scale),
        (cx + 40 * scale, cy + 260 * scale),
        (cx + 120 * scale, cy + 180 * scale),
    ]
    # Vertical connector
    conn = [
        (cx - 20 * scale, cy - 40 * scale),
        (cx - 20 * scale, cy + 40 * scale),
    ]
    curves = [upper, lower]
    for y in range(SIZE):
        for x in range(SIZE):
            if img[y][x][3] == 0:
                continue
            d = min(dist_to_bezier(x, y, *upper), dist_to_bezier(x, y, *lower))
            d = min(d, dist_to_segment(x, y, conn[0][0], conn[0][1], conn[1][0], conn[1][1]))
            if d <= stroke / 2:
                alpha = min(255, int(255 * (1 - max(0, d - stroke / 2 + 1))))
                if alpha > 0:
                    img[y][x] = (*FG, alpha)


def write_png(path, img):
    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    rows = []
    for row in img:
        rows.append(b"\x00" + b"".join(bytes(p) for p in row))
    compressed = zlib.compress(b"".join(rows), 9)

    ihdr = struct.pack(">IIBBBBB", SIZE, SIZE, 8, 6, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", ihdr)
    png += chunk(b"IDAT", compressed)
    png += chunk(b"IEND", b"")
    path.write_bytes(png)


def main():
    out = Path(__file__).resolve().parent.parent / "src-tauri" / "icons" / "source-icon.png"
    out.parent.mkdir(parents=True, exist_ok=True)

    img = []
    for y in range(SIZE):
        row = []
        for x in range(SIZE):
            if inside_rounded_rect(x, y, SIZE, SIZE, CORNER_RADIUS):
                row.append((*BG, 255))
            else:
                row.append((0, 0, 0, 0))
        img.append(row)

    draw_s(img, SIZE / 2, SIZE / 2, 1.0)

    # Subtle page fold accent (top-right corner triangle)
    fold_size = 140
    for y in range(fold_size):
        for x in range(fold_size):
            if x + y < fold_size - 20:
                px, py = SIZE - fold_size + x, y + 40
                if 0 <= px < SIZE and 0 <= py < SIZE and img[py][px][3]:
                    blend = 0.12
                    r = int(BG[0] * (1 - blend) + 255 * blend)
                    g = int(BG[1] * (1 - blend) + 255 * blend)
                    b = int(BG[2] * (1 - blend) + 255 * blend)
                    img[py][px] = (r, g, b, 255)

    write_png(out, img)
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
