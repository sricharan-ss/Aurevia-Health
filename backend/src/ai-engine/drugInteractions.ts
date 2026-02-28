import { Patient, ConsultationState, Alert } from '../types';

export function checkDrugInteractions(patient: Patient, state: ConsultationState): Alert[] {
    const alerts: Alert[] = [];
    const transcriptText = state.transcript.map(t => t.text.toLowerCase()).join(" ");

    // Rule: Patient takes "Warfarin" and doctor prescribes "Aspirin"
    const takesWarfarin = patient.medications.some(m => m.toLowerCase().includes('warfarin'));
    const prescribesAspirin = state.doctorPrescriptions.some(m => m.toLowerCase().includes('aspirin'));

    if (takesWarfarin && prescribesAspirin) {
        // Find the source sentence where Aspirin was mentioned
        const sourceChunk = state.transcript.find(t => t.text.toLowerCase().includes('aspirin'));

        alerts.push({
            id: `ALT-${Date.now()}`,
            type: "drug-interaction",
            severity: "high",
            title: "High Risk Drug Interaction",
            medications: ["Warfarin (Current)", "Aspirin (Proposed)"],
            sourceSentence: sourceChunk?.text || "Prescription of Aspirin mentioned.",
            reasoning: "Aspirin increases bleeding risk when combined with Warfarin. The patient is already on Warfarin for Atrial Fibrillation.",
            confidence: "High",
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
        });
    }

    return alerts;
}
