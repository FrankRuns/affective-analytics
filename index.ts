import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Seeded random for consistent data
class SeededRandom {
  private seed: number;
  constructor(seed: number) { this.seed = seed; }
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
  normal(mean: number, std: number): number {
    const u1 = this.next();
    const u2 = this.next();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z0 * std;
  }
}

function generateData(): number[] {
  const rng = new SeededRandom(42);
  const data: number[] = [];
  for (let i = 0; i < 325; i++) data.push(rng.normal(0, 1));
  for (let i = 0; i < 175; i++) data.push(rng.normal(3, 0.8));
  return data;
}

function computeHistogram(data: number[], bins: number) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const width = (max - min) / bins;
  const result = Array(bins).fill(0).map((_, i) => ({
    binStart: min + i * width,
    binEnd: min + (i + 1) * width,
    count: 0
  }));
  data.forEach(v => {
    const idx = Math.min(Math.floor((v - min) / width), bins - 1);
    result[idx].count++;
  });
  return result;
}

const sampleData = generateData();

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Histogram ChatGPT App',
    endpoints: { mcp: '/mcp' }
  });
});

// SSE MCP endpoint
app.get('/mcp', async (req, res) => {
  console.log('MCP connection initiated');
  
  const server = new Server(
    { name: 'histogram-explorer', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );
  
  server.setRequestHandler('tools/list', async () => ({
    tools: [{
      name: 'get_histogram',
      description: 'Get histogram with adjustable bins',
      inputSchema: {
        type: 'object',
        properties: {
          bins: { 
            type: 'number',
            description: 'Number of bins (2-60)'
          }
        },
        required: []
      }
    }]
  }));
  
  server.setRequestHandler('tools/call', async (request) => {
    const { name, arguments: args } = request.params;
    if (name === 'get_histogram') {
      const bins = Math.max(2, Math.min(60, (args as any)?.bins || 10));
      const histogram = computeHistogram(sampleData, bins);
      return {
        content: [{
          type: 'text',
          text: `Histogram with ${bins} bins (${sampleData.length} data points)`
        }]
      };
    }
    throw new Error('Unknown tool');
  });
  
  const transport = new SSEServerTransport('/mcp/message', res);
  await server.connect(transport);
});

// Message handler for SSE
app.post('/mcp/message', (req, res) => {
  res.status(200).end();
});

app.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
  console.log(`✓ MCP endpoint: /mcp`);
});
