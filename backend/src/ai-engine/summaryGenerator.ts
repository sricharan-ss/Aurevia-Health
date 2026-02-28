import { TranscriptChunk } from '../types';

export function generateSummary(chunks: TranscriptChunk[]): string {
    if (chunks.length === 0) return "No consultation data recorded.";

    return `Consultation handled ${chunks.length} interaction(s). The physician evaluated the patient symptoms and a preliminary plan has been formed.`;
}
