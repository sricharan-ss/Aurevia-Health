import type { Patient } from "@/types/clinical";
import { apiUrl } from "@/lib/config";

export interface PatientInput {
    name: string;
    age: number;
    gender: string;
    bloodGroup: string;
    conditions: string[];
    medications: string[];
    allergies: string[];
    lastAbnormalLab: string;
    visitReason: string;
}

interface ApiErrorBody { error?: string; details?: Record<string, string>; }

async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(apiUrl(path), { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
    if (!response.ok) {
        const body = await response.json().catch(() => ({})) as ApiErrorBody;
        const error = new Error(body.error || "The patient request could not be completed.") as Error & { details?: Record<string, string> };
        error.details = body.details;
        throw error;
    }
    return response.json() as Promise<T>;
}

export function listPatients(): Promise<Patient[]> { return request<Patient[]>("/api/patients"); }
export function getPatient(id: string): Promise<Patient> { return request<Patient>(`/api/patients/${encodeURIComponent(id)}`); }
export function createPatient(input: PatientInput): Promise<Patient> {
    return request<Patient>("/api/patients", { method: "POST", body: JSON.stringify(input) });
}
export function updatePatient(id: string, input: Partial<PatientInput>): Promise<Patient> {
    return request<Patient>(`/api/patients/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) });
}
