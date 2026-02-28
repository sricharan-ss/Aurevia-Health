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
    timestamp?: string;
}

export interface Alert {
    id: string;
    type: string;
    severity: "low" | "medium" | "high";
    title: string;
    medications: string[];
    sourceSentence: string;
    reasoning: string;
    confidence: "High" | "Medium" | "Low";
    timestamp: string;
}

export interface SOAPNote {
    subjective: string[];
    objective: string[];
    assessment: string[];
    plan: string[];
}

export interface ConsultationState {
    patientId: string | null;
    transcript: TranscriptChunk[];
    doctorPrescriptions: string[];
    extractedSymptoms: string[];
    lastAIPushSummary?: ConsultationResponse; // Rolling state for delta updates
}

export interface ConsultationResponse {
    soap: SOAPNote;
    alerts: Alert[];
    patientSummary: string;
    suggestedQuestions: string[];
}
