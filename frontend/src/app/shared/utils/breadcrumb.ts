import { Data } from '@angular/router';

export interface Crumb {
  label: string;
  link?: string;
}

/** Builds route `data` carrying the breadcrumb trail rendered by the topbar. */
export const crumbs = (...trail: Crumb[]): Data => ({ breadcrumbs: trail });
