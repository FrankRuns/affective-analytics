import { NextResponse } from "next/server";

type Assumption = {
  id: string;
  name: string;
  mean: number;
  std: number;
  weight: number;
  direction: "positive" | "negative";
  enabled: boolean;
};

type SimRequest = {
  assumptions: Assumption[];
  iterations: number;
  threshold: number;
  seed?: number;
};

function clamp(n: number, min: number, max: number) {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

// Box–Muller transform for standard normal
function randn(rng: () => number) {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// Small deterministic RNG (Mulberry32)
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export async function POST(req: Request) {
  const body = (await req.json()) as SimRequest;

  const iterations = clamp(Math.floor(body.iterations ?? 20000), 1000, 300000);
  const threshold = clamp(Number(body.threshold ?? 0), -1000, 1000);

  const assumptions = Array.isArray(body.assumptions) ? body.assumptions : [];
  const enabled = assumptions.filter(a => a?.enabled);

  const rng = typeof body.seed === "number" ? mulberry32(body.seed) : Math.random;

  let success = 0;

  for (let i = 0; i < iterations; i++) {
    let score = 0;

    for (const a of enabled) {
      const mean = clamp(Number(a.mean ?? 0), -1e6, 1e6);
      const std = clamp(Number(a.std ?? 0), 0, 1e6);
      const weight = clamp(Number(a.weight ?? 1), 0, 1e6);
      const sign = a.direction === "negative" ? -1 : 1;

      const sample = mean + std * randn(rng);
      score += sign * weight * sample;
    }

    if (score > threshold) success++;
  }

  const p = success / iterations;

  const label = p < 0.33 ? "LOW" : p < 0.66 ? "MEDIUM" : "HIGH";

  return NextResponse.json({
    iterations,
    probabilitySuccess: p,
    label,
    summary: {
      threshold,
      enabledCount: enabled.length,
    },
  });
}
