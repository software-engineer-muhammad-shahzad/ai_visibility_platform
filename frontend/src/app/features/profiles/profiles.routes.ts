import { Routes } from '@angular/router';
import { crumbs } from '@shared/utils/breadcrumb';

const BASE = [{ label: 'Business Profiles', link: '/profiles' }];

export const PROFILES_ROUTES: Routes = [
  {
    path: '',
    title: 'Business Profiles · AI Visibility',
    data: crumbs({ label: 'Business Profiles' }),
    loadComponent: () => import('./components/profile-list/profile-list.component').then((m) => m.ProfileListComponent),
  },
  {
    path: 'new',
    title: 'New Business Profile · AI Visibility',
    data: crumbs(...BASE, { label: 'New profile' }),
    loadComponent: () => import('./components/profile-form/profile-form.component').then((m) => m.ProfileFormComponent),
  },
  {
    path: ':uuid',
    title: 'Profile · AI Visibility',
    data: crumbs(...BASE, { label: 'Profile detail' }),
    loadComponent: () => import('./components/profile-detail/profile-detail.component').then((m) => m.ProfileDetailComponent),
  },
];
