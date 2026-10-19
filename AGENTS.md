# AGENTS.md: Aurevia Health

Standing instructions for coding agents working in this repository. Read this file fully before every task.
A task prompt controls **scope**. This file controls **safety and working rules**. If the two conflict, stop and flag the conflict in your report instead of choosing silently.

---

## 1. Project snapshot

- **Aurevia Health** is an ambient AI clinical copilot. It is a **research prototype**, not a clinically validated or diagnostic system.
- Flow: the doctor talks to the patient. The browser streams audio (WebSocket) to the backend. The backend proxies it to **Deepgram Nova-2** (live STT with diarization). The backend calls **Groq** over HTTPS for a rolling SOAP note, alerts and follow-up questions (about every 30 s) and a final report when the consultation ends. The report can be exported as PDF (jsPDF, client-side).
- Stack: `frontend/` is Next.js 16 / React 19 / Tailwind 4 (App Router). `backend/` is Express 5 + TypeScript + `ws` + `groq-sdk`.
- Persistence is **moving from flat JSON files to a local SQLite database** (see section 4).
- Reference docs: `README.md`, `ARCHITECTURE.md`, `UX.md`, `ARCHITECTURE_REPORT.md` (earlier read-only discovery, with file/symbol evidence) and `IMPLEMENTATION_REPORT.md` (you maintain it). Docs can be stale. **The code is the source of truth.** Record every doc/code discrepancy you find.

## 2. How to work with me

- I am a CS student and the developer. Keep the architecture understandable. Prefer the smallest reliable solution.
- Do not agree with me just to agree. If something I ask for is a mistake, say so briefly, explain the trade-off, and recommend an alternative.
- Inspect before editing. Verify claims in docs/prompts against the real files before relying on them.
- Work in small, testable steps. After each step, run the relevant checks.
- Never claim something works unless you ran it and saw it work. Report actual commands and actual results, including failures.
- Do not invent clinical facts, drug-interaction data, dataset values, API behavior or test results.

## 3. Hard rules (safety)

### Secrets and data
1. **Never read, print, quote, copy or commit** the contents of any `.env*` file or any API key. Checking *whether* a file exists, is tracked, or is ignored is fine.
2. Real keys exist in `backend/.env` and work. Do not modify that file. Do not rotate keys. Do not rewrite Git history.
3. Templates (`.env.example`) contain placeholders only.
4. Do not delete or modify existing data files (`backend/src/data/patients.json`, `backend/src/data/consultations/*`). They are migration sources and backups. Only read them.
5. Before any step that could change data, make a backup and verify it. Backups and the database live in gitignored paths.
6. Do not put patient names, transcript text or model output into logs, error messages, test names or reports. Use IDs, counts and lengths instead.

### External services
7. Tests, scripts and smoke checks must **never call Deepgram or Groq** and must never use the real keys. Inject fakes or local stand-ins. If a check truly needs a live provider, stop and ask.
8. No new AI provider, no Supabase, no hosted database, no authentication system. These are out of scope unless I say otherwise.

### Git
9. Work on the branch named in the task prompt. Make small commits with clear messages, one logical change per commit.
10. Never force-push, rebase published history, `git reset --hard`, `git clean`, or `git stash` work you did not create.
11. If `git status` shows uncommitted changes you did not make, stop and ask. Do not fold them into your commits.

### Clinical wording
12. Preserve research-prototype and non-diagnostic wording. Never present AI output as validated, diagnostic or a substitute for clinician judgment. Never present a mock/fallback result as real AI output.

## 4. Decisions already made (do not reopen without asking)

- Local **SQLite** via `better-sqlite3` (pinned). No ORM. No repository framework. Plain typed functions in a small `db/` module.
- `zod` (pinned) is approved for request validation. Any other new runtime dependency needs a stated reason in the report. Dev dependencies need a reason too.
- No authentication in this phase. The app is **not suitable for public deployment** without access controls. CORS/Origin checks are not authentication. Do not claim production security.
- The backend patient API is the single source of truth for patients. Frontend mock data leaves the real app path.
- Drug-interaction logic (`drugInteractions.ts`) stays disconnected for now. Do not wire it in, extend it or describe it as working.
- Blind-Spot VOI (`voi-engine/`) is a later project. Do not start it.

## 5. UI protection rules

The UI is well designed and approved. **Do not redesign, restyle, reorganize or rename anything visual.**
- Allowed UI changes are only those the task prompt lists. For each, reuse existing components, Tailwind tokens, spacing and patterns.
- Do not change existing markup/classes except where required to wire data or add the listed element.
- Lint/type fixes must be visually neutral.
- In the report, list every frontend file touched and classify each change as `wiring-only`, `new element`, `text-only` or `lint-only`.
- If a needed change does not fit the allowed list, stop and ask.

## 6. Engineering standards

- TypeScript strict. No `any` unless unavoidable (then comment why). Small focused functions. Comments only where the intent is not obvious.
- Keep routes thin (transport + validation), put rules in small service/db functions, keep provider code in `backend/src/ai-engine/`.
- Preserve existing API response shapes. Changes are **additive** unless the task prompt says otherwise. Record every endpoint's before/after contract in the report.
- Error responses: `{ "error": "<message>", "code": "<MACHINE_CODE>", "details"?: {...} }`. Never leak stack traces, file paths or transcript text.
- Validate all external input (HTTP bodies, query params, WebSocket messages, env vars).
- Pin new dependency versions exactly (no `^`/`~`). Do not upgrade unrelated packages. Avoid broad lockfile churn.
- Scripts must work on Windows, macOS and Linux (no bash-only npm scripts).
- Do not change the LLM prompt text (including the phonetic guard and context-compression rules) unless the task says so.

## 7. Testing and verification

- Use Node's built-in test runner (`node:test`) unless the task says otherwise. Add a TS runner (e.g. `tsx`) only if the backend does not already have one, and say why.
- Tests must be deterministic, offline and use temporary databases (`:memory:` or a temp file). Never touch real data directories.
- Write tests for behavior (inputs/outputs, lifecycle, failure paths), not implementation details.
- Before declaring a phase done, run: backend typecheck/build, backend tests, frontend lint, frontend build, plus the phase's smoke checks. Report counts (passed/failed/skipped).
- Pre-existing failures are not yours to hide. Report them separately from regressions you cause.

## 8. Reporting

- Maintain `IMPLEMENTATION_REPORT.md` at the repo root. Update it after every phase, using the structure in the task prompt. Commit it.
- Report: files changed and why, decisions and deviations, issues faced (cause, resolution or status), commands actually run with results, remaining problems, and questions for me.
- Be honest about what you could not verify (for example, anything that needs a real browser or live provider).

## 9. Stop and ask when

- A required change is outside the approved scope or the UI allowed list.
- A dependency fails to install or build (for example the native SQLite driver). Do not silently switch technology.
- Data would be lost, overwritten or ambiguous (conflicting records, malformed files, a migration check that fails).
- Pre-existing uncommitted changes would be touched.
- Requirements conflict, or the code differs materially from the task description.

## 10. Commands (verify, then keep this section accurate)

Fill in or correct these after inspecting `package.json` files. Known so far:
- Frontend lint: `cd frontend && npm run lint` (had 20 errors / 13 warnings at the discovery baseline).
- Backend tests: no suite existed at the discovery baseline (`npm test` was a placeholder that exits with an error).
- Backend dev/start/build commands: `TODO: confirm from backend/package.json`.
- Frontend dev/build commands: `TODO: confirm from frontend/package.json`.