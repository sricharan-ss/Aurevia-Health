# Aurevia Health backend

The backend is Express 5 with TypeScript, `ws`, Groq, Deepgram, and local SQLite through pinned `better-sqlite3`. It is a research prototype, not a clinically validated or diagnostic system.

## Setup and commands

Stabilization was built with Node.js 24.22.0 and npm 11.19.1. From this directory:

```text
npm install
npm run db:migrate-json -- --dry-run
npm run db:migrate-json
npm run dev
```

The server listens on port 3001 by default. Available scripts:

- `npm run dev` starts the TypeScript development server.
- `npm run build` compiles TypeScript to `dist/`.
- `npm start` runs the compiled server.
- `npm run typecheck` runs `tsc --noEmit`.
- `npm test` runs deterministic offline tests with Node's built-in test runner.
- `npm run db:migrate-json -- --dry-run` validates and counts source records without writes.
- `npm run db:migrate-json [-- --db <path>]` backs up and imports migration sources.
- `npm run db:verify [-- --db <path>]` checks migrated records, SQLite integrity, foreign keys, and source hashes.
- `npm run db:backup [-- --db <path>]` creates and verifies a consistent SQLite backup.

The default database is `backend/storage/aurevia.db`; `DB_PATH` can override it. Database files, WAL files, and backups are ignored by Git. Before migration, JSON sources and the frontend patient fixture are copied to `backend/storage/backups/pre-migration-<timestamp>/`; the manifest contains one SHA-256 per file. Source JSON is migration material and must remain unchanged.

To restore a backup, stop the backend, copy a verified `.db` backup from `storage/backups/` to `storage/aurevia.db`, then restart. Use PowerShell `Copy-Item -LiteralPath <backup> -Destination storage/aurevia.db` on Windows or `cp <backup> storage/aurevia.db` on macOS/Linux. Keep backups and their manifests.

## Configuration

The backend loads dotenv once in `src/config.ts`. Supported variable names are `PORT`, `DEEPGRAM_API_KEY`, `GROQ_API_KEY`, `GROQ_MODEL`, `FRONTEND_ORIGINS`, `DB_PATH`, and `DEBUG_VERBOSE_LOGS`. See `.env.example` for placeholder values. Missing provider keys allow the server to start in degraded mode. Never log key values.

## HTTP API

All API errors use `{ "error": "...", "code": "...", "details"?: {} }`.

| Method and path | Request | Success |
|---|---|---|
| `GET /api/patients` | — | JSON array of SQLite-backed patients with derived `status` |
| `GET /api/patients/:id` | — | Canonical patient or `404 NOT_FOUND` |
| `POST /api/patients` | Patient fields | `201` canonical patient with generated ID |
| `PATCH /api/patients/:id` | Partial patient fields | Canonical updated patient; ID is immutable |
| `GET /api/consultation/recent` | — | Completed items with `id`, `patientId`, `patientName`, `date`, `summary` |
| `GET /api/consultation/recent?includeIncomplete=true` | — | Also includes interrupted/failed items with `status` |
| `GET /api/consultation/report/:id` | — | `{id,patient,transcript,report}`; incomplete items have `status` and `report: null` |
| `POST /api/consultation/start` | `{ "patientId": "..." }` | Consultation ID, UTC start time, and existing start fields |
| `POST /api/consultation/process` | `{ "consultationId": "...", "chunks"?: [...] }` | SOAP, alerts, summary, questions, `consultationId`, `aiStatus` |
| `POST /api/consultation/end` | `{ "consultationId": "..." }` | Final report and completion fields; repeat completion is idempotent |

Patients require a trimmed name, integer age 0–130, and gender `Male` or `Female`. Optional array fields are validated and default to empty arrays. Unknown fields are discarded. Patient status is derived: active/finalizing means `in-progress`; a completion on the current backend-local date means `completed`; otherwise `waiting`.

Consultations move through `active`, `finalizing`, `completed`, `interrupted`, and `failed`. Starting another session for the same patient interrupts the older active session without deleting its transcript. A restart marks active/finalizing rows interrupted. Final reports are written only after successful AI generation; fallback/error results are retryable and are not saved as reports.

## WebSocket

Connect to `/api/consultation/live?consultationId=<id>` and send binary audio frames. Final Deepgram utterances are persisted before forwarding:

```json
{"type":"transcript","chunk":{"speaker":"doctor","text":"..."},"seq":1}
```

Provider/socket errors use `{ "type":"error", "message":"..." }`. Missing, unknown, and non-active IDs close with 4400, 4404, and 4409. Closing the browser socket sends `CloseStream` upstream and allows the final utterances to flush. CORS and Origin validation do not authenticate clients. Missing WebSocket Origin is allowed for non-browser clients.

## Security and clinical limitations

There is no authentication, authorization, or audit-log system. Origin checks are not authentication. Do not expose the service publicly. SQLite storage is plaintext; use mock/test patient data only and never enter real patient data. Live alerts and rolling drafts are not persisted; transcript segments and successful final reports are. The Groq preview model may change. Drug-interaction logic is disconnected. Speaker diarization assumes the first detected speaker is the doctor. “Completed today” follows the backend host's local date.
