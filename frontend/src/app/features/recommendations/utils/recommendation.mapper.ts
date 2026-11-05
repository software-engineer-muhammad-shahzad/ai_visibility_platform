import { isRec, str, strArr, unwrapList } from '@shared';
import { ContentRecommendation, Priority } from '../models/recommendation.model';

const normPriority = (v: unknown): Priority | null => {
  const s = typeof v === 'string' ? v.toLowerCase() : '';
  return s === 'high' || s === 'medium' || s === 'low' ? s : null;
};

export function toRecommendation(raw: unknown): ContentRecommendation {
  const r = isRec(raw) ? raw : {};
  const type = str(r['content_type']);
  return {
    recommendation_uuid: str(r['recommendation_uuid']) ?? str(r['uuid']) ?? '',
    target_query_uuid: str(r['target_query_uuid']),
    content_type: type ? type.toLowerCase().replace(/[\s-]+/g, '_') : '',
    title: str(r['title']) ?? '',
    rationale: str(r['rationale']),
    target_keywords: strArr(r['target_keywords']),
    priority: normPriority(r['priority']),
    created_at: str(r['created_at']),
  };
}

export function toRecommendations(res: unknown): ContentRecommendation[] {
  return unwrapList(res, ['recommendations', 'items', 'results']).map(toRecommendation);
}
