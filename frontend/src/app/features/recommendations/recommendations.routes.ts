import { Routes } from '@angular/router';
import { crumbs } from '@shared/utils/breadcrumb';

export const RECOMMENDATIONS_ROUTES: Routes = [
  {
    path: '',
    title: 'Recommendations · AI Visibility',
    data: crumbs({ label: 'Recommendations' }),
    loadComponent: () =>
      import('./components/recommendations/recommendations.component').then((m) => m.RecommendationsComponent),
  },
];
