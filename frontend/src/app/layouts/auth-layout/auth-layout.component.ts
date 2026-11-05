import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** Centered, chrome-less layout for sign-in style pages (no routes use it yet). */
@Component({
  selector: 'app-auth-layout',
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<main class="auth"><router-outlet /></main>`,
  styles: `.auth { min-height: 100vh; display: grid; place-items: center; padding: 16px; background: var(--bg); }`,
})
export class AuthLayoutComponent {}
