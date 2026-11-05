import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { API_CONFIG } from '../config/api.config';
import { AuthService } from '../services/auth.service';

/** Attaches the bearer token to API requests when one is stored (a no-op until the backend issues tokens). */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).token();
  if (!token || !req.url.startsWith(API_CONFIG.BASE_URL)) return next(req);
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
