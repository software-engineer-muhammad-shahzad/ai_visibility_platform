import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { apiUrl } from '@core/config/api.config';
import { BusinessProfile } from '@features/profiles';
import { toPipelineRun, toProfile } from '@features/profiles/utils/profile.mapper';
import { Observable, map } from 'rxjs';
import { DashboardRun, DashboardSummary } from '../models/dashboard.model';

/** Raw shape of GET /dashboard/summary. */
interface DashboardSummaryResponse {
  total_profiles: number;
  total_queries: number;
  scored_queries: number;
  average_opportunity_score: number | null;
  profiles: unknown[];
  recent_runs: Array<Record<string, unknown>>;
}

/** Everything on the dashboard (stat cards and recent runs) comes from GET /dashboard/summary. */
@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  loadSummary(): Observable<DashboardSummary> {
    return this.http.get<DashboardSummaryResponse>(apiUrl('/dashboard/summary')).pipe(map((res) => this.build(res)));
  }

  private build(res: DashboardSummaryResponse): DashboardSummary {
    const profiles: BusinessProfile[] = (res.profiles ?? []).map(toProfile);
    const runs: DashboardRun[] = (res.recent_runs ?? []).map((r) => ({
      ...toPipelineRun(r, String(r['profile_uuid'] ?? '')),
      business_name: String(r['business_name'] ?? ''),
    }));

    return {
      profiles,
      totalProfiles: res.total_profiles,
      totalQueries: res.total_queries,
      averageScore: res.average_opportunity_score,
      scoredSample: res.scored_queries,
      runs,
      unreachableProfiles: 0,
    };
  }
}
