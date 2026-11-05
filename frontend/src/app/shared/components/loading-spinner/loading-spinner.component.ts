import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-loading-spinner',
  imports: [MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (variant() === 'skeleton') {
      <div class="skeleton-wrap" aria-busy="true" aria-label="Loading">
        @for (i of rows(); track i) {
          <div class="skeleton"></div>
        }
      </div>
    } @else {
      <div class="center" role="status">
        <mat-spinner [diameter]="diameter()" />
        @if (label()) {
          <span class="muted">{{ label() }}</span>
        }
      </div>
    }
  `,
  styles: `
    .center { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 40px 16px; }
    .skeleton-wrap { display: grid; gap: 10px; padding: 8px 0; }
    .skeleton { height: 44px; border-radius: 8px; background: linear-gradient(90deg, var(--skeleton-a) 25%, var(--skeleton-b) 50%, var(--skeleton-a) 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
    @keyframes shimmer { to { background-position: -200% 0; } }
  `,
})
export class LoadingSpinnerComponent {
  readonly variant = input<'spinner' | 'skeleton'>('spinner');
  readonly label = input('');
  readonly diameter = input(40);
  readonly rows = input<number[]>([1, 2, 3, 4]);
}
