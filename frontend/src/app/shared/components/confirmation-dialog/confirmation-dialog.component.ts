import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Observable, map } from 'rxjs';

export interface ConfirmationDialogData {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

@Component({
  selector: 'app-confirmation-dialog',
  imports: [MatDialogModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>{{ data.message }}</mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="false">{{ data.cancelLabel ?? 'Cancel' }}</button>
      <button mat-flat-button [mat-dialog-close]="true" cdkFocusInitial>{{ data.confirmLabel ?? 'Confirm' }}</button>
    </mat-dialog-actions>
  `,
})
export class ConfirmationDialogComponent {
  protected readonly data = inject<ConfirmationDialogData>(MAT_DIALOG_DATA);
}

/** Opens the confirmation dialog; the returned observable emits true when the user confirms. */
export function confirm(dialog: MatDialog, data: ConfirmationDialogData): Observable<boolean> {
  return dialog
    .open(ConfirmationDialogComponent, { data, width: '400px', autoFocus: false })
    .afterClosed()
    .pipe(map((result) => result === true));
}
