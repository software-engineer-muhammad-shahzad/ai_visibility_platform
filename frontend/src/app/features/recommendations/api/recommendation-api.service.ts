import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_CONFIG, apiUrl } from '@core/config/api.config';
import { Observable, map } from 'rxjs';
import { ContentRecommendation } from '../models/recommendation.model';
import { toRecommendations } from '../utils/recommendation.mapper';

/** Raw HTTP access for content recommendations. */
@Injectable({ providedIn: 'root' })
export class RecommendationApiService {
  private readonly http = inject(HttpClient);

  /** GET /profiles/{uuid}/recommendations */
  list(profileUuid: string): Observable<ContentRecommendation[]> {
    return this.http
      .get<unknown>(apiUrl(API_CONFIG.ENDPOINTS.PROFILES, profileUuid, 'recommendations'))
      .pipe(map(toRecommendations));
  }
}
