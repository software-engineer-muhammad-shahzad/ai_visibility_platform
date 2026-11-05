import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { VisibilityFilter } from '../../models/query.model';

/** Filter bar for the query list. The parent owns the form controls and reacts to their changes. */
@Component({
  selector: 'app-query-filters',
  imports: [DecimalPipe, ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatSelectModule, MatSliderModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="filters">
      <div class="slider-field">
        <label id="min-score-label">Minimum opportunity score: <strong>{{ minScore().value | number: '1.2-2' }}</strong></label>
        <mat-slider min="0" max="1" step="0.05" aria-labelledby="min-score-label">
          <input matSliderThumb [formControl]="minScore()" />
        </mat-slider>
      </div>
      <mat-form-field appearance="outline" subscriptSizing="dynamic" class="status-field">
        <mat-label>Visibility</mat-label>
        <mat-select [formControl]="status()">
          <mat-option value="all">All</mat-option>
          <mat-option value="visible">Visible</mat-option>
          <mat-option value="not_visible">Not visible</mat-option>
        </mat-select>
      </mat-form-field>
      <span class="grow"></span>
      @if (hasFilters()) {
        <button mat-button (click)="reset.emit()">Clear filters</button>
      }
      <button mat-stroked-button (click)="exportCsv.emit()" [disabled]="!canExport()">
        <mat-icon>download</mat-icon> Export CSV
      </button>
    </div>
  `,
  styles: `
    .filters { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; margin-bottom: 16px; }
    .slider-field { display: flex; flex-direction: column; min-width: 240px; font-size: 13px; }
    .slider-field mat-slider { width: 240px; margin: 0; }
    .status-field { width: 180px; }
    .grow { flex: 1; }
  `,
})
export class QueryFiltersComponent {
  readonly minScore = input.required<FormControl<number>>();
  readonly status = input.required<FormControl<VisibilityFilter>>();
  readonly hasFilters = input(false);
  readonly canExport = input(false);

  readonly reset = output<void>();
  readonly exportCsv = output<void>();
}
