import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, TemplateRef, contentChild, input, output } from '@angular/core';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { ErrorStateComponent } from '../error-state/error-state.component';
import { LoadingSpinnerComponent } from '../loading-spinner/loading-spinner.component';

/**
 * Renders the loading / error / empty / content states of an async view so features do not repeat
 * the same `@if` ladder. The content must be given as an `<ng-template>` so it is only created once
 * data is ready:
 *
 * <app-async-state [loading]="loading()" [error]="error()" [empty]="items().length === 0" (retry)="reload()" ...>
 *   <ng-template>...content...</ng-template>
 * </app-async-state>
 */
@Component({
  selector: 'app-async-state',
  imports: [NgTemplateOutlet, LoadingSpinnerComponent, ErrorStateComponent, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <app-loading-spinner [variant]="variant()" [label]="loadingLabel()" />
    } @else if (error(); as err) {
      <app-error-state [title]="errorTitle()" [message]="err" (retry)="retry.emit()" />
    } @else if (empty()) {
      <app-empty-state [icon]="emptyIcon()" [title]="emptyTitle()" [message]="emptyMessage()" />
    } @else {
      <ng-container [ngTemplateOutlet]="content()" />
    }
  `,
})
export class AsyncStateComponent {
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly empty = input(false);

  readonly variant = input<'spinner' | 'skeleton'>('skeleton');
  readonly loadingLabel = input('');
  readonly errorTitle = input('Something went wrong');
  readonly emptyIcon = input('inbox');
  readonly emptyTitle = input('Nothing here yet');
  readonly emptyMessage = input('');

  readonly retry = output<void>();

  protected readonly content = contentChild.required(TemplateRef);
}
