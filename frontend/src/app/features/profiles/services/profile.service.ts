import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ProfileApiService } from '../api/profile-api.service';
import { BusinessProfile, CreateProfileRequest } from '../models/profile.model';
import { ProfileRegistryService } from './profile-registry.service';

/** Profile use-cases: calls the API and remembers profiles in the local registry. */
@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly api = inject(ProfileApiService);
  private readonly registry = inject(ProfileRegistryService);

  createProfile(body: CreateProfileRequest): Observable<BusinessProfile> {
    return this.api.create(body).pipe(tap((p) => this.registry.remember(p.uuid, p.name)));
  }

  listProfiles(): Observable<BusinessProfile[]> {
    return this.api.list();
  }

  getProfile(uuid: string): Observable<BusinessProfile> {
    return this.api.get(uuid).pipe(tap((p) => this.registry.remember(p.uuid, p.name)));
  }
}
