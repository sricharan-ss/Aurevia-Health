import { Patient, TranscriptChunk } from '../types';

export function checkDrugInteractions(patient: Patient, chunks: TranscriptChunk[]): string[] {
    const alerts: string[] = [];

    // Rule: Patient takes "Warfarin" and doctor prescribes "Aspirin"
    const takesWarfarin = patient.medications.some(m => m.toLowerCase().includes('warfarin'));

    if (takesWarfarin) {
        const mentionsAspirin = chunks.some(chunk => chunk.text.toLowerCase().includes('aspirin'));
        if (mentionsAspirin) {
            alerts.push("High Risk Interaction: Aspirin increases bleeding risk when taken with Warfarin.");
        }
    }

    return alerts;
}
