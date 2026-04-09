# Enterprise Frontend Architecture

This project is implemented as a production-grade Angular 20 storefront using standalone components, SSR, enterprise feature slices, a reusable design system, and NgRx-backed global state.

## Architectural principles

- Standalone-first Angular architecture with lazy-loaded route components.
- Feature-slice organization with state, domain, UI, and data-access co-located by domain.
- Clean boundaries:
  - `core/`: cross-cutting platform concerns (session, auth, API, telemetry, stores).
  - `features/`: business capabilities and route pages.
  - `shared/`: reusable UI components.
- Centralized API policies via interceptors (auth, retry, telemetry, normalized errors, correlation signals).
- Security-first session handling (sessionStorage, guards, interceptor-driven 401 handling).
- SSR enabled using Angular Universal (`@angular/ssr`) with server render mode.
- Root NgRx state for auth/session, cart, catalog, profile, and admin slices.

## Current folder structure

```text
src/
  app/
    app.config.ts
    app.config.server.ts
    app.routes.ts
    app.routes.server.ts
    app.ts

    core/
      api-client.ts
      api-resilience.interceptor.ts
      auth.interceptor.ts
      telemetry.interceptor.ts
      guards.ts
      models.ts
      error-normalizer.ts
      state/
        resource-state.ts

    state/
      auth/
      cart/
      catalog/
      profile/
      admin/

    design-system/
      primitives/
      composite/
      feedback/

    features/
      home/
        domain/
        data-access/
        ui/
        feature/
      catalog/
        domain/
        data-access/
        ui/
        feature/
      product-detail/
        domain/
        data-access/
        ui/
        feature/
      cart/
      checkout/
      profile/
      admin/

    shared/
      product-card.component.ts
      toast-outlet.component.ts

  main.ts
  main.server.ts
  server.ts
```

## How requirements map to implementation

- Home page: dynamic campaign banners, categories, recommendation/trending rails in `features/home`.
- Product listing: filters, sorting, pagination, lazy route loading and NgRx cache in `features/catalog`.
- Product detail: variant, ratings, and reviews rendering in `features/product-detail.page.ts`.
- Cart: real-time update operations with optimistic UX controls in `features/cart.page.ts`.
- Checkout: validation-heavy form with saved address reuse in `features/checkout.page.ts`.
- User profile: settings, addresses, preferences in `features/profile.page.ts`.
- Admin: product/order/user/analytics operations in `features/admin.page.ts`.

## Production platform capabilities

- SSR and hydration for SEO and first paint.
- Retry with exponential backoff for idempotent API requests.
- Error normalization for consistent UX and observability.
- Responsive, mobile-first layout tokens in `styles.scss`.
- Accessibility baseline: semantic sections, labels, focus states, keyboard-friendly controls.
- Reusable design system components (`ds-button`, `ds-input`, `ds-select`, `ds-pagination`, `ds-skeleton-grid`, `ds-toast-stack`).
- Entity-style catalog caching with query-keyed page snapshots.

## Recommended next enterprise steps

- Move from in-browser JWT storage to HTTP-only secure cookies with BFF.
- Introduce a dedicated state library (`@ngrx/store`, entity, effects) for very large teams.
- Add CI gates for Lighthouse, accessibility, and contract tests.
- Add image CDN transformations and responsive `srcset` pipelines.
