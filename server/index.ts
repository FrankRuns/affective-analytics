import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express from 'express';
import cors from 'cors';
import { generateSampleData, computeHistogram, createChartSpec } from './tools.js';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Cached sample data
const sampleData = generateSampleData();

// Create MCP server
const server = new Server(
  {
    name: 'histogram-explorer',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register histogram tool
server.setRequestHandler('tools/list', async () => ({
  tools: [
    {
      name: 'get_histogram',
      description: 'Get histogram data with adjustable bin count. Use when user asks to see histogram or change bins.',
      inputSchema: {
        type: 'object',
        properties: {
          bins: {
            type: 'number',
            description: 'Number of bins (2-60)',
            default: 10
          }
        }
      }
    }
  ]
}));

server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;
  
  if (name === 'get_histogram') {
    const bins = Math.max(2, Math.min(60, (args as any)?.bins || 10));
    const histogram = computeHistogram(sampleData, bins);
    const chartSpec = createChartSpec(histogram, bins);
    
    return {
      content: [{
        type: 'text',
        text: `Histogram with ${bins} bins (sample size: ${sampleData.length} points)`
      }],
      _meta: {
        histogram,
        bins,
        chartSpec,
        sampleSize: sampleData.length
      }
    };
  }
  
  throw new Error('Unknown tool');
});

// SSE endpoint for MCP
app.get('/mcp', async (req, res) => {
  const transport = new SSEServerTransport('/mcp/message', res);
  await server.connect(transport);
});

app.post('/mcp/message', async (req, res) => {
  // Handle incoming messages - this is managed by SSEServerTransport
  res.status(200).end();
});

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'Histogram ChatGPT App',
    endpoints: {
      mcp: '/mcp',
      widget: '/widget.html'
    }
  });
});

app.listen(PORT, () => {
  console.log(`✓ Histogram app running on http://localhost:${PORT}`);
  console.log(`✓ MCP endpoint: http://localhost:${PORT}/mcp`);
  console.log(`✓ Widget: http://localhost:${PORT}/widget.html`);
});
