"""Bake tiny reusable gold-light textures; no runtime blur or particle SVG trees."""
from pathlib import Path
from math import exp
import struct
import zlib

def chunk(kind, data):
    return struct.pack('!I', len(data)) + kind + data + struct.pack('!I', zlib.crc32(kind + data))

target = Path(__file__).resolve().parents[1] / 'assets' / 'images'
for name, trail in [('firework-spark.png', True), ('firework-ember.png', False)]:
    pixels = bytearray()
    for y in range(48):
        pixels.append(0)
        for x in range(128):
            distance = ((x - 64) ** 2 + (y - 24) ** 2) ** 0.5
            bloom = 0.32 * exp(-distance ** 2 / 170)
            inner = 0.75 * exp(-distance ** 2 / 26)
            core = exp(-distance ** 2 / 7)
            tail = 0
            if trail and x < 64:
                tail = exp(-(y - 24) ** 2 / 5) * exp((x - 64) / 42) * 0.8
                for tx, ty, power in [(51, 25, .65), (39, 22, .48), (27, 26, .33), (15, 23, .15)]:
                    tail += power * exp(-((x - tx) ** 2 + (y - ty) ** 2) / 3)
            alpha = min(1, bloom + inner + core + tail)
            pearl = min(1, core + inner * .5)
            pixels.extend((255, int(185 + 68 * pearl), int(72 + 165 * pearl), int(255 * alpha)))
    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('!2I5B', 128, 48, 8, 6, 0, 0, 0))
    png += chunk(b'IDAT', zlib.compress(pixels, 9)) + chunk(b'IEND', b'')
    (target / name).write_bytes(png)
