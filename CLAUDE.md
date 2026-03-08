# CLAUDE.md — Decision Monte Carlo (affective-analytics)

This file provides AI assistants with the context needed to work effectively in this repository.

## Project Overview

**Decision Monte Carlo** is a lightweight decision-support tool. Users define assumptions (probability distributions) and the app runs Monte Carlo simulations to compute `P(success)` — the probability that a weighted score exceeds a threshold.

The repo has two independent pieces:
1. **Next.js web app** (`/app/`) — interactive UI + simulation API
2. **MCP server** (`/mcp/`) — exposes the simulation as an MCP tool for Claude/LLM clients

---

## Repository Structure

```
affective-analytics/
├── app/
│   ├── api/
│   │   └── sim/
│   │       └── route.ts        # POST /api/sim — Monte Carlo engine
│   ├── globals.css             # Global styles
│   ├── layout.tsx              # Root Next.js layout
│   └── page.tsx                # Main UI (client component)
├── mcp/
│   ├── package.json            # MCP server dependencies
│   └── server.js               # HTTP MCP server (decision-mc tool)
├── next.config.mjs             # Next.js config (React strict mode)
├── package.json                # Root app dependencies + scripts
├── tsconfig.json               # TypeScript config (strict, ES2022)
└── README.md
```

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14.2.5 (App Router) |
| UI | React 18.3.1, TypeScript 5.5.3 |
| Simulation | Pure in-memory computation (no DB) |
| MCP server | `@modelcontextprotocol/sdk` 1.20.2, `zod` 3.25.76 |
| Linting | ESLint with `eslint-config-next` |
| Deployment | Vercel (Next.js app), separate host for MCP server |

---

## Development Commands

### Next.js App (root)

```bash
npm install          # Install dependencies
npm run dev          # Start dev server at http://localhost:3000
npm run build        # Production build
npm run start        # Serve production build
npm run lint         # Run ESLint
```

### MCP Server (`/mcp/`)

```bash
cd mcp
npm install          # Install MCP server dependencies
npm start            # Start MCP server (default port: 8787)
```

---

## Environment Variables

There is no `.env` file committed. Set these before running the MCP server:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ENGINE_URL` | Yes (MCP only) | — | Full URL to the Next.js simulation endpoint, e.g. `https://your-app.vercel.app/api/sim` |
| `PORT` | No | `8787` | Port for the MCP HTTP server |

The Next.js app has no required environment variables.

---

## Core Data Model

All types are defined locally in each file (no shared types package).

```typescript
type Assumption = {
  id: string;                        // uid() — random hex + timestamp
  name: string;                      // display label
  mean: number;                      // expected impact value
  std: number;                       // uncertainty (standard deviation)
  weight: number;                    // relative importance multiplier
  direction: "positive" | "negative"; // sign of contribution
  enabled: boolean;                  // whether included in simulation
};

type SimRequest = {
  assumptions: Assumption[];
  iterations: number;               // 1000–300000 (API), 1000–200000 (UI/MCP)
  threshold: number;                // score must exceed this to count as success
  seed?: number;                    // optional for deterministic RNG
};

type SimResponse = {
  iterations: number;
  probabilitySuccess: number;       // 0..1
  label: "LOW" | "MEDIUM" | "HIGH"; // <33%, 33-66%, >66%
  summary: { threshold: number; enabledCount: number };
};
```

---

## Simulation Algorithm (`app/api/sim/route.ts`)

For each iteration:
1. Each enabled assumption is sampled: `sample = Normal(mean, std)` using the **Box-Muller transform**
2. Contribution: `sign * weight * sample` where `sign = direction === "negative" ? -1 : 1`
3. `score = sum of all contributions`
4. Count as success if `score > threshold`

`P(success) = successes / iterations`

The optional `seed` parameter enables deterministic runs via **Mulberry32** RNG. Without a seed, `Math.random` is used.

To change the success definition, modify `app/api/sim/route.ts`.

---

## API Reference

### `POST /api/sim`

**Request body** (`SimRequest`):
```json
{
  "assumptions": [
    { "id": "abc", "name": "Customer adoption", "mean": 0.8, "std": 0.6, "weight": 1.0, "direction": "positive", "enabled": true }
  ],
  "iterations": 20000,
  "threshold": 0.0,
  "seed": 42
}
```

**Response** (`SimResponse`):
```json
{
  "iterations": 20000,
  "probabilitySuccess": 0.712,
  "label": "HIGH",
  "summary": { "threshold": 0, "enabledCount": 1 }
}
```

Server-side limits: `iterations` clamped to [1000, 300000]; `threshold` clamped to [-1000, 1000].

---

## MCP Server (`mcp/server.js`)

- Listens on `http://localhost:8787/mcp` (configurable via `PORT`)
- Stateless — a new `McpServer` + transport is created per request
- Exposes one tool: **`run_decision_mc`**
  - Validates input with Zod, then delegates to `ENGINE_URL` (the Next.js `/api/sim`)
  - Returns `structuredContent` (the raw JSON response) for precise LLM use
- Supports CORS for all origins (preflight at `OPTIONS /mcp`)
- Health check: `GET /` returns `"Decision MCP server"`

---

## Frontend (`app/page.tsx`)

- Client component (`"use client"`)
- Manages assumption list with `useState`; auto-runs simulation on any change (250 ms debounce via `useEffect` + `setTimeout`)
- UI input ranges: `mean` [-5, 5], `std` [0, 5], `weight` [0, 5], `iterations` [1000, 200000], `threshold` [-10, 10]
- Default assumptions on load: Customer adoption, Engineering risk, Pricing power
- Results display: `P(success)` percentage + LOW/MEDIUM/HIGH badge

---

## TypeScript Conventions

- Strict mode is enabled (`"strict": true` in `tsconfig.json`)
- Target: ES2022, module resolution: bundler (Next.js)
- No shared type packages — types are redefined locally in `app/page.tsx` and `app/api/sim/route.ts`
- The MCP server (`mcp/server.js`) is plain JavaScript (ESM), not TypeScript

---

## Testing

There are currently **no tests** in this repository. No Jest, Vitest, or other test framework is configured.

When adding tests, prefer:
- **Vitest** for unit tests (compatible with ESM and TypeScript)
- Place test files as `*.test.ts` alongside the files they test
- The simulation engine in `app/api/sim/route.ts` is a good first candidate (pure functions, deterministic with `seed`)

---

## No `.gitignore`

There is no `.gitignore` file. Before committing, ensure `node_modules/`, `.next/`, and `.env*` files are not staged.

---

## Deployment

**Next.js app → Vercel:**
- Framework preset: Next.js
- Build command: `npm run build`
- Output directory: default (`.next`)

**MCP server:**
- Must be hosted separately (any Node.js host)
- Set `ENGINE_URL` to the deployed Next.js app's `/api/sim` endpoint

---

## Key Files to Know

| File | Purpose |
|------|---------|
| `app/api/sim/route.ts` | Core simulation logic — modify here to change the success model |
| `app/page.tsx` | All UI — assumption editor, result display, auto-run behavior |
| `mcp/server.js` | MCP tool bridge — connects Claude/LLM clients to the simulation |
| `package.json` | Root app scripts and dependencies |
| `mcp/package.json` | MCP server dependencies (separate install) |
