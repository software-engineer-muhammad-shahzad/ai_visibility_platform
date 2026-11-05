import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRouteSnapshot, NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { ThemeService } from '@core/services/theme.service';
import { UserService } from '@core/services/user.service';
import { Crumb } from '../../utils/breadcrumb';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, MatButtonModule, MatIconModule, MatMenuModule, MatTooltipModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent {
  protected readonly theme = inject(ThemeService);
  protected readonly currentUser = inject(UserService);
  private readonly router = inject(Router);

  /** Shows the hamburger button (used when the sidebar is an overlay drawer). */
  readonly showMenuButton = input(false);
  readonly menuToggle = output<void>();

  protected readonly crumbs = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      startWith(null),
      map(() => this.readCrumbs(this.router.routerState.snapshot.root)),
    ),
    { initialValue: [] as Crumb[] },
  );
  protected readonly pageTitle = computed(() => this.crumbs().at(-1)?.label ?? 'AI Visibility');

  private readCrumbs(route: ActivatedRouteSnapshot): Crumb[] {
    let r: ActivatedRouteSnapshot | null = route;
    let found: Crumb[] = [];
    while (r) {
      const c = r.data['breadcrumbs'] as Crumb[] | undefined;
      if (c) found = c;
      r = r.firstChild;
    }
    return found;
  }
}
