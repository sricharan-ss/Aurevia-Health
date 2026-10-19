export interface NormalizedSOAP { subjective: string[]; objective: string[]; assessment: string[]; plan: string[]; }

export interface NormalizedReport {
    soap: NormalizedSOAP;
    summary: string;
    medications: string[];
    warnings: string[];
}

const asObject = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const asText = (value: unknown): string => typeof value === "string" ? value : "";
const asStringArray = (value: unknown): string[] => Array.isArray(value) ? value.map(asText).filter(Boolean) : [];

export function normalizeReport(input: unknown): NormalizedReport {
    const root = asObject(input);
    const report = asObject(root.report);
    const aiSummary = asObject(root.aiSummary ?? report.aiSummary);
    const sourceSoap = asObject(root.soap ?? report.soap);
    const soap: NormalizedSOAP = {
        subjective: asStringArray(sourceSoap.subjective),
        objective: asStringArray(sourceSoap.objective),
        assessment: asStringArray(sourceSoap.assessment),
        plan: asStringArray(sourceSoap.plan)
    };
    return {
        soap,
        summary: asText(aiSummary.narrative ?? root.summary),
        medications: asStringArray(aiSummary.medications ?? root.medications),
        warnings: asStringArray(aiSummary.warnings ?? root.warnings)
    };
}
