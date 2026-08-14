# Finch Intake Backend

This folder is a standalone intake API and extraction worker.
It does not import code from the React application, and it can be used from React, curl, another service, or a phone system.

## What happens to an intake

1. A client sends a transcript to `POST /api/intakes`.
2. The API validates the request.
3. PostgreSQL stores the untouched transcript and a pending extraction job in one transaction.
4. The API immediately returns the intake ID with HTTP `202 Accepted`.
5. The worker claims the job without blocking other workers.
6. The worker uses structured model output to extract normalized facts.
7. PostgreSQL writes the client, incident, defendants, insurance, treatments, services, police report, and witnesses in one transaction.
8. A client polls the status or reads the completed result.

The raw transcript is saved before any external model request is made.
A failed extraction therefore never loses the original intake.

## Folder structure

```text
backend/
├── migrations/             PostgreSQL schema
├── src/
│   ├── cli/migrate.ts      Migration command
│   ├── app.ts              HTTP routes
│   ├── config.ts           Environment validation
│   ├── db.ts               PostgreSQL connection and transactions
│   ├── domain.ts           Request and extraction schemas
│   ├── extractor.ts        OpenAI extraction adapter
│   ├── intake-store.ts     Persistence and job queue
│   ├── server.ts           API process
│   └── worker.ts           Extraction process
├── test/                   Unit and API tests
├── docker-compose.yml      PostgreSQL, API, and worker
└── Dockerfile              Production container
```

## Quick start with Docker

Copy the environment template.

```bash
cd backend
cp .env.example .env
```

Set `OPENAI_API_KEY` in `backend/.env` before starting the worker.
The API can still store intakes without a running worker, but jobs remain pending until a configured worker starts.

Start PostgreSQL, the API, and the worker.

```bash
docker compose up --build
```

The API is available at `http://127.0.0.1:3001`.

## Local development

Install dependencies and start only PostgreSQL.

```bash
cd backend
npm install
cp .env.example .env
docker compose up -d postgres
npm run migrate
```

Start the API in one terminal.

```bash
npm run dev
```

Start the worker in another terminal.

```bash
npm run dev:worker
```

## Submit an intake

The transcript can be plain text or an array of speaker segments.
Speaker segments are preferred because they preserve attribution and timestamps.

```bash
curl --request POST http://127.0.0.1:3001/api/intakes \
  --header 'Content-Type: application/json' \
  --data @examples/intake.json
```

Example response:

```json
{
  "id": "2fdd8754-5a63-4e96-b8f8-f54e24f90ae7",
  "source": "manual",
  "externalReference": "example-call-001",
  "status": "received",
  "normalizedAt": null,
  "failureReason": null,
  "createdAt": "2026-08-14T12:00:00.000Z",
  "updatedAt": "2026-08-14T12:00:00.000Z",
  "created": true
}
```

Supplying the same non-null `externalReference` again returns the existing intake instead of duplicating it.

## Read an intake

```bash
curl http://127.0.0.1:3001/api/intakes/INTAKE_ID
curl http://127.0.0.1:3001/api/intakes/INTAKE_ID/status
curl http://127.0.0.1:3001/api/intakes/INTAKE_ID/transcript
curl http://127.0.0.1:3001/api/intakes/INTAKE_ID/results
```

The results endpoint is safe to call while processing.
Its `intake.status` field indicates whether normalized records are available.

## React integration

React only needs the HTTP API.
It must never receive `DATABASE_URL` or `OPENAI_API_KEY`.

```ts
const response = await fetch("http://127.0.0.1:3001/api/intakes", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    source: "web",
    externalReference: callId,
    transcript: segments,
  }),
});

if (!response.ok) {
  throw new Error("The intake could not be submitted");
}

const intake = await response.json();
```

Configure `CORS_ORIGINS` as a comma-separated allowlist when the frontend runs on another origin.

## API endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Confirms that the API process is running |
| `GET` | `/ready` | Confirms that PostgreSQL is reachable |
| `POST` | `/api/intakes` | Stores a transcript and queues extraction |
| `GET` | `/api/intakes/:id` | Reads intake metadata |
| `GET` | `/api/intakes/:id/status` | Reads compact processing status |
| `GET` | `/api/intakes/:id/transcript` | Reads the original transcript |
| `GET` | `/api/intakes/:id/results` | Reads normalized extraction results |

## Worker behavior

Workers claim jobs with `FOR UPDATE SKIP LOCKED`, so multiple worker processes can operate safely.
A worker can reclaim a processing job after `WORKER_JOB_TIMEOUT_SECONDS` if another worker crashes.
Failed jobs use exponential retry delays and stop after `WORKER_MAX_ATTEMPTS`.

The extraction uses an environment-selected model and structured output validated by Zod.
The implementation follows the official OpenAI structured output pattern: https://developers.openai.com/api/docs/guides/structured-outputs

## Commands

```bash
npm run dev
npm run dev:worker
npm run migrate
npm run lint
npm run typecheck
npm run test
npm run build
npm run check
```

## Security notes

The backend does not log raw transcript contents.
The API key and database URL remain server-side environment variables.
The transcript endpoint contains sensitive personal and medical information and requires authentication before production use.
Production deployments should add tenant isolation, authentication, authorization, audit logging, encryption policies, rate limits, and a retention policy.
