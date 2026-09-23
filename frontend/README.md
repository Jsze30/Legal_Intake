# Finch intake frontend

This React application imports and reviews legal intake transcripts.
It sends selected transcripts to the standalone backend, waits for OpenAI extraction, and builds the review from the normalized PostgreSQL result.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.
Choose `Preview with sample data` to load the included 14-transcript dataset, or upload another JSONL file.

The Vite development server forwards `/api` requests to `http://127.0.0.1:3001`.
Start the API and worker from the sibling `backend` directory before analyzing a transcript.

If the deployed frontend and backend use different origins, copy `.env.example` to `.env.local` and set `VITE_API_BASE_URL` to the public backend origin.
Only the public backend URL belongs in a frontend environment variable.
Keep `OPENAI_API_KEY` and `DATABASE_URL` in `backend/.env`.

## Available checks

```bash
npm run lint
npm test
npm run build
npm run test:e2e
```

The end-to-end suite exercises the complete flow in desktop and mobile Chrome.

## Data boundary

The JSONL parser keeps only each transcript ID and its speaker turns.
Historical outcome fields are intentionally excluded from the imported frontend model and mock analysis payload.
The services under `src/services` contain the backend API boundary and the normalized-result review adapter.

## Frontend-only demo

The Vercel configuration runs `npm run build:demo`.
That build uses deterministic local results for the included calls and does not require the API, PostgreSQL, OpenAI, or frontend secrets.
The normal `npm run build` command continues to use the backend integration.
Demo mode serves `demo-public/sample-transcripts.jsonl`, a fictional set of 14 calls with 418 speaker turns, from `/sample-transcripts.jsonl`.
It mirrors the original intake format and mix of case types, with new people, incidents, medical histories, coverage questions, and supporting evidence.
All contact details are synthetic, using `example.com` addresses and numbers in the `555-0100` through `555-0199` range.
The demo analysis fixtures in `src/services/demo-analysis.ts` match these calls by ID.
Normal development and production builds continue to serve the original `public/sample-transcripts.jsonl`; demo builds copy only the demo public directory.

Run the demo locally with:

```bash
npm run dev:demo
```

Test the demo flow on desktop and mobile with:

```bash
PLAYWRIGHT_DEMO_MODE=true npm run test:e2e
```

Deploy from this directory with:

```bash
vercel --prod
```

Test an existing deployment with:

```bash
PLAYWRIGHT_DEMO_MODE=true PLAYWRIGHT_BASE_URL=https://your-deployment.vercel.app npm run test:e2e
```
