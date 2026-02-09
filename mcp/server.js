import { createServer } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";

function createDecisionServer() {
  const server = new McpServer({ name: "decision-mc", version: "1.0.0" });

  const assumptionSchema = z.object({
    id: z.string().optional(),
    name: z.string(),
    mean: z.number(),
    std: z.number(),
    weight: z.number(),
    direction: z.enum(["positive", "negative"]),
    enabled: z.boolean()
  });

  const inputSchema = z.object({
    iterations: z.number().int().min(1000).max(200000).default(20000),
    threshold: z.number().default(0),
    assumptions: z.array(assumptionSchema).min(1)
  });

  registerAppTool(
    server,
    "run_decision_mc",
    {
      title: "Run decision Monte Carlo",
      description:
        "Runs a Monte Carlo simulation for a decision based on assumptions (mean/std/weight/direction) and returns probability of success.",
      inputSchema,
      // No UI resourceUri yet; add later when you build an embedded widget.
    },
    async (args) => {
      // IMPORTANT: point this to your EXISTING engine endpoint
      // If you keep MC logic in your Next app at /api/sim, just call it here.
      const engineUrl = process.env.ENGINE_URL; // e.g. https://your-next-app.vercel.app/api/sim

      const resp = await fetch(engineUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          iterations: args.iterations,
          threshold: args.threshold,
          assumptions: args.assumptions
        })
      });

      if (!resp.ok) {
        const text = await resp.text();
        return {
          content: [{ type: "text", text: `Engine error (${resp.status}): ${text}` }]
        };
      }

      const json = await resp.json();

      // MCP: return structuredContent for the model to use precisely
      return {
        content: [{ type: "text", text: "Simulation complete." }],
        structuredContent: json
      };
    }
  );

  return server;
}

const port = Number(process.env.PORT ?? 8787);
const MCP_PATH = "/mcp";

const httpServer = createServer(async (req, res) => {
  if (!req.url) return res.writeHead(400).end("Missing URL");

  const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

  // CORS preflight (quickstart pattern)
  if (req.method === "OPTIONS" && url.pathname === MCP_PATH) {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "content-type, mcp-session-id",
      "Access-Control-Expose-Headers": "Mcp-Session-Id"
    });
    return res.end();
  }

  if (req.method === "GET" && url.pathname === "/") {
    return res.writeHead(200, { "content-type": "text/plain" }).end("Decision MCP server");
  }

  const MCP_METHODS = new Set(["POST", "GET", "DELETE"]);
  if (url.pathname === MCP_PATH && req.method && MCP_METHODS.has(req.method)) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");

    const server = createDecisionServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless
      enableJsonResponse: true
    });

    res.on("close", () => {
      transport.close();
      server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res);
    } catch (e) {
      console.error(e);
      if (!res.headersSent) res.writeHead(500).end("Internal server error");
    }
    return;
  }

  res.writeHead(404).end("Not Found");
});

httpServer.listen(port, () => {
  console.log(`Decision MCP server listening on http://localhost:${port}${MCP_PATH}`);
});
