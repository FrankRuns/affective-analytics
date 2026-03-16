# Affective Analytics Histogram Lab for ChatGPT

This is a minimal ChatGPT app built with the Apps SDK + MCP pattern.

It exposes one tool:

- `open-histogram-lab` — opens an interactive panel that generates synthetic data and redraws a histogram while the user adjusts the number of bins.

## What is in here

- `server.ts` — registers the MCP tool and the UI resource.
- `main.ts` — starts a Streamable HTTP MCP server at `/mcp`.
- `mcp-app.html` — HTML entry point for the widget.
- `src/mcp-app.ts` — widget logic for generating synthetic data and plotting a histogram.
- `vite.config.ts` — bundles the widget into a single HTML file in `dist/`.

## Local setup

```bash
npm install
npm run build
npm run start
```

By default the MCP endpoint is:

```bash
http://localhost:3001/mcp
```

## Connect it to ChatGPT

### Fastest path

1. Expose your local server with HTTPS using ngrok or Cloudflare Tunnel.
2. In ChatGPT, enable **Developer mode** under **Settings → Apps & Connectors → Advanced settings**.
3. In **Settings → Connectors**, click **Create**.
4. Paste your public MCP URL, for example:

```text
https://your-subdomain.ngrok.app/mcp
```

5. Name the connector something discoverable, such as `Histogram Lab`.
6. Add the connector to a new chat with the `+` button, then try prompts like:
   - `Open Histogram Lab`
   - `Let me play with histogram bins`
   - `Generate a bimodal histogram playground`

## Deploy suggestion

Use one of these two paths:

- **Private / fastest**: keep it local, use ngrok, connect via Developer mode.
- **Cleaner / durable**: deploy the Node app to Render, Fly.io, or another low-friction HTTPS host, then use the hosted `/mcp` URL in ChatGPT.

## Notes

- The widget loads Plotly from `cdn.plot.ly`, so the resource CSP allows that domain.
- The app generates data in-browser and does not store user data.
- This is intentionally small. Do not add auth, persistence, uploads, or analytics until the core interaction feels good.
