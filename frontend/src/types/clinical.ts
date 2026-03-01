export interface Patient {
    id: string;
    name: string;
    age: number;
    gender: string;
    bloodGroup: string;
    conditions: string[];
    medications: string[];
    allergies: string[];
    lastAbnormalLab: string;
    visitReason: string;
    status: "waiting" | "in-progress" | "completed";
}

export interface TranscriptMessage {
    role: "doctor" | "patient";
    text: string;
    timestamp: string;
}

export interface AlertData {
    id: string;
    type: "drug-interaction" | "allergy" | "lab-critical" | string;
    title: string;
    severity: "high" | "medium" | "low";
    sourceSentence: string;
    medications: string[];
    reasoning: string;
    confidence: "High" | "Medium" | "Low";
    timestamp: string;
}

export interface SOAPData {
    subjective: string[];
    objective: string[];
    assessment: string[];
    plan: string[];
}
