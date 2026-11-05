import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Standard padded card with an optional heading. Replaces ad-hoc `<div class="card card-pad">` blocks. */
@Component({
  selector: 'app-section-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card" [class.card-pad]="padded()">
      @if (heading()) {
        <h2>{{ heading() }}</h2>
      }
      <ng-content />
    </section>
  `,
})
export class SectionCardComponent {
  readonly heading = input('');
  readonly padded = input(true);
}
