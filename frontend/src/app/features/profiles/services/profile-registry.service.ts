import { Injectable, signal } from '@angular/core';
import { PipelineRun } from '../models/pipeline-run.model';

export interface RegistryEntry {
  uuid: string;
  name: string | null;
  lastRun: PipelineRun | null;
}

const KEY = 'aiv.profile-registry.v1';

/**
 * The backend exposes no "list all profiles" or "pipeline run history" endpoint.
 * This registry remembers (in this browser only) which profile UUIDs the user created or opened,
 * plus the last pipeline run returned by the API for each, so the dashboard can be built from
 * real API data via the supported GET /profiles/{uuid} endpoints. It never stores fabricated data.
 */
@Injectable({ providedIn: 'root' })
export class ProfileRegistryService {
  private readonly _entries = signal<RegistryEntry[]>(this.load());
  readonly entries = this._entries.asReadonly();

  remember(uuid: string, name?: string | null): void {
    if (!uuid) return;
    const list = this._entries();
    const existing = list.find((e) => e.uuid === uuid);
    if (existing) {
      if (name && existing.name !== name) this.update(list.map((e) => (e.uuid === uuid ? { ...e, name } : e)));
    } else {
      this.update([{ uuid, name: name ?? null, lastRun: null }, ...list]);
    }
  }

  saveRun(run: PipelineRun): void {
    this.remember(run.profile_uuid);
    this.update(this._entries().map((e) => (e.uuid === run.profile_uuid ? { ...e, lastRun: run } : e)));
  }

  getRun(uuid: string): PipelineRun | null {
    return this._entries().find((e) => e.uuid === uuid)?.lastRun ?? null;
  }

  forget(uuid: string): void {
    this.update(this._entries().filter((e) => e.uuid !== uuid));
  }

  private update(list: RegistryEntry[]): void {
    this._entries.set(list);
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch {
      /* storage unavailable – keep in-memory state only */
    }
  }

  private load(): RegistryEntry[] {
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
      return Array.isArray(parsed) ? (parsed as RegistryEntry[]).filter((e) => typeof e?.uuid === 'string') : [];
    } catch {
      return [];
    }
  }
}
