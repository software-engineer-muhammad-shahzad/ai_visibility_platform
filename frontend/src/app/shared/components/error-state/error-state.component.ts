import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-error-state',
  imports: [MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="error" role="alert">
      <mat-icon>error_outline</mat-icon>
      <h3>{{ title() }}</h3>
      <p class="muted">{{ message() }}</p>
      @if (retryable()) {
        <button mat-stroked-button (click)="retry.emit()"><mat-icon>refresh</mat-icon> Try again</button>
      }
    </div>
  `,
  styles: `
    .error { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 36px 16px; gap: 6px; }
    mat-icon { font-size: 44px; width: 44px; height: 44px; color: var(--danger); }
    button mat-icon { font-size: 18px; width: 18px; height: 18px; color: inherit; }
    h3 { margin: 8px 0 0; font-size: 16px; font-weight: 600; }
    p { margin: 0 0 12px; max-width: 480px; }
  `,
})
export class ErrorStateComponent {
  readonly title = input('Something went wrong');
  readonly message = input.required<string>();
  readonly retryable = input(true);
  readonly retry = output<void>();
}
