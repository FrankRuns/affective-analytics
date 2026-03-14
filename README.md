# Histogram ChatGPT App

Minimal proof-of-concept: interactive analytics inside ChatGPT.

## What This Is

A ChatGPT app that shows a histogram with adjustable bins - all inline in the conversation.

Proves the thesis: **Analytics should happen IN the conversation, not in dashboards.**

## Quick Start

### 1. Install
```bash
npm install
```

### 2. Run locally
```bash
npm run dev
```

Server starts on `http://localhost:3000`

### 3. Expose with ngrok
```bash
ngrok http 3000
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

### 4. Connect to ChatGPT

1. Go to ChatGPT Settings → Developer
2. Enable "Developer mode"
3. Go to Apps & Connectors → New App
4. Name: `Histogram Explorer`
5. MCP URL: `https://YOUR_NGROK_URL/mcp`
6. Auth: No auth
7. Click Create

### 5. Test It

In ChatGPT, say:
```
Show me a histogram demo
```

Then try:
```
Change bins to 5
```

```
Set bins to 30
```

The histogram updates inline!

## How It Works

### Architecture
- **MCP Server** (`/mcp`) - ChatGPT calls this
- **Tool**: `get_histogram` - Returns histogram data + chart spec
- **Widget**: Renders inline in ChatGPT
- **Vega-Lite**: Draws the histogram
- **Slider**: User adjusts bins, widget refetches data

### Data
- 500 points from a deterministic seeded RNG
- 65% from cluster at mean=0
- 35% from cluster at mean=3
- Same seed = same histogram every time

### Files
```
histogram_app/
├── server/
│   ├── index.ts        # Express + MCP endpoint
│   └── tools.ts        # Data generation + histogram logic
├── public/
│   └── widget.html     # Interactive widget (Vega-Lite)
├── package.json
├── tsconfig.json
└── README.md
```

## The Thesis

Traditional analytics:
1. Ask a question
2. Go to dashboard
3. Look at chart
4. Come back to conversation
5. Repeat

**This app:**
1. Ask a question
2. Chart appears inline
3. Adjust parameters with sliders
4. Continue conversation with insights

**Analytics happens IN the conversation.**

## Troubleshooting

### Widget doesn't show
- Check ngrok URL is correct
- Make sure `/mcp` is at the end
- Verify server is running (`npm run dev`)

### Bins don't change
- Open browser console (F12) in ChatGPT
- Look for CORS errors
- Make sure ngrok URL matches server URL in widget.html

### Tool not found
- ChatGPT may need explicit trigger: "@Histogram-Explorer show me a histogram"
- Or say "use the histogram tool"

## Next Steps

This is the minimal viable proof. To expand:
- Add more tools (different chart types, data sources)
- Build real decision simulators
- Add interactive controls (filters, parameters)
- Connect to actual data

But first: **prove the concept works.**

That's what this is.
