export interface PipelineRun {
  uuid: string | null;
  profile_uuid: string;
  status: string | null;
  /** Independent per-stage status: pending | running | completed | failed. */
  discovery_status: string | null;
  scoring_status: string | null;
  recommendation_status: string | null;
  /** Stage that failed (discovery | scoring | recommendation), null when nothing failed. */
  failed_stage: string | null;
  retry_count: number | null;
  queries_discovered: number | null;
  queries_scored: number | null;
  tokens_used: number | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
}
