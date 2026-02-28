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

export const patients: Patient[] = [
    {
        id: "PT-2024-0891",
        name: "Rajesh Kumar",
        age: 58,
        gender: "Male",
        bloodGroup: "B+",
        conditions: ["Type 2 Diabetes Mellitus", "Hypertension Stage II"],
        medications: ["Metformin 500mg BD", "Amlodipine 5mg OD", "Atorvastatin 20mg HS"],
        allergies: ["Sulfonamides"],
        lastAbnormalLab: "HbA1c — 8.2% (elevated)",
        visitReason: "Follow-up – uncontrolled blood sugar",
        status: "waiting",
    },
    {
        id: "PT-2024-0892",
        name: "Priya Sharma",
        age: 34,
        gender: "Female",
        bloodGroup: "O+",
        conditions: ["Asthma (moderate persistent)"],
        medications: ["Budesonide-Formoterol 200/6 mcg BD", "Montelukast 10mg OD"],
        allergies: ["Aspirin", "NSAIDs"],
        lastAbnormalLab: "Eosinophils — 8% (elevated)",
        visitReason: "Acute exacerbation – chest tightness",
        status: "in-progress",
    },
    {
        id: "PT-2024-0893",
        name: "Anand Mehta",
        age: 72,
        gender: "Male",
        bloodGroup: "A+",
        conditions: ["Chronic Kidney Disease Stage 3b", "Atrial Fibrillation"],
        medications: ["Rivaroxaban 15mg OD", "Furosemide 40mg OD", "Losartan 50mg OD"],
        allergies: ["Penicillin"],
        lastAbnormalLab: "eGFR — 38 mL/min (low)",
        visitReason: "Quarterly renal function review",
        status: "waiting",
    },
    {
        id: "PT-2024-0894",
        name: "Sneha Patel",
        age: 45,
        gender: "Female",
        bloodGroup: "AB+",
        conditions: ["Major Depressive Disorder", "Hypothyroidism"],
        medications: ["Sertraline 100mg OD", "Levothyroxine 75mcg OD"],
        allergies: [],
        lastAbnormalLab: "TSH — 6.8 mIU/L (elevated)",
        visitReason: "Medication review – persistent fatigue",
        status: "completed",
    },
    {
        id: "PT-2024-0895",
        name: "Mohammed Ismail",
        age: 63,
        gender: "Male",
        bloodGroup: "O-",
        conditions: ["COPD (GOLD Stage III)", "Osteoarthritis"],
        medications: ["Tiotropium 18mcg OD", "Salbutamol PRN", "Diclofenac 50mg BD"],
        allergies: ["Codeine"],
        lastAbnormalLab: "FEV1 — 42% predicted (severe)",
        visitReason: "Worsening dyspnea on exertion",
        status: "waiting",
    },
    {
        id: "PT-2024-0896",
        name: "Kavitha Reddy",
        age: 29,
        gender: "Female",
        bloodGroup: "B-",
        conditions: ["Iron Deficiency Anemia", "PCOS"],
        medications: ["Ferrous Sulfate 325mg OD", "Metformin 500mg OD"],
        allergies: [],
        lastAbnormalLab: "Hemoglobin — 9.2 g/dL (low)",
        visitReason: "Follow-up – fatigue and dizziness",
        status: "waiting",
    },
];

export interface TranscriptMessage {
    role: "doctor" | "patient";
    text: string;
    timestamp: string;
}

export const transcriptMessages: TranscriptMessage[] = [
    { role: "doctor", text: "Good morning, Rajesh. How have you been feeling since our last visit?", timestamp: "09:32" },
    { role: "patient", text: "Morning, doctor. Honestly, not great. I've been feeling more tired than usual and my fasting sugar has been around 180-200 most days.", timestamp: "09:32" },
    { role: "doctor", text: "That's higher than where we'd like it. Are you taking the Metformin regularly?", timestamp: "09:33" },
    { role: "patient", text: "Yes, I take it after breakfast and dinner. But I've been eating more sweets lately — there was a family wedding.", timestamp: "09:33" },
    { role: "doctor", text: "I understand. Dietary lapses happen. Let me check your recent HbA1c. It's come back at 8.2%, which is above target.", timestamp: "09:34" },
    { role: "patient", text: "Is that dangerous?", timestamp: "09:34" },
    { role: "doctor", text: "It means your average sugar control over the past 3 months has been suboptimal. We need to get it below 7%. I'm considering adding a second agent.", timestamp: "09:35" },
    { role: "patient", text: "What would that be?", timestamp: "09:35" },
    { role: "doctor", text: "I'm thinking about Glimepiride, a sulfonylurea. It helps the pancreas release more insulin.", timestamp: "09:36" },
    { role: "patient", text: "Are there any side effects I should worry about?", timestamp: "09:36" },
    { role: "doctor", text: "The main one is hypoglycemia — low blood sugar. You'd need to eat regularly and watch for symptoms like shakiness or sweating.", timestamp: "09:37" },
    { role: "patient", text: "Alright, I'll be careful. Anything else?", timestamp: "09:37" },
    { role: "doctor", text: "Let's also recheck your renal function and lipid panel in 4 weeks. And please try to return to your diet plan.", timestamp: "09:38" },
];

export interface AlertData {
    id: string;
    type: "drug-interaction" | "allergy" | "lab-critical";
    title: string;
    severity: "high" | "medium" | "low";
    sourceSentence: string;
    medicationsInvolved: string[];
    reasoning: string;
    timestamp: string;
}

export const alertsData: AlertData[] = [
    {
        id: "ALT-001",
        type: "drug-interaction",
        title: "Drug Interaction Detected",
        severity: "high",
        sourceSentence: "\"I'm thinking about Glimepiride, a sulfonylurea.\"",
        medicationsInvolved: ["Glimepiride (proposed)", "Metformin 500mg BD (current)"],
        reasoning: "Adding Glimepiride to existing Metformin therapy increases the risk of hypoglycemia, especially in patients with inconsistent dietary patterns. The patient has reported dietary inconsistency. Close monitoring of blood glucose levels is recommended. Consider starting at a low dose (1mg) and titrating gradually.",
        timestamp: "09:36",
    },
];

export interface SOAPNote {
    subjective: string[];
    objective: string[];
    assessment: string[];
    plan: string[];
}

export const soapNote: SOAPNote = {
    subjective: [
        "Patient reports increased fatigue over the past 3 weeks",
        "Fasting blood sugar readings consistently between 180–200 mg/dL at home",
        "Dietary lapse acknowledged — increased carbohydrate and sugar intake due to family event",
        "Metformin compliance confirmed — taken after breakfast and dinner",
        "No episodes of hypoglycemia, chest pain, or visual disturbances reported",
    ],
    objective: [
        "BP: 142/88 mmHg (above target)",
        "HR: 78 bpm, regular rhythm",
        "BMI: 28.4 kg/m² (overweight)",
        "HbA1c: 8.2% (target < 7.0%)",
        "Fasting blood glucose: 192 mg/dL",
        "Renal function: eGFR 72 mL/min (within acceptable range)",
        "Foot exam: no ulcers, intact sensation bilaterally",
    ],
    assessment: [
        "Type 2 Diabetes Mellitus — suboptimally controlled",
        "HbA1c above target at 8.2%, indicating need for therapy intensification",
        "Hypertension Stage II — partially controlled on Amlodipine monotherapy",
        "Dietary non-adherence contributing to glycemic deterioration",
    ],
    plan: [
        "Add Glimepiride 1mg OD before breakfast — titrate based on response",
        "Continue Metformin 500mg BD",
        "Reinforce dietary counseling — referral to nutritionist",
        "Recheck HbA1c, fasting glucose, renal panel, and lipid profile in 4 weeks",
        "Blood pressure monitoring — consider adding ACE inhibitor if persistently elevated",
        "Follow-up appointment in 4 weeks",
    ],
};

export interface PatientSummary {
    diagnosis: string[];
    medications: string[];
    warnings: string[];
}

export const patientSummary: PatientSummary = {
    diagnosis: [
        "Type 2 Diabetes Mellitus — suboptimally controlled",
        "Hypertension Stage II",
        "Overweight (BMI 28.4)",
    ],
    medications: [
        "Metformin 500mg BD (continue)",
        "Glimepiride 1mg OD (new — before breakfast)",
        "Amlodipine 5mg OD (continue)",
        "Atorvastatin 20mg HS (continue)",
    ],
    warnings: [
        "Monitor for hypoglycemia after adding Glimepiride",
        "Allergy to Sulfonamides — Glimepiride is a sulfonylurea; cross-reactivity risk is low but not zero",
        "Blood pressure above target — reassess at next visit",
    ],
};
