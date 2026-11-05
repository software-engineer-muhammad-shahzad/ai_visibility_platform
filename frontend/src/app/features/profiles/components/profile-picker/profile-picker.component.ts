import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { RegistryEntry } from '../../services/profile-registry.service';

/** Dropdown of known business profiles. Purely presentational: the parent owns the selection. */
@Component({
  selector: 'app-profile-picker',
  imports: [MatFormFieldModule, MatSelectModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-form-field appearance="outline" subscriptSizing="dynamic" class="picker">
      <mat-label>Business profile</mat-label>
      <mat-select [value]="value()" (selectionChange)="selected.emit($event.value)">
        @for (e of entries(); track e.uuid) {
          <mat-option [value]="e.uuid">{{ e.name || e.uuid }}</mat-option>
        }
      </mat-select>
    </mat-form-field>
  `,
  styles: `.picker { width: 100%; max-width: 420px; }`,
})
export class ProfilePickerComponent {
  readonly entries = input.required<readonly RegistryEntry[]>();
  readonly value = input<string | null>(null);
  readonly selected = output<string>();
}
