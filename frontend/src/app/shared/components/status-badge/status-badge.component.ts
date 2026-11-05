import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const TONES: Record<string, string> = {
  completed: 'success', complete: 'success', success: 'success', done: 'success', active: 'success', visible: 'success', ready: 'success',
  running: 'warning', pending: 'warning', processing: 'warning', queued: 'warning', in_progress: 'warning', started: 'warning',
  failed: 'danger', error: 'danger', errored: 'danger', not_visible: 'danger',
};

@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="badge {{ tone() }}">{{ text() }}</span>`,
})
export class StatusBadgeComponent {
  readonly status = input<string | null | undefined>(null);
  readonly label = input<string | null>(null);

  protected readonly tone = computed(() => TONES[(this.status() ?? '').toLowerCase()] ?? 'neutral');
  protected readonly text = computed(() => {
    const raw = this.label() ?? this.status() ?? 'Unknown';
    return raw.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
  });
}
