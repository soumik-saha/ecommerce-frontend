import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection
} from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideStore } from '@ngrx/store';
import { routes } from './app.routes';
import { apiResilienceInterceptor } from './core/api-resilience.interceptor';
import { authInterceptor } from './core/auth.interceptor';
import { telemetryInterceptor } from './core/telemetry.interceptor';
import { adminFeature } from './state/admin/admin.state';
import { AdminEffects } from './state/admin/admin.effects';
import { authFeature } from './state/auth/auth.state';
import { CartEffects } from './state/cart/cart.effects';
import { cartFeature } from './state/cart/cart.state';
import { CatalogEffects } from './state/catalog/catalog.effects';
import { catalogFeature } from './state/catalog/catalog.state';
import { ProfileEffects } from './state/profile/profile.effects';
import { profileFeature } from './state/profile/profile.state';
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(withFetch(), withInterceptors([apiResilienceInterceptor, authInterceptor, telemetryInterceptor])),
    provideStore({
      [authFeature.name]: authFeature.reducer,
      [cartFeature.name]: cartFeature.reducer,
      [catalogFeature.name]: catalogFeature.reducer,
      [profileFeature.name]: profileFeature.reducer,
      [adminFeature.name]: adminFeature.reducer
    }),
    provideEffects([CatalogEffects, CartEffects, ProfileEffects, AdminEffects]),
    provideRouter(
      routes,
      withInMemoryScrolling({
        anchorScrolling: 'enabled',
        scrollPositionRestoration: 'enabled'
      })
    ), provideClientHydration(withEventReplay())
  ]
};
