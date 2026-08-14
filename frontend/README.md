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
