import { num, str, strArr, unwrapObject } from '@shared/utils/api-response';
import { PipelineRun } from '../models/pipeline-run.model';
import { BusinessProfile } from '../models/profile.model';

export function toProfile(res: unknown): BusinessProfile {
  const r = unwrapObject(res, ['profile']);
  return {
    uuid: str(r['uuid']) ?? str(r['profile_uuid']) ?? str(r['id']) ?? '',
    name: str(r['name']) ?? str(r['business_name']) ?? '',
    domain: str(r['domain']) ?? '',
    industry: str(r['industry']),
    description: str(r['description']),
    competitors: strArr(r['competitors']),
    status: str(r['status']),
    created_at: str(r['created_at']),
    updated_at: str(r['updated_at']),
  };
}

export function toPipelineRun(res: unknown, profileUuid: string): PipelineRun {
  const r = unwrapObject(res, ['pipeline_run', 'run', 'pipeline']);
  return {
    uuid: str(r['uuid']) ?? str(r['run_uuid']) ?? str(r['pipeline_run_uuid']),
    profile_uuid: str(r['profile_uuid']) ?? profileUuid,
    status: str(r['status']),
    discovery_status: str(r['discovery_status']),
    scoring_status: str(r['scoring_status']),
    recommendation_status: str(r['recommendation_status']),
    failed_stage: str(r['failed_stage']),
    retry_count: num(r['retry_count']),
    queries_discovered: num(r['queries_discovered']),
    queries_scored: num(r['queries_scored']),
    tokens_used: num(r['tokens_used']),
    error_message: str(r['error_message']) ?? str(r['error']),
    started_at: str(r['started_at']),
    completed_at: str(r['completed_at']),
  };
}

/* ---- status classification shared by pipeline logic and badges ---- */
const IN_PROGRESS = ['running', 'processing', 'queued', 'in_progress', 'started', 'discovering', 'scoring'];
const FAILED = ['failed', 'error', 'errored'];

export const isInProgress = (s: string | null | undefined): boolean => !!s && IN_PROGRESS.includes(s.toLowerCase());
export const isFailed = (s: string | null | undefined): boolean => !!s && FAILED.includes(s.toLowerCase());
