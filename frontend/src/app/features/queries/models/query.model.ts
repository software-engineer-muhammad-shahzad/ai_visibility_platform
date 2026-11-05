export interface DiscoveredQuery {
  uuid: string;
  query_text: string;
  estimated_search_volume: number | null;
  competitive_difficulty: number | string | null;
  opportunity_score: number | null;
  /** true = visible, false = not visible, null = unknown / not checked yet. */
  domain_visible: boolean | null;
  visibility_position: number | null;
  discovered_at: string | null;
}

export type VisibilityFilter = 'all' | 'visible' | 'not_visible';

export interface QueryFilters {
  min_score?: number;
  status?: Exclude<VisibilityFilter, 'all'>;
  page?: number;
  per_page?: number;
}
