import { Routes } from '@angular/router';

/** Top-level routes: each feature owns and lazy-loads its own route table. */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    loadChildren: () =>
      import('./features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
  },
  {
    path: 'profiles',
    loadChildren: () =>
      import('./features/profiles/profiles.routes').then((m) => m.PROFILES_ROUTES),
  },
  {
    path: 'queries',
    loadChildren: () => import('./features/queries/queries.routes').then((m) => m.QUERIES_ROUTES),
  },
  {
    path: 'recommendations',
    loadChildren: () =>
      import('./features/recommendations/recommendations.routes').then(
        (m) => m.RECOMMENDATIONS_ROUTES,
      ),
  },
  { path: '**', redirectTo: 'dashboard' },
];
