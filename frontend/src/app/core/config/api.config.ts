import { environment } from '@env/environment';

export const API_CONFIG = {
  BASE_URL: environment.apiUrl,

  ENDPOINTS: {
    PROFILES: '/profiles',
    PIPELINE_RUNS: '/pipeline-runs',
    QUERIES: '/queries',
    RECOMMENDATIONS: '/recommendations',
  },
} as const;

/**
 * Builds an absolute API URL from path segments, e.g. apiUrl(API_CONFIG.ENDPOINTS.PROFILES, uuid, 'queries').
 * Segments may contain slashes (like the ENDPOINTS values); every part is URL-encoded.
 */
export function apiUrl(...segments: string[]): string {
  const parts = segments.flatMap((s) => s.split('/')).filter(Boolean).map(encodeURIComponent);
  return [API_CONFIG.BASE_URL, ...parts].join('/');
}
