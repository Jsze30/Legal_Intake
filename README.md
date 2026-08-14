# Finch Intake

Finch Intake is a transcript review application for legal intake calls.
It imports one or more calls from JSONL, lets a user choose a transcript, extracts structured facts with OpenAI, saves the source and results in PostgreSQL, and presents a focused review with supporting transcript evidence.

## Demo flow

1. Drop a JSONL file onto the intake screen or load the included sample data.
2. Select one transcript and choose **Analyze transcript**.
3. The API saves the original call and queues an extraction job.
4. The worker creates normalized client, incident, insurance, treatment, service, report, and witness records.
5. The review screen shows the findings, decisions, deeper details, and highlighted source turns.

## Project structure

```text
frontend/          React 19, TypeScript, Vite, and Playwright
backend/           Fastify API, extraction worker, and PostgreSQL migrations
```

The frontend never receives the database URL or OpenAI API key.
The backend persists the untouched transcript before calling the model, so a failed extraction does not lose the intake.

## Technical architecture

```text
JSONL file
    |
    v
React frontend ---> Fastify API ---> PostgreSQL
                         ^                |
                         |                v
                    status polling     job queue
                                          |
                                          v
                                  extraction worker ---> OpenAI
                                          |
                                          v
                              normalized PostgreSQL records
```

The application runs as four separate parts:

- **React frontend:** Parses JSONL locally, displays the available calls, submits only the selected transcript, polls its status, and renders the completed review with transcript evidence.
- **Fastify API:** Validates requests, creates intake records, exposes processing status and results, and keeps database and model credentials on the server.
- **Extraction worker:** Claims queued jobs, requests structured output from OpenAI, validates the response with Zod, and writes normalized facts back to PostgreSQL.
- **PostgreSQL:** Stores the original transcript, job state, failure information, and relational records for clients, incidents, defendants, insurance, treatments, services, reports, and witnesses.

Submitting an intake and creating its job happen in one database transaction.
The API returns `202 Accepted` immediately, so model processing does not hold the browser request open.
The frontend then polls the status endpoint until the intake is complete or has failed.

Workers claim jobs with PostgreSQL row locking and `SKIP LOCKED`, allowing multiple workers to process different calls safely.
Timed-out jobs can be reclaimed, and failed jobs retry with a configured attempt limit.
The completed extraction is written in a transaction so the frontend never reads a partially normalized result.

### API contract

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Check that the API process is running |
| `GET` | `/ready` | Check that PostgreSQL is reachable |
| `POST` | `/api/intakes` | Save a transcript and queue analysis |
| `GET` | `/api/intakes/:id/status` | Read processing progress or failure state |
| `GET` | `/api/intakes/:id/transcript` | Read the original source transcript |
| `GET` | `/api/intakes/:id/results` | Read the normalized review data |

An optional non-null `externalReference` makes intake submission idempotent, preventing the same call from being stored twice.

## Quick start

You need Node.js 22 or newer, npm, Docker, and an OpenAI API key.

Start PostgreSQL, the API, and the worker:

```bash
cd backend
cp .env.example .env
# Add OPENAI_API_KEY to .env
docker compose up --build
```

The API runs at `http://127.0.0.1:3001` and applies database migrations automatically.

In another terminal, start the frontend:

```bash
cd frontend
npm ci
npm run dev
```

Open the local URL printed by Vite, usually `http://127.0.0.1:5173`.
The Vite development server proxies `/api` requests to port `3001`.

## Configuration

Backend settings belong in `backend/.env`.
`OPENAI_API_KEY` is required for analysis, while `DATABASE_URL`, `OPENAI_MODEL`, and `CORS_ORIGINS` can be changed from their local defaults.

Create `frontend/.env.local` only when the frontend and API use different origins:

```env
VITE_API_BASE_URL=https://your-api.example.com
```

Never put `OPENAI_API_KEY` or `DATABASE_URL` in a frontend environment file.

## Input format

The upload accepts JSONL with one complete transcript object per line.
Each transcript needs an ID and ordered speaker turns:

```json
{"id":"call-001","transcript":[{"speaker":"Caller","text":"My name is Tamika..."},{"speaker":"Specialist","text":"How can I help?"}]}
```

The frontend sends only the selected ID and transcript for analysis.
Historical outcome fields in a source dataset are not sent to the model.

## Checks

Run the backend quality gate:

```bash
cd backend
npm ci
npm run check
```

Run the frontend checks:

```bash
cd frontend
npm run lint
npm test
npm run build
npm run test:e2e
```

See [frontend/README.md](frontend/README.md) and [backend/README.md](backend/README.md) for component-level development, API, and deployment details.
