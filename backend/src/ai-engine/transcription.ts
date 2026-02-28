import fs from 'fs';
import { TranscriptChunk } from '../types';

/**
 * Handles transcription of uploaded audio file.
 * Preferred (AssemblyAI) could be implemented here. For hackathon, falls back to deterministic mock.
 * @param filePath Path to uploaded audio file
 */
export async function transcribeAudio(filePath: string): Promise<TranscriptChunk[]> {
    // In a real implementation:
    // 1. Upload file to AssemblyAI (or other provider)
    // 2. Poll for results
    // 3. Map speaker labels to "doctor" | "patient"

    // Clean up the temporary file immediately (or after processing)
    if (fs.existsSync(filePath)) {
        try {
            // fs.unlinkSync(filePath);
            console.log(`\n\n[VERIFICATION] Your recorded audio was saved successfully at: ${filePath}\n\n`);
        } catch (e) {
            console.error("Failed to delete temp file", e);
        }
    }

    // --- Hackathon Mock Diarization ---
    // If we wanted to parse actual spoken text we would need an API Key.
    // Given no key, we simulate diarization deterministically:
    return [
        { speaker: "doctor", text: "How long have you had this pain?" },
        { speaker: "patient", text: "For about three days. It started right after my morning routine." },
        { speaker: "doctor", text: "Are you taking any new medications, like Aspirin?" },
        { speaker: "patient", text: "Yes, I started taking Aspirin yesterday for the headaches." }
    ];
}
