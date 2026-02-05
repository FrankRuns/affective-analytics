# Decision Monte Carlo Prototype (Next.js)

## Local dev
```bash
npm install
npm run dev
```

## Deploy to Vercel
- Import the repo into Vercel
- Framework preset: **Next.js**
- Build command: `npm run build`
- Output directory: (leave default)

## What it does
- Users define assumptions (mean, std dev, weight, direction).
- Monte Carlo samples the assumptions and computes a total score.
- "Success" is defined as total score > threshold.
- App returns probability of success + low/medium/high label.

You can change the success definition in `app/api/sim/route.ts`.
