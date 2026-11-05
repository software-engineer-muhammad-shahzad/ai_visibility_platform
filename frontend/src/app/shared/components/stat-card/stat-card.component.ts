import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-stat-card',
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card stat">
      <div class="icon"><mat-icon>{{ icon() }}</mat-icon></div>
      <div>
        <div class="label">{{ label() }}</div>
        <div class="value">{{ value() ?? '—' }}</div>
        @if (hint()) {
          <div class="hint muted">{{ hint() }}</div>
        }
      </div>
    </div>
  `,
  styles: `
    .stat { display: flex; align-items: center; gap: 16px; padding: 20px; }
    .icon { width: 48px; height: 48px; border-radius: 12px; display: grid; place-items: center; background: var(--accent-soft); color: var(--accent); flex: none; }
    .label { font-size: 13px; color: var(--text-muted); }
    .value { font-size: 28px; font-weight: 700; line-height: 1.2; }
    .hint { font-size: 12px; margin-top: 2px; }
  `,
})
export class StatCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string | number | null>();
  readonly icon = input('insights');
  readonly hint = input('');
}
