import { GoogleGenerativeAI } from "@google/generative-ai";
import { ConsultationResponse, TranscriptChunk, SOAPNote, Alert } from "../types";

// Removed module-level genAI initialization to ensure environment variables are loaded first.

export class GeminiEngine {
    /**
     * Processes a live transcript chunk to provide clinical insights
     */
    async processLiveChunk(transcript: TranscriptChunk[]): Promise<Partial<ConsultationResponse>> {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey === 'YOUR_GEMINI_KEY_HERE') {
            return this.getMockLiveInsights();
        }

        const genAI = new GoogleGenerativeAI(apiKey);

        try {
            const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash";
            const model = genAI.getGenerativeModel({ model: modelName });
            const transcriptText = transcript.map(t => `${t.speaker.toUpperCase()}: ${t.text}`).join("\n");

            const prompt = `
            You are a clinical decision support assistant.
            Analyze the following doctor-patient conversation segment:

            ${transcriptText}

            Return exactly a JSON object (no markdown, no extra text) with this structure:
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
        } catch (err) {
            console.error("Gemini Error (Final):", err);
            return this.getMockFinalReport();
        }
    }

    private getMockLiveInsights(errStr?: string): Partial<ConsultationResponse> {
        return {
            soap: {
                subjective: ["Patient reports symptoms"],
                objective: ["Vitals pending"],
                assessment: ["Needs further evaluation"],
                plan: ["Continue mock monitoring"]
            },
            suggestedQuestions: ["How long have you felt this way?", "Does anything make it better?"],
            alerts: [],
            patientSummary: `Patient is describing symptoms. AI is in mock mode. Error: ${errStr || "None"}`
        };
    }

    private getMockFinalReport(): { soap: SOAPNote, aiSummary: any } {
        return {
            soap: {
                subjective: ["Patient reports chest pain"],
                objective: ["Vitals stable"],
                assessment: ["Rule out GERD"],
                plan: ["ECG ordered"]
            },
            aiSummary: {
                narrative: "The patient presented with symptoms and the doctor suggested follow-up tests.",
                medications: [],
                warnings: ["Awaiting lab results"]
            }
        };
    }
}

export const geminiEngine = new GeminiEngine();
