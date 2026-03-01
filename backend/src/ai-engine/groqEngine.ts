import Groq from "groq-sdk";
import { Patient, ConsultationResponse, TranscriptChunk, SOAPNote } from "../types";

export class GroqEngine {
    private groq: Groq | null = null;

    private getClient(): Groq | null {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey || apiKey === 'YOUR_GROQ_KEY_HERE') {
            return null;
        }

        if (!this.groq) {
            this.groq = new Groq({
                apiKey: apiKey,
            });
        }
        return this.groq;
    }

    /**
     * Processes a live transcript chunk to provide clinical insights using Groq
     */
    async processLiveChunk(newChunks: TranscriptChunk[], patient: Patient, previousSummary?: ConsultationResponse): Promise<Partial<ConsultationResponse>> {
        const client = this.getClient();
        if (!client) {
            return this.getMockLiveInsights("Groq API key missing");
        }

        try {
            const modelName = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
            const transcriptDelta = newChunks.map(t => `${t.speaker.toUpperCase()}: ${t.text}`).join("\n");

            // ARCHITECTURAL PROTECTION: Check if the summary is getting too long (> 250 words)
            const summaryWordCount = previousSummary?.patientSummary.split(/\s+/).length || 0;
            const isCompressionNeeded = summaryWordCount > 250;

            const patientContext = `
            PATIENT CONTEXT:
            Conditions: ${patient.conditions.join(", ")}
            Current Medications: ${patient.medications.join(", ")}
            Allergies: ${patient.allergies.join(", ")}
            `;

            const previousStateText = previousSummary
                ? `PREVIOUS AI STATE:
                   SOAP: ${JSON.stringify(previousSummary.soap)}
                   SUMMARY (Length: ${summaryWordCount} words): ${previousSummary.patientSummary}`
                : "NO PREVIOUS STATE (START OF CONSULTATION)";

            const prompt = `
            You are a clinical decision support assistant. You MUST maintain a persistent and growing SOAP note for this consultation.
            ${patientContext}
            ${previousStateText}

            NEW CONVERSATION LINES (LAST 30 SECONDS):
            ${transcriptDelta}

            STABILITY & ACCUMULATION RULES:
            1. ACCUMULATE: Your response must include the COMPLETE, CUMULATIVE SOAP note starting from the beginning of the consultation.
            2. EVIDENCE RULE: Every item added to the 'Assessment' or 'Plan' MUST have direct evidence or a logical trigger from the LIVE_TRANSCRIPT. However, you MAY include high-level baseline assessments from the patient's record (${patientContext}) if they are relevant to the visit reason or could be impacted by the current encounter.
            3. PHONETIC GUARD: Cross-reference phonetic matches (e.g., patient name 'Sharma' vs condition 'Asthma') against the speaker's intent. Do not assume a condition based on name sound alone unless explicitly stated as a complaint.
            4. PERSISTENCE: Do NOT remove or shorten existing medical facts (subjective symptoms, history, potential diagnoses) from the previous SOAP state unless they are explicitly corrected by the NEW CONVERSATION LINES.
            5. PROACTIVE PLAN: Do not merely wait for the doctor to state a plan. Based on the 'Assessment' and 'Patient History', suggest clinically sound next steps, potential remedies, or diagnostic tests in the 'Plan' section. Prefix these suggestions with '(Suggested)' if not explicitly stated by the doctor yet.
            6. ${isCompressionNeeded ? "CRITICAL: The summary is reaching its length limit. COMPRESS it now into a super-concise structured summary while preserving all 100% of the medical facts. Use medical shorthand (e.g., 'pt' for patient, 'dx' for diagnosis) if needed." : "Refine and update based on the new lines."}

            TASK:
            1. Update and RE-OUTPUT the FULL cumulative SOAP note (Subjective, Objective, Assessment, Plan) including all previous facts and new data from the latest lines.
            2. Refine the 1-sentence patient summary (Capped at 50 words).
            3. Detect any NEW clinical alerts (drug interactions, allergies vs PATIENT CONTEXT, red flags).
            4. Suggest 2 relevant follow-up questions for the doctor.
            
            Return exactly a JSON object (no markdown) with this structure:
            {
              "suggestedQuestions": ["string"],
              "potentialAlerts": [
                {
                  "title": "string",
                  "severity": "low" | "medium" | "high",
                  "reasoning": "string"
                }
              ],
              "liveSummary": "string",
              "soap": {
                "subjective": ["string"],
                "objective": ["string"],
                "assessment": ["string"],
                "plan": ["string"]
              }
            }
            `;

            const response = await client.chat.completions.create({
                model: modelName,
                messages: [
                    { role: "system", content: "You are a clinical decision support assistant. You MUST respond with a valid JSON object only. Do not include any text outside the JSON." },
                    { role: "user", content: prompt }
                ],
                response_format: { type: "json_object" }
            });

            const content = response.choices[0].message.content || "{}";
            console.log(`[GroqEngine] Raw Response (${modelName}):`, content);

            const parsed = JSON.parse(content);

            // Normalize response fields (AI sometimes uses different keys)
            const suggestedQuestions = parsed.suggestedQuestions || parsed.questions || [];
            const potentialAlerts = parsed.potentialAlerts || parsed.alerts || [];
            const liveSummary = parsed.liveSummary || parsed.summary || "";

            return {
                soap: parsed.soap || { subjective: [], objective: [], assessment: [], plan: [] },
                suggestedQuestions: suggestedQuestions,
                alerts: potentialAlerts.map((a: any, index: number) => ({
                    id: `live-alert-${Date.now()}-${index}`,
                    type: "Clinical Insight",
                    title: a.title || "Observation",
                    severity: a.severity || "low",
                    reasoning: a.reasoning || "Detected in transcript.",
                    confidence: "High",
                    timestamp: new Date().toISOString()
                })),
                patientSummary: liveSummary
            };
        } catch (err: any) {
            console.error("Groq Error (Live):", err);
            return this.getMockLiveInsights(err.toString());
        }
    }

    /**
     * Generates a final SOAP note and narrative summary from the full transcript using Groq.
     * Includes patient context for better accuracy in medications and warnings.
     */
    async generateFinalReport(transcript: TranscriptChunk[], patient: Patient): Promise<{ soap: SOAPNote, aiSummary: any }> {
        const client = this.getClient();
        if (!client) {
            return this.getMockFinalReport("Groq API key missing");
        }

        try {
            const modelName = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
            const transcriptText = transcript.map(t => `${t.speaker.toUpperCase()}: ${t.text}`).join("\n");

            const patientContext = `
            PATIENT CONTEXT:
            Conditions: ${patient.conditions.join(", ")}
            Current Medications: ${patient.medications.join(", ")}
            Allergies: ${patient.allergies.join(", ")}
            `;

            const prompt = `
            Analyze this clinical transcript and generate a structured SOAP note and AI narrative.
            ${patientContext}

            [TRANSCRIPT]
            ${transcriptText}

            RULES FOR THE FINAL REPORT:
            1. SYNTHESIZE: Provide a professional, structured clinical document.
            2. EVIDENCE RULE: Only list active assessments and plans discussed or evidenced in this specific transcript. If a patient condition is in their history (${JSON.stringify(patient.conditions)}) but was NOT addressed in this consultation, do NOT include it in the 'Assessment' unless it directly impacted a decision made today.
            3. PHONETIC GUARD: Do not confuse patient identity (e.g., 'Sharma') with clinical conditions (e.g., 'Asthma') based on phonetic overlap.
            4. ACCURACY: Carefully classify medications as "New", "Continue", or "Discontinued" based on the conversation and existing meds.
            5. PROACTIVE PLAN: Based on the clinical findings, provide concrete recommendations, remedies, and follow-up steps in the 'Plan' section. If a remedy is a standard medical suggestion for the finding but wasn't explicitly mentioned by the doctor, include it to assist the clinical flow.
            6. SAFETY: Identify warnings based on current transcript vs patient's allergies/existing conditions.

            Return exactly a JSON object (no markdown) with this structure:
            {
              "soap": {
                "subjective": ["string"],
                "objective": ["string"],
                "assessment": ["string"],
                "plan": ["string"]
              },
              "aiSummary": {
                "narrative": "string",
                "medications": ["string"],
                "warnings": ["string"]
              }
            }
            `;

            const response = await client.chat.completions.create({
                model: modelName,
                messages: [
                    { role: "system", content: "You are a clinical decision support assistant. You MUST respond with a valid JSON object only. Do not include any text outside the JSON." },
                    { role: "user", content: prompt }
                ],
                response_format: { type: "json_object" }
            });

            const content = response.choices[0].message.content || "{}";
            const parsed = JSON.parse(content);

            return {
                soap: parsed.soap,
                aiSummary: parsed.aiSummary
            };
        } catch (err: any) {
            console.error("Groq Error (Final):", err);
            return this.getMockFinalReport(err.toString());
        }
    }

    private getMockLiveInsights(errStr?: string): Partial<ConsultationResponse> {
        return {
            soap: {
                subjective: [],
                objective: [],
                assessment: [],
                plan: []
            },
            suggestedQuestions: ["Error: Groq AI connection failed"],
            alerts: [],
            patientSummary: `Groq AI is currently unavailable. Error: ${errStr || "None"}`
        };
    }

    private getMockFinalReport(errStr?: string): { soap: SOAPNote, aiSummary: any } {
        return {
            soap: {
                subjective: ["Consultation finished"],
                objective: ["See live transcript"],
                assessment: ["Needs manual review"],
                plan: ["Final AI generation failed"]
            },
            aiSummary: {
                narrative: `Generation failed. Error: ${errStr}`,
                medications: [],
                warnings: ["Groq Engine Error"]
            }
        };
    }
}

export const groqEngine = new GroqEngine();
