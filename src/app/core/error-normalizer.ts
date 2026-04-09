import { HttpErrorResponse } from '@angular/common/http';
import { ApiError } from './models';

export interface NormalizedError {
  status: number;
  message: string;
  path?: string;
  fieldErrors?: Record<string, string>;
  code?: string;
}

export function normalizeApiError(error: unknown): NormalizedError {
  if (!(error instanceof HttpErrorResponse)) {
    return {
      status: 0,
      message: 'Unexpected error'
    };
  }

  if (typeof error.error === 'string') {
    return {
      status: error.status,
      message: error.error || error.message || 'Request failed',
      path: error.url ?? undefined
    };
  }

  if (error.error && typeof error.error === 'object') {
    const payload = error.error as ApiError & { code?: string; errors?: string[] };
    const firstValidationError = Array.isArray(payload.errors) ? payload.errors[0] : undefined;

    return {
      status: error.status,
      message: payload.message || firstValidationError || error.message || 'Request failed',
      path: payload.path || error.url || undefined,
      fieldErrors: payload.fieldErrors,
      code: payload.code || payload.error
    };
  }

  if (error.status === 0) {
    return {
      status: 0,
      message: 'Server unreachable',
      path: error.url ?? undefined
    };
  }

  return {
    status: error.status,
    message: error.message || 'Request failed',
    path: error.url ?? undefined
  };
}
