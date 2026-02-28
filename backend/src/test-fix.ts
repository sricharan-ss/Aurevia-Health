import { geminiEngine } from "./ai-engine/geminiEngine";
import { TranscriptChunk } from "./types";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function testFinalReport() {
    const mockTranscript: TranscriptChunk[] = [
        { speaker: "doctor", text: "Hello, how are you feeling today?", timestamp: "10:00" },
        { speaker: "patient", text: "I have a bit of a cough and a sore throat.", timestamp: "10:01" },
        { speaker: "doctor", text: "Any fever?", timestamp: "10:02" },
        { speaker: "patient", text: "No, just the throat.", timestamp: "10:02" }
    ];

    console.log("Testing final report generation with gemini-2.0-flash...");
    try {
        const report = await geminiEngine.generateFinalReport(mockTranscript);
        console.log("Report generated successfully!");
        console.log("SOAP Note:", JSON.stringify(report.soap, null, 2));
        console.log("AI Summary:", JSON.stringify(report.aiSummary, null, 2));
    } catch (error) {
        console.error("Test failed:", error);
    }
}

testFinalReport();
