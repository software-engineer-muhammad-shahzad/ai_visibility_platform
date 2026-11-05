import { Injectable, computed, signal } from '@angular/core';
import { AUTH_TOKEN_KEY } from '../config/app.constants';

/** Holds the bearer token. The backend has no auth endpoints yet, so login/logout only manage the stored token. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _token = signal<string | null>(this.read());
  readonly token = this._token.asReadonly();
  readonly isAuthenticated = computed(() => !!this._token());

  setToken(token: string): void {
    this._token.set(token);
    this.write(token);
  }

  logout(): void {
    this._token.set(null);
    this.write(null);
  }

  private read(): string | null {
    try {
      return localStorage.getItem(AUTH_TOKEN_KEY);
    } catch {
      return null;
    }
  }

  private write(token: string | null): void {
    try {
      if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
      else localStorage.removeItem(AUTH_TOKEN_KEY);
    } catch {
      /* storage unavailable – keep in-memory state only */
    }
  }
}
