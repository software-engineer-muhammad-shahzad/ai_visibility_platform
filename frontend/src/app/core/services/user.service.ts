import { Injectable, computed, signal } from '@angular/core';
import { environment } from '@env/environment';

export interface CurrentUser {
  username: string;
  email: string;
}

/** Holds the signed-in user. Swap the source for a real auth endpoint once the backend has one. */
@Injectable({ providedIn: 'root' })
export class UserService {
  readonly user = signal<CurrentUser>(environment.currentUser);
  readonly initials = computed(() => this.user().username.slice(0, 2).toUpperCase());
}
