// Simple seeded random number generator
class SeededRandom {
  private seed: number;
  
  constructor(seed: number) {
    this.seed = seed;
  }
  
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
  
  normal(mean: number, std: number): number {
    // Box-Muller transform
    const u1 = this.next();
    const u2 = this.next();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z0 * std;
  }
}

// Generate deterministic sample data
export function generateSampleData(): number[] {
  const rng = new SeededRandom(42);
  const data: number[] = [];
  
  // 65% from cluster 1 (mean=0, std=1)
  for (let i = 0; i < 325; i++) {
    data.push(rng.normal(0, 1));
  }
  
  // 35% from cluster 2 (mean=3, std=0.8)
  for (let i = 0; i < 175; i++) {
    data.push(rng.normal(3, 0.8));
  }
  
  return data;
}

// Compute histogram bins
export function computeHistogram(data: number[], numBins: number) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const binWidth = (max - min) / numBins;
  
  const bins = Array(numBins).fill(0).map((_, i) => ({
    binStart: min + i * binWidth,
    binEnd: min + (i + 1) * binWidth,
    count: 0
  }));
  
  data.forEach(value => {
    const binIndex = Math.min(
      Math.floor((value - min) / binWidth),
      numBins - 1
    );
    bins[binIndex].count++;
  });
  
  return bins;
}

// Create Vega-Lite spec
export function createChartSpec(bins: any[], numBins: number) {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    width: 600,
    height: 300,
    data: {
      values: bins.map(b => ({
        binStart: b.binStart.toFixed(2),
        count: b.count
      }))
    },
    mark: {
      type: 'bar',
      color: '#60a5fa',
      stroke: '#3b82f6',
      strokeWidth: 1
    },
    encoding: {
      x: {
        field: 'binStart',
        type: 'ordinal',
        title: 'Value',
        axis: { labelAngle: -45 }
      },
      y: {
        field: 'count',
        type: 'quantitative',
        title: 'Frequency'
      }
    },
    config: {
      view: { stroke: null },
      axis: { grid: false }
    }
  };
}
