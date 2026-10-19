1. Product Vision & Core UX Philosophy
Aurevia Health is designed as an ambient clinical AI assistant. During a typical clinic visit, doctors spend up to 50% of their time looking at screens and typing notes rather than looking at the patient.

The UX Goal:
Hands-Free Ambient Listening: The clinician clicks one button to connect the microphone, leaves their device on the desk, and conducts the consultation naturally.
Real-Time Augmented Decision Support: While talking, the doctor can glance at the screen to see live transcriptions, an evolving SOAP note, proactive safety alerts (e.g., drug interactions), and smart suggested follow-up questions.
Instant Post-Visit Documentation: At the end of the visit, the doctor receives a synthesized clinical report, medication reconciliation, and an exportable professional PDF with zero manual typing required.
2. End-to-End User Journey (Step-by-Step UX Flow)
Mermaid diagram
Step 1: Doctor Login & Today's Patient Queue (/dashboard & /patients)
What the Doctor Sees:
A modern, clean medical dashboard displaying today's schedule.
Status badges: Waiting (Amber), In Progress (Blue), and Completed (Green).
Key preview metrics: Patient Name, ID, Age/Gender, Scheduled Time, and Visit Reason (e.g., "Acute exacerbation – chest tightness", "Uncontrolled blood sugar").
Underlying APIs / Services:
Backend REST API: GET /api/patients fetches the patient cohort from the persistence layer (patients.json).
Step 2: Pre-Consultation Patient Snapshot (PatientSnapshot)
What the Doctor Sees:
Before starting the audio capture, the doctor reviews a dedicated clinical snapshot of the selected patient:
Chronic Medical Conditions: (e.g., Type 2 Diabetes, Hypertension, Asthma).
Current Medications: (e.g., Metformin 500mg, Amlodipine 5mg).
Known Allergies: (e.g., Sulfonamides, Aspirin/NSAIDs).
Recent Abnormal Labs: (e.g., HbA1c: 8.2% (elevated), eGFR: 38 mL/min).
UX Benefit: Gives the doctor immediate cognitive context in 5 seconds before greeting the patient.
Step 3: Ambient Live Consultation Workspace (/consultation/live)
When the clinician starts the session, they enter a 3-Pane Real-Time Command Center:



+---------------------------------------------------------------------------------------+
|  Patient: Rajesh Kumar (PT-2024-0891)  |  [Connect Mic]  |  Timer: 04:12  |  (●) LIVE |
+---------------------------+---------------------------+-------------------------------+
|    1. LIVE TRANSCRIPT     |     2. RUNNING SOAP       |      3. COPILOT & SAFETY      |
|                           |                           |                               |
| [09:30] DOCTOR:           | • SUBJECTIVE:             | ⚠️ HIGH RISK DRUG INTERACTION  |
| "How is your blood sugar  |   Patient reports high    |   Warfarin + Aspirin          |
|  running lately?"         |   morning glucose levels. |   [Click to see reasoning]    |
|                           |                           |                               |
| [09:31] PATIENT:          | • OBJECTIVE:              | 💡 SUGGESTED QUESTIONS        |
| "It was 180 this morning, |   Pending exam.           |   "Have you noticed any       |
|  and I feel dizzy."       |                           |    bruising or bleeding?"     |
|                           | • ASSESSMENT:             |                               |
| [09:32] DOCTOR:           |   Uncontrolled DM-2.      | 📝 PATIENT SUMMARY            |
| "Let's check for new meds"|                           |   58yo male with uncontrolled |
|                           | • PLAN:                   |   glucose and dizziness.      |
|                           |   Adjust Metformin dose.  |                               |
+---------------------------+---------------------------+-------------------------------+
|                                                           [ End Consultation (Square) ]
+---------------------------------------------------------------------------------------+
The 3 Live Panels:
Left 35% — Live Transcript (TranscriptPanel):
Real-time text stream color-coded by speaker (DOCTOR vs. PATIENT) with exact timestamps.
Center 35% — Cumulative SOAP Note (SOAPPanel):
Automatically organizes conversation points into Subjective (symptoms), Objective (vital signs/labs), Assessment (diagnoses), and Plan (treatments/tests).
Incrementally grows and refines every 30 seconds as the doctor and patient speak.
Right 30% — Clinical Copilot & Safety Sentinel (CopilotPanel):
Proactive Safety Alerts: Highlights drug-drug interactions, allergy conflicts, and diagnostic red flags in real-time.
Intelligent Follow-Up Suggestions: Recommends 2 context-aware questions the clinician can ask to rule out complications.
Live 1-Sentence Summary: Provides an instant elevator pitch of the visit state.
Step 4: Explainability & Hallucination Guard (ExplainabilityModal)
Doctor Action: If an alert pops up (e.g., "High Risk Drug Interaction"), the doctor clicks the card.
What the Doctor Sees in the Modal:
AI Confidence Level: (e.g., High, Medium).
Direct Evidence Quote: Exact verbatim sentence from the transcript that triggered the alert (e.g., "Patient states: 'I started taking Aspirin yesterday for the headaches'").
Medications Involved: Tags both the active med (Warfarin) and proposed med (Aspirin).
Clinical Reasoning: Detailed pharmacological explanation of why combining them increases bleeding risk.
UX Benefit: Prevents black-box AI distrust; clinicians can verify the clinical reasoning and dismiss or acknowledge the alert.
Step 5: Ending Consultation & Post-Visit Summary (/consultation/summary)
Doctor Action: Clinician clicks "End Consultation".
What the System Does: The backend feeds the entire consultation dialogue and patient baseline context to Groq to generate a final structured medical summary.
What the Doctor Reviews:
Narrative Overview: Professional prose summary of what occurred.
Medication Reconciliation Table: Categorized into New, Continue, and Discontinued medications.
Clinical Safety Warnings: Summary of all flagged contraindications.
Final SOAP Note: Ready for review and sign-off.
Action Buttons:
Download PDF Report: One-click generation of a branded consultation document via jsPDF.
Return to Hub: Archives the report in the system and returns to the patient queue.
Step 6: Consultation History Hub (/consultation)
What the Doctor Sees:
An indexed archive of all historical consultations.
Searchable by patient name, ID, or diagnosis.
Clicking any past visit loads the historical report, notes, and transcript.
3. Services, APIs, and Technologies Used
Layer	Service / Library	Role in User Experience
Audio Capture	Web Audio API (MediaRecorder)	Captures microphone audio in the browser in 500ms slices without installing desktop software.
Live Speech-to-Text	Deepgram Nova-2 API (via WebSocket)	Transcribes spoken words in real-time with speaker diarization (identifying Doctor vs. Patient automatically).
Clinical Intelligence	Groq API (qwen/qwen3.8-27b / LLaMA)	Provides low-latency incremental reasoning to build SOAP notes, detect safety alerts, and generate clinical summaries.
Deterministic Rules	Custom Drug Interaction Engine	Cross-references active medications and known allergies against spoken prescriptions (e.g., Warfarin + Aspirin rule).
Client Framework	Next.js 16 + React 19 + Tailwind CSS	Delivers a fast, responsive UI with dark/light themes, live status counters, and synchronized panels.
PDF Generation	jsPDF + jspdf-autotable	Produces downloadable clinical consultation summaries directly in the browser.
Backend & WS Server	Node.js + Express 5 + ws	Handles REST endpoints and acts as a secure WebSocket proxy between the browser and third-party AI APIs.
Storage / Persistence	JSON File-Based Store	Saves consultation sessions, audit logs, and patient records to backend/src/data/consultations/.
4. Built-in Safety & UX Guardrails
Phonetic Guard: The AI prompt contains explicit rules to prevent phonetic confusion (e.g., ensuring a patient named "Sharma" isn't falsely diagnosed with "Asthma").
Context Compression: If a long consultation causes transcript summaries to exceed 250 words, the backend activates a compression rule to keep the UI clean and avoid token overflows while retaining 100% of medical facts.
Graceful Degradation / Mock Fallback: If the microphone disconnects or an external API key is missing/rate-limited, the UI informs the doctor and falls back to manual text injection without crashing th