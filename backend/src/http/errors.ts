import type { Response } from 'express';

export type ApiErrorCode = 'VALIDATION_ERROR' | 'NOT_FOUND' | 'CONFLICT' | 'BAD_REQUEST' | 'FORBIDDEN_ORIGIN' | 'AI_FAILED' | 'PERSISTENCE_FAILED' | 'INTERNAL';

export function sendApiError(res: Response, status: number, code: ApiErrorCode, error: string, details?: Record<string, unknown>) {
    return res.status(status).json({ error, code, ...(details ? { details } : {}) });
}
