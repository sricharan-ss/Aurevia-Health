import { GoogleGenerativeAI } from "@google/generative-ai";
import { ConsultationResponse, TranscriptChunk, SOAPNote, Alert } from "../types";

// Removed module-level genAI initialization to ensure environment variables are loaded first.

export class GeminiEngine {
    /**
     * Processes a live transcript chunk to provide clinical insights
     */
    async processLiveChunk(newChunks: TranscriptChunk[], previousSummary?: ConsultationResponse): Promise<Partial<ConsultationResponse>> {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey === 'YOUR_GEMINI_KEY_HERE') {
            return this.getMockLiveInsights();
        }

        const genAI = new GoogleGenerativeAI(apiKey);

        try {
            const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash";
            const model = genAI.getGenerativeModel({ model: modelName });

            const transcriptDelta = newChunks.map(t => `${t.speaker.toUpperCase()}: ${t.text}`).join("\n");

            // ARCHITECTURAL PROTECTION: Check if the summary is getting too long (> 250 words)
            const summaryWordCount = previousSummary?.patientSummary.split(/\s+/).length || 0;
            const isCompressionNeeded = summaryWordCount > 250;

            const previousStateText = previousSummary
                ? `PREVIOUS AI STATE:
                   SOAP: ${JSON.stringify(previousSummary.soap)}
                   SUMMARY (Length: ${summaryWordCount} words): ${previousSummary.patientSummary}`
                : "NO PREVIOUS STATE (START OF CONSULTATION)";

            const prompt = `
            You are a clinical decision support assistant.
            ${previousStateText}

            NEW CONVERSATION LINES (LAST 30 SECONDS):
            ${transcriptDelta}

            STABILITY RULES:
            1. Do NOT remove existing stable medical facts (diagnoses, confirmed medications, history).
            2. Only update a section if new information expands on it or explicitly corrects it.
            3. ${isCompressionNeeded ? "CRITICAL: The summary is reaching its length limit. COMPRESS it now into a super-concise structured summary while preserving all 100% of the medical facts. Use medical shorthand (e.g., 'pt' for patient, 'dx' for diagnosis) if needed." : "Refine and update based on the new lines."}

            TASK:
            1. Update the existing SOAP note based ONLY on the NEW conversation lines.
            2. Refine the 1-sentence patient summary (Capped at 50 words).
            3. Detect any NEW clinical alerts (drug interactions, red flags).
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

            const result = await model.generateContent(prompt);
            const response = result.response.text();

            // Basic JSON cleaning
            const cleanedResponse = response.replace(/```json|```/g, "").trim();
            const parsed = JSON.parse(cleanedResponse);

            return {
                soap: parsed.soap || { subjective: [], objective: [], assessment: [], plan: [] },
                suggestedQuestions: parsed.suggestedQuestions || [],
                alerts: (parsed.potentialAlerts || []).map((a: any, index: number) => ({
                    id: `live-alert-${Date.now()}-${index}`,
                    type: "Clinical Insight",
                    title: a.title,
                    severity: a.severity,
                    reasoning: a.reasoning,
                    confidence: "High",
                    timestamp: new Date().toISOString()
                })),
                patientSummary: parsed.liveSummary || ""
            };
        } catch (err: any) {
            console.error("Gemini Error (Live):", err);
            return this.getMockLiveInsights(err.toString());
        }
    }

    /**
     * Generates a final SOAP note and narrative summary from the full transcript
     */
    async generateFinalReport(transcript: TranscriptChunk[]): Promise<{ soap: SOAPNote, aiSummary: any }> {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey === 'YOUR_GEMINI_KEY_HERE') {
            return this.getMockFinalReport();
        }

        const genAI = new GoogleGenerativeAI(apiKey);

        try {
            const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash";
            const model = genAI.getGenerativeModel({ model: modelName });
            const transcriptText = transcript.map(t => `${t.speaker.toUpperCase()}: ${t.text}`).join("\n");

            const prompt = `
            Analyze this clinical transcript and generate a structured SOAP note and AI narrative.
            
            [TRANSCRIPT]
            ${transcriptText}

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

            const result = await model.generateContent(prompt);
            const response = result.response.text();
            const cleanedResponse = response.replace(/```json|```/g, "").trim();
            const parsed = JSON.parse(cleanedResponse);

            return {
                soap: parsed.soap,
                aiSummary: parsed.aiSummary
            };
        } catch (err: any) {
            console.error("Gemini Error (Final):", err);
            return this.getMockFinalReport(err.toString());
        }
    }

    private getMockLiveInsights(errStr?: string): Partial<ConsultationResponse> {
        const isRateLimit = errStr?.includes("429") || errStr?.includes("Quota exceeded");
        const isNotFound = errStr?.includes("404");
        return {
            soap: {
                subjective: [],
                objective: [],
                assessment: [],
                plan: []
            },
            suggestedQuestions: isRateLimit ? ["AI Reasoning Throttled"] : (isNotFound ? ["Error: Model Not Found"] : ["Listening for patient details..."]),
            alerts: [],
            patientSummary: isRateLimit
                ? "Gemini API Quota Exceeded. Clinical reasoning is temporarily paused. Please wait 60 seconds."
                : (isNotFound ? `Model version error (404). Check your .env file. Error: ${errStr}` : `AI is in mock mode. Error: ${errStr || "None"}`)
        };
    }

    private getMockFinalReport(errStr?: string): { soap: SOAPNote, aiSummary: any } {
        const isRateLimit = errStr?.includes("429") || errStr?.includes("Quota exceeded");
        const isNotFound = errStr?.includes("404");
        return {
            soap: {
                subjective: ["Consultation finished"],
                objective: ["See live transcript"],
                assessment: ["Needs manual review"],
                plan: ["Final AI generation was rate-limited or failed"]
            },
            aiSummary: {
                narrative: isRateLimit
                    ? "Summary generation failed due to API rate limits (Gemini 429). The full transcript is available below for manual review."
                    : (isNotFound ? `Generation failed due to incorrect model (404). Error: ${errStr}` : "Mock Summary: The consultation concluded successfully."),
                medications: [],
                warnings: isRateLimit ? ["AI Engine Rate Limited"] : ["Review transcript manually"]
            }
        };
    }
}

export const geminiEngine = new GeminiEngine();
