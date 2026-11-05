import { Injectable, inject } from '@angular/core';
import { Paginated } from '@shared';
import { Observable } from 'rxjs';
import { QueryApiService } from '../api/query-api.service';
import { DiscoveredQuery, QueryFilters } from '../models/query.model';

/** Query use-cases consumed by the query components. */
@Injectable({ providedIn: 'root' })
export class QueryService {
  private readonly api = inject(QueryApiService);

  getQueries(profileUuid: string, filters: QueryFilters = {}): Observable<Paginated<DiscoveredQuery>> {
    return this.api.list(profileUuid, filters);
  }

  recheckQuery(queryUuid: string): Observable<void> {
    return this.api.recheck(queryUuid);
  }
}
