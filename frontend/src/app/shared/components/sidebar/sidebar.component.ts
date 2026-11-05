import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeService } from '@core/services/theme.service';
import { NAV_ITEMS } from '@core/config/app.constants';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, MatIconModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  protected readonly theme = inject(ThemeService);
  protected readonly nav = NAV_ITEMS;

  /** Emits when a navigation link is clicked (lets the shell close the overlay drawer on small screens). */
  readonly navigated = output<void>();
}
