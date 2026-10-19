Aurevia Health - Architectural Review
1. Codebase Mapping
Major Modules and Packages
backend/: Node.js/Express application serving as the API and orchestration layer for all AI models and logic.
backend/src/ai-engine/: Contains the core intelligence integrations, including Groq LLM processing (groqEngine.ts), Deepgram STT WebSocket proxy (deepgramLive.ts), and static drug interaction rules (drugInteractions.ts).
backend/src/controllers/: Handles incoming HTTP requests for consultations and patient data routing.
backend/src/data/: Functions as the JSON-based file persistence layer (mock database) storing patients and finalized consultation reports.
backend/src/routes/: Defines the Express REST endpoints (/api/patients, /api/consultation).
frontend/: Next.js web application providing the clinical dashboard and consultation UI.
frontend/src/app/: Implements the Next.js App Router structure, housing the main layouts, login redirect, and dashboard pages.
frontend/src/components/: Reusable React UI components (e.g., AudioRecorder.tsx for capturing mics, SOAPPanel.tsx for rendering live notes).
Entry Points
Backend: backend/src/index.ts is the main entry point, instantiating both the Express HTTP server and the ws WebSocket server on port 3001.
Frontend: frontend/src/app/page.tsx is the root, which simply redirects to /login. The main app shell is managed in frontend/src/app/(app)/layout.tsx.
Workers/Cron: There are no background workers, message queues, or cron jobs in the system.
Tech Stack
Frontend: Next.js 16.1.6, React 19.2.3, TailwindCSS v4, jsPDF 4.2.0 (for client-side PDF export), date-fns.
Backend: Node.js, Express 5.2.1, WebSocket (ws 8.19.0), Multer 2.1.0, Groq SDK 0.37.0, dotenv.
AI Integrations: Groq (LLaMA-3.3-70b-versatile) for reasoning, Deepgram (Nova-2) for live STT.
2. Data Flow and Architecture
Short Architecture Summary
Aurevia Health utilizes a decoupled client-server architecture. A Next.js frontend captures live audio from the user's microphone and streams it to a Node.js Express backend over WebSockets. The backend proxies this audio stream to Deepgram for real-time diarized transcription, returning text to the frontend. Simultaneously, the frontend buffers this transcript and sends it in 30-second batches via HTTP POST to the backend. The backend uses a stateful orchestration pattern with Groq (LLaMA 3.3 70B) to incrementally build a cumulative SOAP note and generate clinical alerts by cross-referencing the conversation against local JSON patient records. All state during an active session is held in memory, and the final clinical report is flushed to a JSON file system.

Request Lifecycle
Input Entry: Microphone audio is captured via navigator.mediaDevices.getUserMedia in frontend/src/components/AudioRecorder.tsx.
Streaming & STT: The frontend opens a WebSocket to ws://localhost:3001/api/consultation/live. The backend deepgramLive.ts proxies this to Deepgram (wss://api.deepgram.com/v1/listen). Deepgram streams back diarized transcript chunks which are relayed to the frontend.
Accumulation & Processing: The frontend buffers the transcripts and hits the backend POST /api/consultation/process every 30 seconds.
AI Orchestration: The consultationController.ts updates its in-memory dictionary (activeConsultations) and passes the delta to groqEngine.ts. Groq performs incremental generation, returning updated SOAP notes, alerts, and summaries.
Finalization: On consultation end, the frontend calls POST /api/consultation/end. The backend instructs Groq to generate a final report and persists the complete payload to backend/src/data/consultations/{id}.json.
Component Breakdown
Component Name	Responsibility	Key Files	External/Internal Communications
Audio Recorder (FE)	Captures audio, manages local UI buffers	AudioRecorder.tsx	Talks to Backend (WS & HTTP POST)
Live Layout (FE)	Manages consultation state UI	LiveConsultationLayout.tsx	Talks to Backend (REST API)
Consultation API (BE)	HTTP Handlers for start/process/end	consultationController.ts	Talks to AI Engine, File System DB
Groq Engine (BE)	Stateful AI Agent for SOAP and insights	groqEngine.ts	Talks to Groq REST API
Deepgram Proxy (BE)	WebSocket handler for live STT	deepgramLive.ts	Talks to Deepgram WS API, Frontend WS
File DB (BE)	JSON persistence layer	patients.json, data/consultations/	Read/Written directly by Controllers
Architecture Diagram
Mermaid diagram
External Dependencies / APIs Integrated
Groq API: Specifically utilizes groq-sdk. Integrated in backend/src/ai-engine/groqEngine.ts.
Deepgram API: Specifically connects to wss://api.deepgram.com/v1/listen?model=nova-2&diarize=true. Integrated natively via the ws package in backend/src/ai-engine/deepgramLive.ts.
Architectural Gaps and TODOs
Hardcoded API Endpoints: The frontend components (e.g., AudioRecorder.tsx, LiveConsultationLayout.tsx) hardcode http://localhost:3001 and ws://localhost:3001 instead of using environment variables. This prevents production deployment without code changes.
State Management (In-Memory): Active consultation sessions (activeConsultations) are stored in an in-memory dictionary on the Node.js server. If the server restarts, all live sessions are lost. It also limits horizontal scaling.
Branding/Copy Mismatch: The UI in AudioRecorder.tsx renders "Gemini Reasoning..." during processing, but the backend is wired to Groq / LLaMA.
Race Conditions: The frontend triggers a POST process request every 30 seconds. If Groq API latency spikes and takes >30 seconds, concurrent writes could corrupt the cumulative SOAP state.
File-System DB: All persistence relies on reading and writing JSON files on the local disk. There is no traditional DBMS (Postgres/Mongo) and no migration mechanism.
3. Environment Variables
The codebase expects environment variables for the backend server. There is no .env.example or .env.sample file currently present in the repository.

Setup Checklist
The .env file must be placed in the backend/ folder (i.e., backend/.env). This is because dotenv.config() is invoked in backend/src/index.ts without explicit file paths, and the backend scripts are run from the backend/ directory root.

The frontend (frontend/) does not use any environment variables.

Create a backend/.env file with the following variables:

 GROQ_API_KEY
Used In: backend/src/ai-engine/groqEngine.ts
Purpose: API Key to authenticate with the Groq API for generating SOAP notes and summaries.
Required: Yes (If missing, the app gracefully degrades to a "mock mode" and returns hardcoded text instead of AI responses).
 DEEPGRAM_API_KEY
Used In: backend/src/ai-engine/deepgramLive.ts
Purpose: API Key to authenticate with Deepgram for live WebSocket speech-to-text.
Required: Yes (If missing, the app falls back to injecting a mock transcript error message).
 PORT
Used In: backend/src/index.ts
Purpose: Sets the port for the backend Express server.
Required: Optional. Defaults to 3001 if omitted.
 GROQ_MODEL
Used In: backend/src/ai-engine/groqEngine.ts
Purpose: Allows overriding the default Groq LLM model.
Required: Optional. Defaults to llama-3.3-70b-versatile if omitted.