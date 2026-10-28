"""Generate ANKT's original short notification chime (mono 16-bit PCM WAV)."""
from pathlib import Path
import math
import struct
import wave

sample_rate = 44100
duration = 0.9
samples = []
for frame in range(round(sample_rate * duration)):
    time = frame / sample_rate
    value = 0.0
    for start, frequency, amplitude in [(0.0, 880.0, 0.36), (0.16, 1174.66, 0.30)]:
        age = time - start
        if age < 0:
            continue
        envelope = min(age / 0.009, 1.0) * math.exp(-age * 8.8)
        tone = math.sin(math.tau * frequency * age)
        tone += 0.18 * math.sin(math.tau * frequency * 2 * age)
        value += amplitude * envelope * tone
    value *= min((duration - time) / 0.06, 1.0)
    samples.append(struct.pack("<h", round(max(-1.0, min(1.0, value)) * 32767)))

destination = Path(__file__).resolve().parents[1] / "assets/audio/ankt_notification.wav"
destination.parent.mkdir(parents=True, exist_ok=True)
with wave.open(str(destination), "wb") as output:
    output.setnchannels(1)
    output.setsampwidth(2)
    output.setframerate(sample_rate)
    output.writeframes(b"".join(samples))
print(f"Generated {destination.name}: {duration}s, mono PCM, {sample_rate} Hz")
