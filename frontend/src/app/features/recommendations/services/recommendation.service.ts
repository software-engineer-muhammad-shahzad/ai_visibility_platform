import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RecommendationApiService } from '../api/recommendation-api.service';
import { ContentRecommendation } from '../models/recommendation.model';

@Injectable({ providedIn: 'root' })
export class RecommendationService {
  private readonly api = inject(RecommendationApiService);

  getRecommendations(profileUuid: string): Observable<ContentRecommendation[]> {
    return this.api.list(profileUuid);
  }
}
