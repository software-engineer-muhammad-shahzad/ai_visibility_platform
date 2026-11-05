import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly snackBar = inject(MatSnackBar);

  success(message: string): void {
    this.open(message, 'snack-success', 4000);
  }

  info(message: string): void {
    this.open(message, 'snack-info', 4000);
  }

  error(message: string): void {
    this.open(message, 'snack-error', 7000);
  }

  private open(message: string, panelClass: string, duration: number): void {
    this.snackBar.open(message, 'Dismiss', { duration, panelClass, horizontalPosition: 'end', verticalPosition: 'top' });
  }
}
