import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_CONFIG, apiUrl } from '@core/config/api.config';
import { Paginated } from '@shared';
import { Observable, map } from 'rxjs';
import { DiscoveredQuery, QueryFilters } from '../models/query.model';
import { toPaginatedQueries } from '../utils/query.mapper';

/** Raw HTTP access for discovered queries. */
@Injectable({ providedIn: 'root' })
export class QueryApiService {
  private readonly http = inject(HttpClient);

  /** GET /profiles/{uuid}/queries?min_score&status&page&per_page */
  list(profileUuid: string, filters: QueryFilters = {}): Observable<Paginated<DiscoveredQuery>> {
    let params = new HttpParams();
    if (filters.min_score !== undefined && filters.min_score > 0) params = params.set('min_score', filters.min_score);
    if (filters.status) params = params.set('status', filters.status);
    const page = filters.page ?? 1;
    const perPage = filters.per_page ?? 10;
    params = params.set('page', page).set('per_page', perPage);

    return this.http
      .get<unknown>(apiUrl(API_CONFIG.ENDPOINTS.PROFILES, profileUuid, 'queries'), { params })
      .pipe(map((res) => toPaginatedQueries(res, page, perPage)));
  }

  /** POST /queries/{uuid}/recheck */
  recheck(queryUuid: string): Observable<void> {
    return this.http
      .post<unknown>(apiUrl(API_CONFIG.ENDPOINTS.QUERIES, queryUuid, 'recheck'), {})
      .pipe(map(() => undefined));
  }
}
