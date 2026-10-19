# Aurevia Health

Aurevia Health is a local research prototype for ambient clinical documentation. It streams microphone audio through the backend to Deepgram, stores final transcript segments in SQLite, and uses Groq to prepare draft SOAP documentation and a final consultation report. PDF export runs in the browser.

This software is not clinically validated, does not diagnose or recommend treatment, and must not be used with real patient data. AI-generated content requires independent clinician review.

## Current implementation

- Patients are read from the backend SQLite database. Add and Edit are available on the Patients page.
- Each consultation has a distinct ID and a patient snapshot. Transcript segments persist as they arrive; a successful final report is stored with the consultation.
- Consultation states are `active`, `finalizing`, `completed`, `interrupted`, and `failed`. The backend marks unfinished sessions interrupted on restart. Failed report generation can be retried from consultation history.
- A completed consultation report can be opened using its ID and exported as a PDF.
- Local source JSON remains read-only migration material. SQLite lives under `backend/storage/`.

## Requirements and setup

Node.js 24.22.0 and npm 11.19.1 were used for the stabilization checks. Install dependencies in both applications:

```text
cd backend
npm install
npm run db:migrate-json -- --dry-run
npm run db:migrate-json
```

Then, in a second terminal:

```text
cd frontend
npm install
```

The backend reads these environment variable names: `PORT`, `DEEPGRAM_API_KEY`, `GROQ_API_KEY`, `GROQ_MODEL`, `FRONTEND_ORIGINS`, `DB_PATH`, and `DEBUG_VERBOSE_LOGS`. Copy `backend/.env.example` to `backend/.env` and fill in local values. The frontend reads `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL`; copy `frontend/.env.example` to `frontend/.env.local` if the defaults are unsuitable. Never commit real keys.

Run the backend and frontend in separate terminals:

```text
cd backend
npm run dev
```

```text
cd frontend
npm run dev
```

## Checks and database commands

```text
cd backend
npm run typecheck
npm test
npm run build
npm run db:migrate-json -- --dry-run
npm run db:migrate-json
npm run db:verify
npm run db:backup
```

```text
cd frontend
npm run lint
npm run build
```

The JSON migration accepts `--db <path>` to target a disposable database. `--dry-run` validates the sources and reports counts without writing. A migration run writes a verified SHA-256 source backup to `backend/storage/backups/` before importing. The backup command uses SQLite's backup API and verifies row counts, integrity, and foreign keys.

To restore a database backup, stop the backend first, select a verified `.db` backup under `backend/storage/backups/`, and copy it to `backend/storage/aurevia.db`. On Windows use `Copy-Item -LiteralPath <backup> -Destination backend/storage/aurevia.db`; on macOS/Linux use `cp <backup> backend/storage/aurevia.db`. Restart the backend. Keep the pre-migration JSON backup and manifest; do not edit or delete the source JSON files.

## API and WebSocket lifecycle

`POST /api/consultation/start` accepts `{ "patientId": "..." }` and returns a `consultationId`. If another session for that patient is active, it is marked interrupted and its ID is returned as `previousInterruptedConsultationId`.

The browser connects to `/api/consultation/live?consultationId=<id>` and sends binary audio frames. Final transcript events use `{ "type":"transcript", "chunk":{"speaker":"doctor|patient","text":"..."}, "seq":1 }`. Error events use `{ "type":"error", "message":"..." }`. Invalid, unknown, and non-active sessions close with codes 4400, 4404, and 4409. When a browser socket closes, the backend asks Deepgram to flush its final utterances before finishing.

`POST /api/consultation/process` accepts a consultation ID and optional manually typed chunks. Audio transcript text is already stored by the backend and must not be resent by the browser. `POST /api/consultation/end` drains the live stream, generates a final report, and completes the consultation. AI or persistence failures return an error and keep the transcript available for retry. `GET /api/consultation/recent?includeIncomplete=true` includes interrupted and failed sessions.

## Limitations

- Research prototype only. AI-generated content is not clinically validated and must be independently verified. Not for diagnosis or treatment decisions.
- There is no authentication or authorization. CORS and WebSocket Origin checks are not authentication; the WebSocket proxy is a local unauthenticated proxy. Do not expose this app publicly.
- SQLite stores plaintext locally. Use mock/test patient data only; do not enter real patient information.
- Live alerts and rolling drafts are not persisted. Transcript segments and successful final reports are persisted.
- The Groq preview model can change. Missing provider keys use an explicitly marked degraded/fallback path; fallback final reports are not stored as completed reports.
- Drug-interaction logic is not wired into the application. No audit-log system exists.
- “Completed today” uses the backend host's local date and can differ across time zones or around midnight. The displayed queue time is demo presentation data; appointment scheduling is not implemented.
- Diarization currently assumes the first detected speaker is the doctor. The browser has no automatic WebSocket reconnect.
- Search covers patient name and ID, not diagnosis.

See [backend/README.md](backend/README.md) for the current backend API and database details.
