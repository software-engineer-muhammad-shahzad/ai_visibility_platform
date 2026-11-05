export interface NavItem {
  label: string;
  icon: string;
  link: string;
}

/** Primary sidebar navigation — one entry per top-level feature. */
export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Dashboard', icon: 'space_dashboard', link: '/dashboard' },
  { label: 'Business Profiles', icon: 'business_center', link: '/profiles' },
  { label: 'Queries', icon: 'manage_search', link: '/queries' },
  { label: 'Recommendations', icon: 'lightbulb', link: '/recommendations' },
];

/** localStorage key holding the bearer token (see AuthService). */
export const AUTH_TOKEN_KEY = 'aiv.auth-token';

export const APP_NAME = 'AI Visibility';
