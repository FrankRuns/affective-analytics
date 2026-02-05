# Affective Analytics - ChatGPT MCP Server

Clean, production-ready deployment for Vercel.

## What This Is

A ChatGPT app that analyzes decisions using Monte Carlo simulation with risk buckets (Pessimistic/Expected/Optimistic).

## Deploy to Vercel

### Method 1: GitHub (Recommended)

1. Create new repo on GitHub
2. Push this code:
   ```bash
   git init
   git add .
   git commit -m "Affective Analytics MCP Server"
   git remote add origin https://github.com/YOUR_USERNAME/affective-analytics.git
   git push -u origin main
   ```
3. Go to vercel.com
4. Click "Add New Project"
5. Import your GitHub repo
6. Click "Deploy"

### Method 2: Vercel CLI

```bash
npm i -g vercel
vercel login
vercel
```

### Method 3: Direct Upload

1. Zip this folder
2. Go to vercel.com → "Add New Project"
3. Upload zip
4. Deploy

## After Deployment

Your MCP endpoint will be:
```
https://your-project.vercel.app/mcp
```

### Connect to ChatGPT

1. Go to ChatGPT Settings → Developer → Apps & Connectors
2. Click "New App"
3. Name: `Affective Analytics`
4. MCP URL: `https://your-project.vercel.app/mcp`
5. Auth: No auth
6. Click Create

### Test It

In ChatGPT, say:
```
I'm thinking about hiring another analyst. Salary $120k, 
win rate 40%, average project value $85k. Can you analyze this?
```

## Files

- `api/mcp.js` - Serverless function handling MCP requests
- `package.json` - Dependencies
- `vercel.json` - Routing config
- `README.md` - This file

## The Thesis

Analytics should happen IN the conversation, not in separate dashboards.

This proves it's possible.
