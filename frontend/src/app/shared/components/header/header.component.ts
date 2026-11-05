import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="header">
      <div class="text">
        <h1>{{ title() }}</h1>
        @if (subtitle()) {
          <p class="muted">{{ subtitle() }}</p>
        }
      </div>
      <div class="actions"><ng-content /></div>
    </div>
  `,
  styles: `
    .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; margin-bottom: 20px; }
    .text { min-width: 0; }
    h1 { margin: 0; font-size: 24px; font-weight: 700; overflow-wrap: anywhere; }
    p { margin: 4px 0 0; }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; }
  `,
})
export class HeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input('');
}
