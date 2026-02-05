// Vercel Serverless Function for Affective Analytics MCP Server

// Monte Carlo Simulation
function runSimulation(variables, n = 10000) {
  const outcomes = [];
  
  for (let i = 0; i < n; i++) {
    const samples = {};
    
    for (const [name, config] of Object.entries(variables)) {
      const { base, min, max } = config;
      // Normal distribution (Box-Muller)
      const u1 = Math.random();
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      const std = (max - min) / 4;
      samples[name] = Math.max(min, Math.min(max, base + z * std));
    }
    
    // Hiring decision model
    const cost = samples.salary * samples.benefits_multiplier;
    const projects = 20 * samples.utilization_rate;
    const effective = projects * 0.75 + projects * 0.25 * samples.ramp_up_discount;
    const revenue = effective * samples.project_win_rate * samples.avg_project_value;
    outcomes.push(revenue - cost);
  }
  
  outcomes.sort((a, b) => a - b);
  
  return {
    mean: outcomes.reduce((a, b) => a + b) / n,
    median: outcomes[Math.floor(n / 2)],
    p10: outcomes[Math.floor(n * 0.1)],
    p90: outcomes[Math.floor(n * 0.9)],
    prob_positive: outcomes.filter(x => x > 0).length / n
  };
}

// Sensitivity analysis
function sensitivity(variables, baseResults) {
  return Object.entries(variables).map(([name, config]) => {
    const low = { ...variables, [name]: { ...config, base: config.min } };
    const high = { ...variables, [name]: { ...config, base: config.max } };
    
    const resLow = runSimulation(low, 5000);
    const resHigh = runSimulation(high, 5000);
    const impact = Math.abs((resHigh.mean - resLow.mean) / baseResults.mean * 100);
    
    return {
      variable: name,
      base: config.base,
      min: config.min,
      max: config.max,
      outcome_at_low: resLow.mean,
      outcome_at_high: resHigh.mean,
      impact_percent: impact
    };
  }).sort((a, b) => b.impact_percent - a.impact_percent);
}

// MCP Protocol Handler
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Health check
  if (req.method === 'GET') {
    return res.status(200).json({ 
      status: 'healthy',
      service: 'Affective Analytics MCP Server'
    });
  }
  
  // MCP requests
  if (req.method === 'POST') {
    const { method, params } = req.body;
    
    try {
      // List available tools
      if (method === 'tools/list') {
        return res.status(200).json({
          tools: [{
            name: 'analyze_decision',
            description: 'Analyze decisions using Monte Carlo simulation. Use when user discusses hiring, investments, or any decision with uncertainty.',
            inputSchema: {
              type: 'object',
              properties: {
                decision_name: { type: 'string' },
                variables: {
                  type: 'object',
                  additionalProperties: {
                    type: 'object',
                    properties: {
                      base: { type: 'number' },
                      min: { type: 'number' },
                      max: { type: 'number' },
                      label: { type: 'string' }
                    }
                  }
                }
              },
              required: ['decision_name', 'variables']
            }
          }]
        });
      }
      
      // Execute tool
      if (method === 'tools/call') {
        const { name, arguments: args } = params;
        
        if (name === 'analyze_decision') {
          const { decision_name, variables } = args;
          
          const results = runSimulation(variables);
          const sens = sensitivity(variables, results);
          
          const buckets = {
            pessimistic: { value: results.p10, label: 'Pessimistic (10th %ile)', emoji: '🔴' },
            expected: { value: results.median, label: 'Expected Outcome', emoji: '🔵' },
            optimistic: { value: results.p90, label: 'Optimistic (90th %ile)', emoji: '🟢' }
          };
          
          const text = `**${decision_name}**

🔴 Pessimistic: $${Math.round(buckets.pessimistic.value).toLocaleString()}
🔵 Expected: $${Math.round(buckets.expected.value).toLocaleString()}
🟢 Optimistic: $${Math.round(buckets.optimistic.value).toLocaleString()}

Probability positive: ${(results.prob_positive * 100).toFixed(1)}%
Most sensitive: ${sens[0].variable} (${sens[0].impact_percent.toFixed(0)}% impact)`;
          
          return res.status(200).json({
            content: [{ type: 'text', text }],
            isError: false
          });
        }
      }
      
      return res.status(404).json({ error: 'Unknown method' });
      
    } catch (error) {
      return res.status(500).json({ 
        error: error.message,
        isError: true 
      });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
