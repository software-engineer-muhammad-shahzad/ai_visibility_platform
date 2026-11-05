import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { ApiError } from '../models/api-error';

function messageFromBody(body: unknown): string | null {
  if (typeof body === 'string' && body.length < 300 && !body.trim().startsWith('<')) return body;
  if (typeof body !== 'object' || body === null) return null;
  const b = body as Record<string, unknown>;
  for (const key of ['message', 'error', 'detail']) {
    const v = b[key];
    if (typeof v === 'string') return v;
    if (typeof v === 'object' && v !== null) {
      const nested = messageFromBody(v);
      if (nested) return nested;
    }
  }
  const errors = b['errors'];
  if (typeof errors === 'object' && errors !== null) {
    return Object.entries(errors as Record<string, unknown>)
      .map(([field, msg]) => `${field}: ${Array.isArray(msg) ? msg.join(', ') : String(msg)}`)
      .join('; ');
  }
  return null;
}

/** Converts any HttpErrorResponse into an ApiError carrying a user-friendly message. */
export const errorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse)) return throwError(() => err);
      let message: string;
      if (err.status === 0) {
        message = 'Cannot reach the API server. Check that the backend is running and the API URL is correct.';
      } else if (err.status === 404) {
        message = messageFromBody(err.error) ?? 'The requested resource was not found.';
      } else if (err.status >= 500) {
        message = messageFromBody(err.error) ?? 'The server encountered an error. Please try again.';
      } else {
        message = messageFromBody(err.error) ?? `Request failed (${err.status}).`;
      }
      return throwError(() => new ApiError(message, err.status, err.error));
    }),
  );
