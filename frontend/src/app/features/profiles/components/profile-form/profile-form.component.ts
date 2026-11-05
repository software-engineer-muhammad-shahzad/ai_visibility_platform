import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterLink } from '@angular/router';
import { NotificationService } from '@core/services/notification.service';
import { HeaderComponent } from '@shared';
import { catchError, EMPTY, finalize } from 'rxjs';
import { ProfileService } from '../../services/profile.service';
import { domainValidator } from '../../validators/domain.validator';

@Component({
  selector: 'app-profile-form',
  imports: [
    ReactiveFormsModule, RouterLink, MatButtonModule, MatChipsModule, MatFormFieldModule, MatIconModule, MatInputModule,
    MatProgressSpinnerModule, HeaderComponent,
  ],
  templateUrl: './profile-form.component.html',
  styleUrl: './profile-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileFormComponent {
  private readonly profiles = inject(ProfileService);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly separatorKeys = [ENTER, COMMA];
  protected readonly submitting = signal(false);
  protected readonly submitError = signal<string | null>(null);

  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(120)] }),
    domain: new FormControl('', { nonNullable: true, validators: [Validators.required, domainValidator] }),
    industry: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(120)] }),
    description: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(1000)] }),
    competitors: new FormControl<string[]>([], { nonNullable: true }),
  });
  /** Free-text input for the chip grid; its value is never submitted directly. */
  protected readonly competitorInput = new FormControl('', { nonNullable: true });

  protected addCompetitor(event: MatChipInputEvent): void {
    const value = (event.value ?? '').trim();
    event.chipInput.clear();
    this.competitorInput.reset('');
    if (!value) return; // prevent empty entries
    const list = this.form.controls.competitors;
    if (list.value.some((c) => c.toLowerCase() === value.toLowerCase())) return; // no duplicates
    list.setValue([...list.value, value]);
  }

  protected removeCompetitor(name: string): void {
    const list = this.form.controls.competitors;
    list.setValue(list.value.filter((c) => c !== name));
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.submitting()) return;

    // A competitor typed but not confirmed with Enter/comma should not be silently lost.
    const pending = this.competitorInput.value.trim();
    const competitors = this.form.controls.competitors.value;
    if (pending && !competitors.some((c) => c.toLowerCase() === pending.toLowerCase())) competitors.push(pending);

    const v = this.form.getRawValue();
    this.submitting.set(true);
    this.submitError.set(null);
    this.profiles
      .createProfile({ name: v.name.trim(), domain: v.domain.trim().toLowerCase(), industry: v.industry.trim(), description: v.description.trim(), competitors })
      .pipe(
        catchError((err: Error) => {
          this.submitError.set(err.message);
          this.notify.error(`Failed to create business profile. ${err.message}`);
          return EMPTY;
        }),
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((profile) => {
        if (!profile.uuid) {
          this.submitError.set('The API did not return a profile UUID.');
          this.notify.error('Profile was created but the API did not return its UUID.');
          return;
        }
        this.notify.success(`Business profile “${profile.name || v.name}” created.`);
        void this.router.navigate(['/profiles', profile.uuid]);
      });
  }
}
