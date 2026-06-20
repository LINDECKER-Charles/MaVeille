import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ThemeService } from './core/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private readonly themeService = inject(ThemeService);
  readonly theme = this.themeService.theme;

  readonly navLinks = [
    { path: '/', label: 'Digests', exact: true },
    { path: '/stats', label: 'Stats', exact: false },
    { path: '/rapports', label: 'Rapports', exact: false }
  ];

  ngOnInit(): void {
    this.themeService.init();
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }
}
