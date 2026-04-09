export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8081',
  featureFlags: {
    defaults: {
      advancedWishlistTools: true,
      observabilityDashboard: true,
      auditConflictActions: true
    },
    locked: [] as string[]
  }
};
