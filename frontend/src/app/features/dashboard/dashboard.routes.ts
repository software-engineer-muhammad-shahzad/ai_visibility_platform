import { Routes } from '@angular/router';
import { crumbs } from '@shared/utils/breadcrumb';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    title: 'Dashboard · AI Visibility',
    data: crumbs({ label: 'Dashboard' }),
    loadComponent: () => import('./components/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
];
