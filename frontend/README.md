# Finch intake frontend

This is a frontend-only React prototype for importing and reviewing legal intake transcripts.
It uses browser session storage and a mock analysis service until the backend and PostgreSQL database are added.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.
Choose `Preview with sample data` to load the included 14-transcript dataset, or upload another JSONL file.

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
The services under `src/services` are the integration boundary for replacing browser storage and mock analysis with backend API calls later.
