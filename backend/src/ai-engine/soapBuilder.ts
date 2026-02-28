import { TranscriptChunk, SOAPNote } from '../types';

export function buildSOAP(chunks: TranscriptChunk[]): SOAPNote {
    // Hackathon mock: Trivial extraction based on simple heuristics
    const subjective: string[] = [];
    const objective: string[] = [];
    const assessment: string[] = [];
    const plan: string[] = [];

    for (const chunk of chunks) {
        const text = chunk.text.toLowerCase();

        if (chunk.speaker === 'patient') {
            if (text.includes('pain') || text.includes('feel') || text.includes('headache')) {
                subjective.push(chunk.text);
            }
        } else if (chunk.speaker === 'doctor') {
            if (text.includes('pressure') || text.includes('rate') || text.includes('exam')) {
                objective.push(chunk.text);
            }
            if (text.includes('looks like') || text.includes('seems') || text.includes('diagnosis')) {
                assessment.push(chunk.text);
            }
            if (text.includes('prescribe') || text.includes('take') || text.includes('follow up')) {
                plan.push(chunk.text);
            }
        }
    }

    return {
        subjective: subjective.length ? subjective : ["Patient reports general discomfort."],
        objective: objective.length ? objective : ["Vitals stable. No acute distress."],
        assessment: assessment.length ? assessment : ["Pending further evaluation."],
        plan: plan.length ? plan : ["Continue current regimen. Follow up as needed."]
    };
}
