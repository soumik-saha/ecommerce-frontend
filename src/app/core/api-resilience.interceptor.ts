import { HttpErrorResponse, HttpEvent, HttpInterceptorFn } from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { normalizeApiError } from './error-normalizer';

const MAX_RETRIES = 2;
const RETRYABLE_METHODS = new Set(['GET', 'HEAD']);
const RETRYABLE_STATUS = new Set([0, 408, 429, 500, 502, 503, 504]);

function shouldRetry(error: unknown, method: string): boolean {
  if (!RETRYABLE_METHODS.has(method)) {
    return false;
  }

  if (!(error instanceof HttpErrorResponse)) {
    return false;
  }

  return RETRYABLE_STATUS.has(error.status);
}

export const apiResilienceInterceptor: HttpInterceptorFn = (req, next): Observable<HttpEvent<unknown>> => {
  const method = req.method.toUpperCase();

  return next(req).pipe(
    retry({
      count: MAX_RETRIES,
      delay: (error, retryCount) => {
        if (!shouldRetry(error, method)) {
          throw error;
        }

        // Exponential backoff with a cap for transient outages.
        const waitMs = Math.min(1200, 200 * 2 ** retryCount);
        return timer(waitMs);
      }
    }),
    catchError((error: unknown) => {
      const normalized = normalizeApiError(error);

      if (error && typeof error === 'object') {
        return throwError(() => ({ ...(error as Record<string, unknown>), normalized }));
      }

      return throwError(() => ({ normalized, cause: error }));
    })
  );
};
