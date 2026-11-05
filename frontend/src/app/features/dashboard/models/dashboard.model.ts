import { BusinessProfile, PipelineRun } from '@features/profiles';

/** Row of the dashboard "recent pipeline runs" table. */
export interface DashboardRun extends PipelineRun {
  business_name: string;
}

export interface DashboardSummary {
  profiles: BusinessProfile[];
  totalProfiles: number;
  totalQueries: number;
  averageScore: number | null;
  /** Number of queries the average was computed from (may be < totalQueries if API pages were capped). */
  scoredSample: number;
  runs: DashboardRun[];
  unreachableProfiles: number;
}
