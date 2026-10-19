import dotenv from 'dotenv';

dotenv.config();

export const DEFAULT_GROQ_MODEL = 'qwen/qwen3.8-27b';
const DEFAULT_FRONTEND_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000'];

export interface AppConfig {
    port: number;
    frontendOrigins: string[];
    groqModel: string;
    groqApiKey?: string;
    deepgramApiKey?: string;
    dbPath?: string;
    debugVerboseLogs: boolean;
}

function parseOriginList(value: string | undefined): string[] {
    if (!value?.trim()) return DEFAULT_FRONTEND_ORIGINS;

    const origins = value.split(',').map(origin => origin.trim()).filter(Boolean);
    if (origins.length === 0) return DEFAULT_FRONTEND_ORIGINS;

    for (const origin of origins) {
        let parsed: URL;
        try {
            parsed = new URL(origin);
        } catch {
            throw new Error('Invalid FRONTEND_ORIGINS: each entry must be an HTTP or HTTPS origin.');
        }
        if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin.replace(/\/$/, '')) {
            throw new Error('Invalid FRONTEND_ORIGINS: each entry must be an HTTP or HTTPS origin.');
        }
    }
    return origins.map(origin => new URL(origin).origin);
}

export function loadConfig(env: Record<string, string | undefined>): AppConfig {
    const portText = env.PORT ?? '3001';
    if (!/^\d+$/.test(portText)) throw new Error('Invalid PORT: expected an integer from 1 to 65535.');
    const port = Number(portText);
    if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
        throw new Error('Invalid PORT: expected an integer from 1 to 65535.');
    }

    const model = env.GROQ_MODEL?.trim() || DEFAULT_GROQ_MODEL;
    if (model.length > 200 || /\s/.test(model)) throw new Error('Invalid GROQ_MODEL.');

    const debugText = (env.DEBUG_VERBOSE_LOGS ?? 'false').trim().toLowerCase();
    if (!['true', 'false'].includes(debugText)) throw new Error('Invalid DEBUG_VERBOSE_LOGS: expected true or false.');

    return {
        port,
        frontendOrigins: parseOriginList(env.FRONTEND_ORIGINS),
        groqModel: model,
        groqApiKey: env.GROQ_API_KEY?.trim() || undefined,
        deepgramApiKey: env.DEEPGRAM_API_KEY?.trim() || undefined,
        dbPath: env.DB_PATH?.trim() || undefined,
        debugVerboseLogs: debugText === 'true'
    };
}

export const appConfig = loadConfig(process.env);

export function warnForMissingProviderKeys(config: AppConfig, warn: (message: string) => void = console.warn): void {
    if (!config.deepgramApiKey) warn('Configuration warning: DEEPGRAM_API_KEY is not set; live transcription will use degraded mode.');
    if (!config.groqApiKey) warn('Configuration warning: GROQ_API_KEY is not set; AI generation will use degraded mode.');
}
