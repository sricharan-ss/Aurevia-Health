export interface Patient {
    id: string;
    name: string;
    conditions: string[];
    medications: string[];
    allergies: string[];
    lastAbnormalLab: string;
    visitReason: string;
}

export interface TranscriptChunk {
    speaker: "doctor" | "patient";
    text: string;
}

export interface SOAPNote {
    subjective: string[];
    objective: string[];
    assessment: string[];
    plan: string[];
}

export interface ConsultationResponse {
    soap: SOAPNote;
    alerts: string[];
    patientSummary: string;
}
