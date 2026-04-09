import { TestBed } from '@angular/core/testing';
import { FeatureFlagsStore } from './feature-flags.store';

describe('FeatureFlagsStore', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  it('loads defaults when no local values exist', () => {
    const store = TestBed.inject(FeatureFlagsStore);
    expect(store.isEnabled('advancedWishlistTools')).toBeTrue();
    expect(store.isEnabled('observabilityDashboard')).toBeTrue();
    expect(store.isEnabled('auditConflictActions')).toBeTrue();
  });

  it('toggles and persists a flag', () => {
    const store = TestBed.inject(FeatureFlagsStore);

    store.toggle('advancedWishlistTools');

    expect(store.isEnabled('advancedWishlistTools')).toBeFalse();
    const entry = store.entries().find((item) => item.key === 'advancedWishlistTools');
    expect(entry?.source).toBe('override');

    const reloaded = new FeatureFlagsStore();
    expect(reloaded.isEnabled('advancedWishlistTools')).toBeFalse();
  });

  it('creates and approves toggle request', () => {
    const store = TestBed.inject(FeatureFlagsStore);

    const request = store.submitToggleRequest('advancedWishlistTools', false, 'requester@company.com', 'Incident mitigation');
    expect(request).toBeTruthy();
    expect(store.requests().length).toBe(1);

    const ok = store.approveRequest(request!.id, 'approver@company.com', 'Approved for mitigation');
    expect(ok).toBeTrue();
    expect(store.isEnabled('advancedWishlistTools')).toBeFalse();
    expect(store.requests()[0].status).toBe('approved');
  });
});
