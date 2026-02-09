"use client";

import { useEffect, useMemo, useState } from "react";

type Assumption = {
  id: string;
  name: string;
  mean: number;     // expected impact
  std: number;      // uncertainty
  weight: number;   // importance
  direction: "positive" | "negative";
  enabled: boolean;
};

type SimRequest = {
  assumptions: Assumption[];
  iterations: number;
  threshold: number;
  seed?: number;
};

type SimResponse = {
  iterations: number;
  probabilitySuccess: number; // 0..1
  label: "LOW" | "MEDIUM" | "HIGH";
  summary: {
    threshold: number;
    enabledCount: number;
  };
};

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function clampNumber(n: number, min: number, max: number) {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

export default function Page() {
  const [assumptions, setAssumptions] = useState<Assumption[]>([
    { id: uid(), name: "Customer adoption", mean: 0.8, std: 0.6, weight: 1.0, direction: "positive", enabled: true },
    { id: uid(), name: "Engineering risk",  mean: 0.5, std: 0.7, weight: 0.9, direction: "negative", enabled: true },
    { id: uid(), name: "Pricing power",     mean: 0.4, std: 0.5, weight: 0.6, direction: "positive", enabled: true },
  ]);

  const [iterations, setIterations] = useState<number>(20000);
  const [threshold, setThreshold] = useState<number>(0.0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const enabledCount = useMemo(() => assumptions.filter(a => a.enabled).length, [assumptions]);

  async function runSim(req: SimRequest) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(req),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `Request failed: ${res.status}`);
      }
      const data = (await res.json()) as SimResponse;
      setResult(data);
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  // auto-run on changes (debounced-ish)
  useEffect(() => {
    const handle = setTimeout(() => {
      runSim({ assumptions, iterations, threshold });
    }, 250);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assumptions, iterations, threshold]);

  function update(id: string, patch: Partial<Assumption>) {
    setAssumptions(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a));
  }

  function remove(id: string) {
    setAssumptions(prev => prev.filter(a => a.id !== id));
  }

  function addRow() {
    setAssumptions(prev => [
      ...prev,
      { id: uid(), name: "New assumption", mean: 0.2, std: 0.4, weight: 0.5, direction: "positive", enabled: true },
    ]);
  }

  const labelClass =
    result?.label === "LOW" ? "low" : result?.label === "MEDIUM" ? "med" : "high";

  return (
    <div className="container">
      <div className="h1">Decision Monte Carlo</div>
      <p className="sub">
        Define assumptions → run Monte Carlo → get <code>P(success)</code>. Toggle assumptions and it auto-recalculates.
        Success is currently: <code>score &gt; threshold</code>.
      </p>

      <div className="grid">
        <div className="card">
          <h2>Assumptions</h2>

          <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
            <div className="small">
              Enabled: <code>{enabledCount}</code> / <code>{assumptions.length}</code>
            </div>
            <div className="row">
              <button className="btn secondary" onClick={addRow}>Add</button>
              <button
                className="btn"
                onClick={() => runSim({ assumptions, iterations, threshold })}
                disabled={loading}
              >
                {loading ? "Running…" : "Re-run"}
              </button>
            </div>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 34 }}>On</th>
                <th>Name</th>
                <th style={{ width: 120 }}>Mean</th>
                <th style={{ width: 120 }}>Std</th>
                <th style={{ width: 120 }}>Weight</th>
                <th style={{ width: 140 }}>Direction</th>
                <th style={{ width: 46 }}></th>
              </tr>
            </thead>
            <tbody>
              {assumptions.map(a => (
                <tr key={a.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={a.enabled}
                      onChange={(e) => update(a.id, { enabled: e.target.checked })}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={a.name}
                      onChange={(e) => update(a.id, { name: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.05"
                      value={a.mean}
                      onChange={(e) => update(a.id, { mean: clampNumber(Number(e.target.value), -5, 5) })}
                    />
                    <div className="small">impact</div>
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.05"
                      value={a.std}
                      onChange={(e) => update(a.id, { std: clampNumber(Number(e.target.value), 0, 5) })}
                    />
                    <div className="small">uncertainty</div>
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.05"
                      value={a.weight}
                      onChange={(e) => update(a.id, { weight: clampNumber(Number(e.target.value), 0, 5) })}
                    />
                    <div className="small">importance</div>
                  </td>
                  <td>
                    <select
                      value={a.direction}
                      onChange={(e) => update(a.id, { direction: e.target.value as Assumption["direction"] })}
                    >
                      <option value="positive">positive</option>
                      <option value="negative">negative</option>
                    </select>
                    <div className="small">sign</div>
                  </td>
                  <td>
                    <button className="btn secondary" onClick={() => remove(a.id)} title="Delete">×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="hr" />

          <div className="row">
            <div style={{ flex: 1 }}>
              <div className="small">Iterations</div>
              <input
                type="number"
                value={iterations}
                step={1000}
                min={1000}
                max={200000}
                onChange={(e) => setIterations(clampNumber(Number(e.target.value), 1000, 200000))}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div className="small">Threshold (success cutoff)</div>
              <input
                type="number"
                value={threshold}
                step={0.1}
                min={-10}
                max={10}
                onChange={(e) => setThreshold(clampNumber(Number(e.target.value), -10, 10))}
              />
            </div>
          </div>

          <p className="small" style={{ marginTop: 10 }}>
            Interpretation: each assumption is sampled as Normal(mean, std). Direction flips sign for "negative".
            Score is the weighted sum. Modify the model in <code>app/api/sim/route.ts</code>.
          </p>
        </div>

        <div className="card">
          <h2>Result</h2>

          {error && (
            <div className="pill" style={{ borderColor: "rgba(255,77,77,0.45)" }}>
              <span style={{ color: "var(--danger)", fontWeight: 800 }}>Error</span>
              <span className="small">{error}</span>
            </div>
          )}

          {!result && !error && (
            <div className="small">Running…</div>
          )}

          {result && (
            <>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <div>
                  <div className="small">P(success)</div>
                  <div className="kpi">{(result.probabilitySuccess * 100).toFixed(1)}%</div>
                </div>
                <div className={`badge ${labelClass}`}>
                  {result.label}
                </div>
              </div>

              <div className="hr" />

              <div className="row">
                <span className="pill">
                  iterations: <b>{result.iterations.toLocaleString()}</b>
                </span>
                <span className="pill">
                  threshold: <b>{result.summary.threshold.toFixed(2)}</b>
                </span>
                <span className="pill">
                  enabled: <b>{result.summary.enabledCount}</b>
                </span>
              </div>

              <p className="small" style={{ marginTop: 12 }}>
                Buckets are currently based on P(success):
                LOW &lt; 33%, MEDIUM 33–66%, HIGH &gt; 66%.
                If you meant scenario buckets (low/med/high outcomes), we can switch to quantiles of the score distribution.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
