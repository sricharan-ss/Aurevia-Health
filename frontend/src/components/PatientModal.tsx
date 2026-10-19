"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { Patient } from "@/types/clinical";
import { createPatient, updatePatient, type PatientInput } from "@/lib/api/patients";

interface PatientModalProps { patient?: Patient; onClose: () => void; onSaved: () => void; }
type FormValues = Omit<PatientInput, "conditions" | "medications" | "allergies"> & { conditions: string; medications: string; allergies: string };

const fields: Array<{ key: keyof FormValues; label: string; multiline?: boolean }> = [
    { key: "name", label: "Name" }, { key: "age", label: "Age" }, { key: "gender", label: "Gender" },
    { key: "bloodGroup", label: "Blood group" }, { key: "conditions", label: "Conditions", multiline: true },
    { key: "medications", label: "Medications", multiline: true }, { key: "allergies", label: "Allergies", multiline: true },
    { key: "lastAbnormalLab", label: "Last abnormal lab" }, { key: "visitReason", label: "Visit reason" }
];

export default function PatientModal({ patient, onClose, onSaved }: PatientModalProps) {
    const [values, setValues] = useState<FormValues>({
        name: patient?.name ?? "", age: patient?.age ?? 0, gender: patient?.gender ?? "Male", bloodGroup: patient?.bloodGroup ?? "",
        conditions: patient?.conditions.join("\n") ?? "", medications: patient?.medications.join("\n") ?? "",
        allergies: patient?.allergies.join("\n") ?? "", lastAbnormalLab: patient?.lastAbnormalLab ?? "", visitReason: patient?.visitReason ?? ""
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    async function submit(event: React.FormEvent) {
        event.preventDefault();
        setSaving(true); setError(""); setErrors({});
        const input: PatientInput = {
            ...values, age: Number(values.age),
            conditions: values.conditions.split(/[\n,]/).map(value => value.trim()).filter(Boolean),
            medications: values.medications.split(/[\n,]/).map(value => value.trim()).filter(Boolean),
            allergies: values.allergies.split(/[\n,]/).map(value => value.trim()).filter(Boolean)
        };
        try {
            if (patient) await updatePatient(patient.id, input); else await createPatient(input);
            onSaved();
        } catch (cause) {
            const detail = cause as Error & { details?: Record<string, string> };
            setError(detail.message);
            setErrors(detail.details ?? {});
        } finally { setSaving(false); }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
            <div className="absolute inset-0 bg-foreground/20 backdrop-blur-[2px]" />
            <form onSubmit={submit} className="relative w-full max-w-lg mx-4 bg-card rounded-2xl shadow-xl border border-border modal-content max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <h2 className="text-base font-semibold text-foreground">{patient ? "Edit patient" : "Add patient"}</h2>
                    <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-surface flex items-center justify-center transition-colors cursor-pointer" aria-label="Close">
                        <X className="w-4 h-4 text-muted" />
                    </button>
                </div>
                <div className="px-6 py-5 space-y-3">
                    {fields.map(({ key, label, multiline }) => (
                        <label key={key} className="block text-xs font-medium text-muted">
                            {label}
                            {key === "gender" ? (
                                <select value={values.gender} onChange={event => setValues({ ...values, gender: event.target.value })} className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground">
                                    <option>Male</option><option>Female</option>
                                </select>
                            ) : multiline ? (
                                <textarea value={values[key]} onChange={event => setValues({ ...values, [key]: event.target.value })} className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground" rows={2} />
                            ) : (
                                <input type={key === "age" ? "number" : "text"} min={key === "age" ? 0 : undefined} max={key === "age" ? 130 : undefined} value={values[key]} onChange={event => setValues({ ...values, [key]: key === "age" ? Number(event.target.value) : event.target.value })} className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground" />
                            )}
                            {["conditions", "medications", "allergies"].includes(key) && <span className="mt-1 block text-[11px] text-muted-light">Separate multiple items with commas or new lines.</span>}
                            {errors[key] && <span className="mt-1 block text-[11px] text-alert">{errors[key]}</span>}
                        </label>
                    ))}
                    {error && <p className="text-xs text-alert" role="alert">{error}</p>}
                </div>
                <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-muted hover:bg-surface transition-colors cursor-pointer">Cancel</button>
                    <button disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-60">{saving ? "Saving..." : "Save patient"}</button>
                </div>
            </form>
        </div>
    );
}
