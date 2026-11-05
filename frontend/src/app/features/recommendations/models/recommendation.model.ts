export type ContentType = 'blog_post' | 'landing_page' | 'faq' | string;
export type Priority = 'high' | 'medium' | 'low';

export interface ContentRecommendation {
  recommendation_uuid: string;
  target_query_uuid: string | null;
  content_type: ContentType;
  title: string;
  rationale: string | null;
  target_keywords: string[];
  priority: Priority | null;
  created_at: string | null;
}
