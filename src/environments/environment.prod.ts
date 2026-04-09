export const environment = {
  production: true,
  apiBaseUrl: 'http://localhost:8081',
  featureFlags: {
    defaults: {
      advancedWishlistTools: false,
      observabilityDashboard: true,
      auditConflictActions: true
    },
    locked: ['observabilityDashboard']
  }
};
