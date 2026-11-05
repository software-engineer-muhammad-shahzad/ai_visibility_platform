import { Injectable, effect, signal } from '@angular/core';

const KEY = 'aiv.theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly dark = signal(this.initial());

  constructor() {
    effect(() => {
      const dark = this.dark();
      document.documentElement.classList.toggle('dark', dark);
      try {
        localStorage.setItem(KEY, dark ? 'dark' : 'light');
      } catch {
        /* ignore */
      }
    });
  }

  toggle(): void {
    this.dark.update((d) => !d);
  }

  private initial(): boolean {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) return saved === 'dark';
    } catch {
      /* ignore */
    }
    return false;
  }
}
