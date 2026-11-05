import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-empty-state',
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="empty">
      <div class="art" aria-hidden="true"><mat-icon>{{ icon() }}</mat-icon></div>
      <h3>{{ title() }}</h3>
      @if (message()) {
        <p class="muted">{{ message() }}</p>
      }
      <ng-content />
    </div>
  `,
  styles: `
    .empty { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 40px 16px; gap: 6px; }
    .art { width: 88px; height: 88px; border-radius: 50%; display: grid; place-items: center; margin-bottom: 4px; background: radial-gradient(circle at 30% 30%, var(--primary-soft, rgba(37, 99, 235, 0.14)), transparent 70%), var(--surface-2, rgba(148, 163, 184, 0.14)); border: 1px dashed var(--border); }
    mat-icon { font-size: 44px; width: 44px; height: 44px; color: var(--text-muted); }
    h3 { margin: 8px 0 0; font-size: 16px; font-weight: 600; }
    p { margin: 0 0 12px; max-width: 420px; }
  `,
})
export class EmptyStateComponent {
  readonly icon = input('inbox');
  readonly title = input.required<string>();
  readonly message = input('');
}
