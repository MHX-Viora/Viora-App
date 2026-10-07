import type { CinematicQuality } from "./premium-gift-cinematic";

export const ROCKET_BLAST_TIMELINE = { arrival: .567, burst: .584, hot: .596, energy: .612, shock: .628, stars: .64, comets: .657, afterglow: .89, finish: 1 } as const;
const noise = (index: number, channel = 0) => {
  const value = Math.sin(index * 19.31 + channel * 73.17 + 21) * 43758.5453;
  return value - Math.floor(value);
};

export function rocketFlameFrames() {
  const times = [0, .167]; const length = [.02, .02]; const width = [.7, .7]; const sway = [0, 0];
  for (let index = 0; index < 38; index++) {
    const t = Number((.175 + index * .0103).toFixed(6));
    const boost = t >= .417;
    times.push(t); length.push(boost ? 1.8 + noise(index, 1) * .7 : .85 + noise(index, 1) * .3);
    width.push(.83 + noise(index, 2) * .3); sway.push((noise(index, 3) - .5) * 4);
  }
  times.push(.58, 1); length.push(.02, .02); width.push(.7, .7); sway.push(0, 0);
  return { times, length, width, sway };
}

export function rocketOrbitFrames(index: number) {
  const times = Array.from({ length: 65 }, (_, i) => i / 64);
  const turns = (t: number) => t * (1.6 + index * .47) + Math.max(0, t - .417) * (3.5 + index * .65);
  const angles = times.map((t) => index * Math.PI / 3 + turns(t) * Math.PI * 2);
  const positions = angles.map((angle, i) => {
    const t = times[i];
    const deform = t <= .417 ? 1 : t < .46 ? 1 + (t - .417) / .043 * .5 : t < .54 ? 1.5 + (t - .46) / .08 : 2.5;
    const rotation = (index * 38 + turns(t) * (index % 2 ? -150 : 150)) * Math.PI / 180;
    const x = Math.cos(angle) * .46; const y = Math.sin(angle) * .11 * deform;
    return { x: x * Math.cos(rotation) - y * Math.sin(rotation), y: x * Math.sin(rotation) + y * Math.cos(rotation) };
  });
  const visibility = (t: number) => t < .10 || t >= .567 ? 0 : t < .15 ? (t - .10) / .05 : t > .54 ? (.567 - t) / .027 : 1;
  return {
    times, x: positions.map((p) => p.x), y: positions.map((p) => p.y),
    front: angles.map((a, i) => Math.sin(a) >= 0 ? visibility(times[i]) * (.65 + noise(i, index) * .35) : 0),
    back: angles.map((a, i) => Math.sin(a) < 0 ? visibility(times[i]) * (.18 + noise(i, index) * .14) : 0),
    rotation: times.map((t) => `${index * 38 + turns(t) * (index % 2 ? -150 : 150)}deg`),
  };
}

export function rocketExhaustPlan(quality: CinematicQuality) {
  const groups = { low: 5, medium: 6, high: 8, ultra: 10 }[quality];
  return Array.from({ length: groups }, (_, index) => {
    const count = 4;
    const fill: string[] = []; const sparks: string[] = [];
    for (let particle = 0; particle < count; particle++) {
      const x = 18 + noise(index * 4 + particle, 1) * 64;
      const y = 15 + noise(index * 4 + particle, 2) * 68;
      const s = 1.2 + noise(index * 4 + particle, 3) * 1.8;
      if (particle === 0) fill.push(`M${x - s / 2} ${y} a${s / 2} ${s / 2} 0 1 0 ${s} 0 a${s / 2} ${s / 2} 0 1 0 ${-s} 0`);
      else if (particle === 1) fill.push(`M${x} ${y - s * 2} l${s * .5} ${s * 1.5} l${s * 1.5} ${s * .5} l${-s * 1.5} ${s * .5} l${-s * .5} ${s * 1.5} l${-s * .5} ${-s * 1.5} l${-s * 1.5} ${-s * .5} l${s * 1.5} ${-s * .5}Z`);
      else if (particle === 2) fill.push(`M${x} ${y - s * 2} l${s} ${s * 2} l${-s} ${s * 2} l${-s} ${-s * 2}Z`);
      else sparks.push(`M${x} ${y} l${-s} ${s * 4}`);
    }
    return { count, fill: fill.join(" "), sparks: sparks.join(" "), fraction: (index + 1) / (groups + 1), velocity: .45 + noise(index, 4) * .7, rotation: (noise(index, 5) - .5) * 40, lifetime: .11 + noise(index, 6) * .13 };
  });
}
