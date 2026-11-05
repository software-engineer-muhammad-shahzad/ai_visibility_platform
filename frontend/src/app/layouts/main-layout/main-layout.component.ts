import { animate, query, style, transition, trigger } from '@angular/animations';
import { BreakpointObserver } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatSidenavModule } from '@angular/material/sidenav';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';

/** Application frame: sidebar + topbar around the routed page. */
@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, MatSidenavModule, SidebarComponent, NavbarComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('routeTransition', [
      transition('* <=> *', [
        query(':enter', [style({ opacity: 0, transform: 'translateY(8px)' })], { optional: true }),
        query(':enter', [animate('220ms ease-out', style({ opacity: 1, transform: 'none' }))], { optional: true }),
      ]),
    ]),
  ],
})
export class MainLayoutComponent {
  private readonly router = inject(Router);
  /** Changes with the path (not the query string) so only real page changes animate. */
  protected readonly routeKey = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects.split('?')[0]),
    ),
    { initialValue: '' },
  );

  /** Narrow screens (tablet portrait and below) use an overlay drawer instead of a fixed sidebar. */
  protected readonly isNarrow = toSignal(
    inject(BreakpointObserver)
      .observe('(max-width: 900px)')
      .pipe(map((s) => s.matches)),
    { initialValue: false },
  );
}
