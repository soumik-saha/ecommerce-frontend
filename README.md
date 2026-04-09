# Ecom Frontend
Production-style Angular frontend wired to your Spring Boot backend APIs.

Enterprise architecture details: [docs/ENTERPRISE_ARCHITECTURE.md](docs/ENTERPRISE_ARCHITECTURE.md)
## Features
- Auth with JWT (login/register/logout)
- Home storefront (campaign banners, categories, recommendations)
- Product listing + details
- Cart + checkout
- Admin dashboard (products/orders/users)
- Route guards + auth interceptor
- SSR with Angular Universal
- Docker + nginx config
## Run locally
```bash
cd C:/Workspace/ecom-frontend
npm install
npm run start:proxy
```

## API base URL setup
- Default backend host is configured in [src/environments/environment.ts](src/environments/environment.ts) and [src/environments/environment.prod.ts](src/environments/environment.prod.ts).
- Set apiBaseUrl to your backend base host, for example http://localhost:8081.
- The frontend automatically appends /api if missing, so these are both valid:
	- http://localhost:8081
	- http://localhost:8081/api
- For local proxy mode, /api is forwarded to port 8081 via [proxy.conf.json](proxy.conf.json).

## Build
```bash
cd C:/Workspace/ecom-frontend
npm run build
```

## Run With SSR
```bash
cd C:/Workspace/ecom-frontend
npm run build
npm run serve:ssr:ecom-frontend
```

## Test
```bash
cd C:/Workspace/ecom-frontend
npm test
```
