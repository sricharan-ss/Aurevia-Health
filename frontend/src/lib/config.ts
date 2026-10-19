function trimTrailingSlashes(value: string): string {
    return value.replace(/\/+$/, '');
}

export const API_BASE_URL = trimTrailingSlashes(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');

const configuredWebSocketUrl = process.env.NEXT_PUBLIC_WS_URL;
export const WS_BASE_URL = trimTrailingSlashes(
    configuredWebSocketUrl || API_BASE_URL.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:')
);

export function apiUrl(path: string): string {
    return `${API_BASE_URL}/${path.replace(/^\/+/, '')}`;
}

export function wsUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
    const url = new URL(`${WS_BASE_URL}/${path.replace(/^\/+/, '')}`);
    for (const [key, value] of Object.entries(params ?? {})) {
        if (value !== undefined) url.searchParams.set(key, String(value));
    }
    return url.toString();
}
