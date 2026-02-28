# Aurevia Health Backend

This is the Node.js/Express backend for the Aurevia Health application. It uses an in-memory database and handles mock intelligence parsing for the consultation pipelines.

## Role Division

### 1) Intelligence Engineer Responsibilities
Focuses on the clinical intelligence and natural language processing:
- **Entity extraction:** Pulling out symptoms, conditions, or key entities from the consultation transcript.
- **SOAP builder** (`src/ai-engine/soapBuilder.ts`): Synthesizing unstructured conversation chunks into Subjective, Objective, Assessment, and Plan points.
- **Drug interaction logic** (`src/ai-engine/drugInteractions.ts`): Identifying potential harmful interactions (e.g., Aspirin + Warfarin risk).
- **Summary generator** (`src/ai-engine/summaryGenerator.ts`): Creating overarching patient interaction summaries.
- **Transcription with Diarization** (`src/ai-engine/transcription.ts`): Handles parsing/processing uploaded audio buffers into structured `[doctor, patient]` dialogue chunks.

### 2) Backend Engineer Responsibilities
Focuses on the foundational infrastructure:
- **Express setup** (`src/index.ts`): Bootstrapping Express with CORS, JSON body parsers, and static routes.
- **Routing** (`src/routes/`): Exposing RESTful HTTP endpoints for patients and consultations.
- **Controllers** (`src/controllers/`): Tying the HTTP requests, AI Engine, and Data mock repositories together.
- **State management**: Tracking `activeConsultations` locally in memory to simulate a live transcript session.

## API Documentation

### Patients
- `GET /api/patients` - Retrieve all mock patients.
- `GET /api/patient/:id` - Retrieve a specific patient profile.

### Consultation
- `POST /api/consultation/start` - Initialize/reset an array for the live consultation state.  
  _Body: `{ "patientId": "..." }`_
- `POST /api/consultation/transcribe` - Accepts audio via `multipart/form-data` with field `audio` and returns a mock-diarized transcript array.
- `POST /api/consultation/process` - Process a live transcript chunk and run intelligence pipelines.  
  _Body: `{ "patientId": "...", "speaker": "doctor"|"patient", "text": "..." }`_  
  _Returns: `{ soap, alerts, patientSummary }`_

## How to run
\`\`\`bash
npm install
npm run dev
\`\`\`
Server starts on port \`3001\`.
