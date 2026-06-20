import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    // Hydration sans withEventReplay() : l'event replay injecte des <script> inline
    // (ng-event-dispatch-contract + __jsaction_bootstrap) incompatibles avec la CSP
    // stricte (script-src 'self'). Le transfer state reste en <script application/json> (data, non exécuté).
    provideRouter(routes), provideClientHydration()
  ]
};
