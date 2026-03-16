import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.join(__dirname, "dist");
const RESOURCE_URI = "ui://histogram-lab/mcp-app-v1.html";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "Affective Analytics Histogram Lab",
    version: "0.1.0",
  });

  const histogramInputSchema = {
    distribution: z
      .enum(["normal", "uniform", "exponential", "bimodal"])
      .default("normal"),
    n: z.number().min(10).max(50000).default(500),
    mean: z.number().default(0),
    std: z.number().min(0.0001).default(1),
    bins: z.number().min(2).max(100).default(20),
    seed: z.number().min(0).default(42),
  };

  registerAppTool(
    server,
    "open-histogram-lab",
    {
      title: "Open Histogram Lab",
      description:
        "Open an interactive histogram playground for generating synthetic data and adjusting histogram bins.",
      inputSchema: histogramInputSchema,
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
        destructiveHint: false,
      },
      _meta: {
        ui: {
          resourceUri: RESOURCE_URI,
        },
        "openai/toolInvocation/invoking": "Opening Histogram Lab…",
        "openai/toolInvocation/invoked": "Histogram Lab ready.",
      },
    },
    async (args: z.infer<z.ZodObject<typeof histogramInputSchema>>) => {
      const defaults = {
        distribution: "normal",
        n: 500,
        mean: 0,
        std: 1,
        bins: 20,
        seed: 42,
      };
      const initial = { ...defaults, ...args };

      return {
        structuredContent: {
          initial,
          title: "Histogram Lab",
        },
        content: [
          {
            type: "text",
            text: "Opened Histogram Lab with configurable synthetic data parameters.",
          },
        ],
      };
    },
  );

  registerAppResource(
    server,
    RESOURCE_URI,
    RESOURCE_URI,
    { mimeType: RESOURCE_MIME_TYPE },
    async () => {
      const html = await fs.readFile(path.join(DIST_DIR, "mcp-app.html"), "utf-8");
      return {
        contents: [
          {
            uri: RESOURCE_URI,
            mimeType: RESOURCE_MIME_TYPE,
            text: html,
            _meta: {
              ui: {
                prefersBorder: true,
                domain: "histogram-lab",
                csp: {
                  connectDomains: [],
                  resourceDomains: ["https://cdn.plot.ly"],
                },
              },
            },
          },
        ],
      };
    },
  );

  return server;
}
