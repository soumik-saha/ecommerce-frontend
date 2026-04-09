import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize, tap } from 'rxjs/operators';
import { ObservabilityStore } from './observability.store';

export const telemetryInterceptor: HttpInterceptorFn = (req, next) => {
  const observability = inject(ObservabilityStore);
  const start = performance.now();
  let status = 0;

  return next(req).pipe(
    tap({
      next: (event) => {
        if (event instanceof HttpResponse) {
          status = event.status;
        }
      },
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse) {
          status = error.status || 0;
        }
      }
    }),
    finalize(() => {
      const durationMs = Math.max(0, performance.now() - start);
      observability.recordHttp(req.method, req.urlWithParams, status, durationMs);
    })
  );
};
