import { Routes } from '@angular/router';
import { crumbs } from '@shared/utils/breadcrumb';

export const QUERIES_ROUTES: Routes = [
  {
    path: '',
    title: 'Queries · AI Visibility',
    data: crumbs({ label: 'Queries' }),
    loadComponent: () => import('./components/queries/queries.component').then((m) => m.QueriesComponent),
  },
];
