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

// MCP endpoint
app.post('/mcp', async (req, res) => {
  const { method, params } = req.body;
  
  try {
    // List tools
    if (method === 'tools/list') {
      return res.json({
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
      });
    }
    
    // Call tool
    if (method === 'tools/call') {
      const { name, arguments: args } = params;
      
      if (name === 'get_histogram') {
        const bins = Math.max(2, Math.min(60, args?.bins || 10));
        const histogram = computeHistogram(sampleData, bins);
        const chartSpec = createChartSpec(histogram, bins);
        
        return res.json({
          content: [{
            type: 'text',
            text: `Histogram with ${bins} bins (sample size: ${sampleData.length} points)`
          }],
          isError: false,
          _meta: {
            histogram,
            bins,
            chartSpec,
            sampleSize: sampleData.length
          }
        });
      }
    }
    
    res.status(404).json({ error: 'Unknown method' });
    
  } catch (error: any) {
    res.status(500).json({ 
      error: error.message,
      isError: true 
    });
  }
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
