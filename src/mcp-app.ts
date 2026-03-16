import { App } from "@modelcontextprotocol/ext-apps";

declare global {
  interface Window {
    Plotly: {
      newPlot: (element: HTMLElement, data: unknown[], layout: Record<string, unknown>, config?: Record<string, unknown>) => Promise<void>;
      react: (element: HTMLElement, data: unknown[], layout: Record<string, unknown>, config?: Record<string, unknown>) => Promise<void>;
    };
    openai?: {
      setWidgetState?: (state: unknown) => Promise<void>;
      sendFollowUpMessage?: (payload: { prompt: string; scrollToBottom?: boolean }) => Promise<void>;
      widgetState?: Partial<HistogramState>;
    };
  }
}

type Distribution = "normal" | "uniform" | "exponential" | "bimodal";

type HistogramState = {
  distribution: Distribution;
  n: number;
  mean: number;
  std: number;
  bins: number;
  seed: number;
};

type ToolStructuredContent = {
  initial?: Partial<HistogramState>;
  title?: string;
};

const DEFAULTS: HistogramState = {
  distribution: "normal",
  n: 500,
  mean: 0,
  std: 1,
  bins: 20,
  seed: 42,
};

const appRoot = document.getElementById("app");
if (!appRoot) {
  throw new Error("Missing app root");
}

appRoot.innerHTML = `
  <style>
    :root {
      color: #111827;
      font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #f3f4f6;
    }
    .shell {
      max-width: 980px;
      margin: 0 auto;
      padding: 16px;
    }
    .card {
      background: white;
      border-radius: 18px;
      box-shadow: 0 10px 30px rgba(17, 24, 39, 0.08);
      overflow: hidden;
      border: 1px solid rgba(17, 24, 39, 0.06);
    }
    .header {
      padding: 18px 20px 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    .header h1 {
      margin: 0;
      font-size: 20px;
    }
    .header p {
      margin: 6px 0 0;
      color: #4b5563;
      font-size: 14px;
    }
    .grid {
      display: grid;
      grid-template-columns: 320px minmax(0, 1fr);
      gap: 0;
    }
    .controls {
      padding: 18px;
      border-right: 1px solid #e5e7eb;
      background: #fcfcfd;
    }
    .controls h2 {
      margin: 0 0 14px;
      font-size: 15px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #6b7280;
    }
    .field {
      margin-bottom: 14px;
    }
    .field label {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 6px;
      color: #374151;
    }
    .field input,
    .field select {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #d1d5db;
      border-radius: 10px;
      background: white;
      font: inherit;
    }
    .field input[type="range"] {
      padding: 0;
    }
    .actions {
      display: flex;
      gap: 10px;
      margin-top: 8px;
      flex-wrap: wrap;
    }
    button {
      border: 0;
      border-radius: 10px;
      padding: 10px 14px;
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }
    .primary {
      background: #111827;
      color: white;
    }
    .secondary {
      background: #e5e7eb;
      color: #111827;
    }
    .chart-pane {
      padding: 16px;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
      margin-bottom: 12px;
    }
    .stat {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 10px 12px;
    }
    .stat .label {
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 4px;
    }
    .stat .value {
      font-size: 18px;
      font-weight: 700;
    }
    #chart {
      width: 100%;
      min-height: 470px;
    }
    .footer-note {
      margin-top: 10px;
      font-size: 12px;
      color: #6b7280;
    }
    @media (max-width: 860px) {
      .grid {
        grid-template-columns: 1fr;
      }
      .controls {
        border-right: 0;
        border-bottom: 1px solid #e5e7eb;
      }
      .stats {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
  </style>
  <div class="shell">
    <div class="card">
      <div class="header">
        <h1>Histogram Lab</h1>
        <p>Generate synthetic data, then drag the bin slider until the story changes.</p>
      </div>
      <div class="grid">
        <div class="controls">
          <h2>Data controls</h2>
          <div class="field">
            <label for="distribution"><span>Distribution</span></label>
            <select id="distribution">
              <option value="normal">Normal</option>
              <option value="uniform">Uniform</option>
              <option value="exponential">Exponential</option>
              <option value="bimodal">Bimodal</option>
            </select>
          </div>
          <div class="field">
            <label for="n"><span>Sample size</span><span id="n-value"></span></label>
            <input id="n" type="range" min="50" max="5000" step="50" />
          </div>
          <div class="field">
            <label for="bins"><span>Bins</span><span id="bins-value"></span></label>
            <input id="bins" type="range" min="2" max="100" step="1" />
          </div>
          <div class="field">
            <label for="mean"><span>Mean / center</span></label>
            <input id="mean" type="number" step="0.1" />
          </div>
          <div class="field">
            <label for="std"><span>Std dev / spread</span></label>
            <input id="std" type="number" min="0.1" step="0.1" />
          </div>
          <div class="field">
            <label for="seed"><span>Seed</span></label>
            <input id="seed" type="number" min="0" step="1" />
          </div>
          <div class="actions">
            <button class="primary" id="regenerate">Regenerate</button>
            <button class="secondary" id="explain-btn">Explain this histogram</button>
            <button class="secondary" id="reset">Reset</button>
          </div>
        </div>
        <div class="chart-pane">
          <div class="stats">
            <div class="stat"><div class="label">Observed mean</div><div class="value" id="stat-mean">–</div></div>
            <div class="stat"><div class="label">Observed std</div><div class="value" id="stat-std">–</div></div>
            <div class="stat"><div class="label">Min</div><div class="value" id="stat-min">–</div></div>
            <div class="stat"><div class="label">Max</div><div class="value" id="stat-max">–</div></div>
          </div>
          <div id="chart"></div>
          <div class="footer-note">The widget generates data in-browser and redraws the histogram as you tweak parameters.</div>
        </div>
      </div>
    </div>
  </div>
`;

const app = new App({ name: "Histogram Lab", version: "0.1.0" });

const chartEl = document.getElementById("chart") as HTMLElement;
const distributionEl = document.getElementById("distribution") as HTMLSelectElement;
const nEl = document.getElementById("n") as HTMLInputElement;
const binsEl = document.getElementById("bins") as HTMLInputElement;
const meanEl = document.getElementById("mean") as HTMLInputElement;
const stdEl = document.getElementById("std") as HTMLInputElement;
const seedEl = document.getElementById("seed") as HTMLInputElement;
const nValueEl = document.getElementById("n-value") as HTMLElement;
const binsValueEl = document.getElementById("bins-value") as HTMLElement;
const resetEl = document.getElementById("reset") as HTMLButtonElement;
const regenerateEl = document.getElementById("regenerate") as HTMLButtonElement;
const explainEl = document.getElementById("explain-btn") as HTMLButtonElement;
const statMeanEl = document.getElementById("stat-mean") as HTMLElement;
const statStdEl = document.getElementById("stat-std") as HTMLElement;
const statMinEl = document.getElementById("stat-min") as HTMLElement;
const statMaxEl = document.getElementById("stat-max") as HTMLElement;

let state: HistogramState = { ...DEFAULTS };
let currentData: number[] = [];
let plotReady = false;

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function normalSample(rng: () => number, mean: number, std: number): number {
  const u1 = Math.max(rng(), Number.EPSILON);
  const u2 = rng();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + z0 * std;
}

function generateData(input: HistogramState): number[] {
  const rng = mulberry32(Math.floor(input.seed));
  const { distribution, n, mean, std } = input;
  const data: number[] = [];

  for (let i = 0; i < n; i += 1) {
    switch (distribution) {
      case "uniform": {
        const width = std * Math.sqrt(12);
        data.push(mean - width / 2 + rng() * width);
        break;
      }
      case "exponential": {
        const rate = 1 / Math.max(std, 0.0001);
        const value = -Math.log(1 - rng()) / rate;
        data.push(mean + value);
        break;
      }
      case "bimodal": {
        const offset = std * 1.5;
        const center = rng() < 0.5 ? mean - offset : mean + offset;
        data.push(normalSample(rng, center, std));
        break;
      }
      case "normal":
      default:
        data.push(normalSample(rng, mean, std));
        break;
    }
  }

  return data;
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function std(values: number[]): number {
  const m = mean(values);
  const variance = values.reduce((sum, value) => sum + (value - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function updateStats(values: number[]) {
  const observedMean = mean(values);
  const observedStd = std(values);
  const min = Math.min(...values);
  const max = Math.max(...values);

  statMeanEl.textContent = observedMean.toFixed(2);
  statStdEl.textContent = observedStd.toFixed(2);
  statMinEl.textContent = min.toFixed(2);
  statMaxEl.textContent = max.toFixed(2);
}

function syncControls() {
  distributionEl.value = state.distribution;
  nEl.value = String(state.n);
  binsEl.value = String(state.bins);
  meanEl.value = String(state.mean);
  stdEl.value = String(state.std);
  seedEl.value = String(state.seed);
  nValueEl.textContent = String(state.n);
  binsValueEl.textContent = String(state.bins);
}

function readControlsIntoState() {
  state = {
    distribution: distributionEl.value as Distribution,
    n: Number(nEl.value),
    bins: Number(binsEl.value),
    mean: Number(meanEl.value),
    std: Math.max(0.1, Number(stdEl.value)),
    seed: Number(seedEl.value),
  };
}

async function persistWidgetState() {
  await window.openai?.setWidgetState?.(state);
}

function inferShape(input: HistogramState): string {
  switch (input.distribution) {
    case "uniform":
      return "roughly flat with hard edges";
    case "exponential":
      return "right-skewed with a long positive tail";
    case "bimodal":
      return "two peaks if binning doesn't smear them together";
    case "normal":
    default:
      return "roughly symmetric and bell-shaped";
  }
}

function summarizeCurrentHistogram() {
  const observedMean = mean(currentData);
  const observedStd = std(currentData);
  const min = Math.min(...currentData);
  const max = Math.max(...currentData);

  return {
    observedMean: Number(observedMean.toFixed(3)),
    observedStd: Number(observedStd.toFixed(3)),
    min: Number(min.toFixed(3)),
    max: Number(max.toFixed(3)),
    expectedShape: inferShape(state),
  };
}

async function explainHistogram() {
  readControlsIntoState();
  await persistWidgetState();

  const summary = summarizeCurrentHistogram();

  await window.openai?.sendFollowUpMessage?.({
    prompt: `
Explain this histogram to the user like a sharp statistics coach.

Current settings:
- distribution: ${state.distribution}
- sample size: ${state.n}
- mean / center: ${state.mean}
- std / spread: ${state.std}
- bins: ${state.bins}
- seed: ${state.seed}

Observed summary:
- observed mean: ${summary.observedMean}
- observed std: ${summary.observedStd}
- min: ${summary.min}
- max: ${summary.max}
- expected shape: ${summary.expectedShape}

Do 4 things:
1. explain what pattern the histogram currently suggests
2. explain how the current bin choice affects interpretation
3. say what would likely change with fewer bins and with more bins
4. suggest one concrete next experiment
`.trim(),
    scrollToBottom: true,
  });
}

async function ensurePlotly(): Promise<void> {
  if (window.Plotly) return;
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.plot.ly/plotly-2.35.2.min.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Plotly"));
    document.head.appendChild(script);
  });
}

async function renderHistogram() {
  await ensurePlotly();
  updateStats(currentData);

  const trace = {
    x: currentData,
    type: "histogram",
    nbinsx: state.bins,
    hovertemplate: "Bin count: %{y}<br>Value: %{x}<extra></extra>",
  };

  const layout = {
    title: `${capitalize(state.distribution)} synthetic data`,
    margin: { l: 50, r: 20, t: 50, b: 50 },
    xaxis: { title: "Value" },
    yaxis: { title: "Count" },
    paper_bgcolor: "#ffffff",
    plot_bgcolor: "#ffffff",
  };

  const config = {
    responsive: true,
    displayModeBar: false,
  };

  if (!plotReady) {
    await window.Plotly.newPlot(chartEl, [trace], layout, config);
    plotReady = true;
  } else {
    await window.Plotly.react(chartEl, [trace], layout, config);
  }
}

async function regenerate() {
  readControlsIntoState();
  currentData = generateData(state);
  await persistWidgetState();
  await renderHistogram();
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function applyInitialContent(content?: ToolStructuredContent) {
  const initial = content?.initial ?? {};
  const saved = window.openai?.widgetState ?? {};

  state = {
    distribution: (saved.distribution as Distribution) ?? (initial.distribution as Distribution) ?? DEFAULTS.distribution,
    n: Number(saved.n ?? initial.n ?? DEFAULTS.n),
    mean: Number(saved.mean ?? initial.mean ?? DEFAULTS.mean),
    std: Number(saved.std ?? initial.std ?? DEFAULTS.std),
    bins: Number(saved.bins ?? initial.bins ?? DEFAULTS.bins),
    seed: Number(saved.seed ?? initial.seed ?? DEFAULTS.seed),
  };

  syncControls();
}

app.ontoolresult = async (result) => {
  applyInitialContent(result.structuredContent as ToolStructuredContent | undefined);
  await regenerate();
};

distributionEl.addEventListener("change", async () => {
  await regenerate();
});

nEl.addEventListener("input", () => {
  nValueEl.textContent = nEl.value;
});
nEl.addEventListener("change", async () => {
  await regenerate();
});

binsEl.addEventListener("input", async () => {
  binsValueEl.textContent = binsEl.value;
  readControlsIntoState();
  state.bins = Number(binsEl.value);
  await persistWidgetState();
  await renderHistogram();
});

[meanEl, stdEl, seedEl].forEach((element) => {
  element.addEventListener("change", async () => {
    await regenerate();
  });
});

regenerateEl.addEventListener("click", async () => {
  await regenerate();
});

explainEl.addEventListener("click", async () => {
  await explainHistogram();
});

resetEl.addEventListener("click", async () => {
  state = { ...DEFAULTS };
  syncControls();
  await regenerate();
});

syncControls();
currentData = generateData(state);
void persistWidgetState();
void renderHistogram();
app.connect();
