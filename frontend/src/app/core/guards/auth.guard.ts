import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Blocks routes for unauthenticated users. Not applied to any route yet because the API has no
 * login flow; add `canActivate: [authGuard]` (and point `loginPath` at a real route) once it does.
 */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const loginPath = '/auth/login';
  return auth.isAuthenticated() ? true : router.parseUrl(loginPath);
};
