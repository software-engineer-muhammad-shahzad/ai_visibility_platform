import { Paginated, Rec, isRec, num, str, unwrapList } from '@shared';
import { DiscoveredQuery } from '../models/query.model';

export function toQuery(raw: unknown): DiscoveredQuery {
  const r = isRec(raw) ? raw : {};
  const difficulty = r['competitive_difficulty'];
  const visible = r['domain_visible'];
  return {
    uuid: str(r['uuid']) ?? str(r['query_uuid']) ?? '',
    query_text: str(r['query_text']) ?? str(r['query']) ?? '',
    estimated_search_volume: num(r['estimated_search_volume']),
    competitive_difficulty: num(difficulty) ?? str(difficulty),
    opportunity_score: num(r['opportunity_score']),
    domain_visible: typeof visible === 'boolean' ? visible : null,
    visibility_position: num(r['visibility_position']),
    discovered_at: str(r['discovered_at']) ?? str(r['created_at']),
  };
}

export function toPaginatedQueries(res: unknown, fallbackPage: number, fallbackPerPage: number): Paginated<DiscoveredQuery> {
  const items = unwrapList(res, ['queries', 'items', 'results']).map(toQuery);
  const root = isRec(res) ? res : {};
  const meta = isRec(root['pagination']) ? (root['pagination'] as Rec) : isRec(root['meta']) ? (root['meta'] as Rec) : root;
  return {
    items,
    total: num(meta['total']) ?? num(meta['total_count']) ?? num(meta['total_items']) ?? items.length,
    page: num(meta['page']) ?? fallbackPage,
    per_page: num(meta['per_page']) ?? fallbackPerPage,
  };
}
