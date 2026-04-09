import { TestBed } from '@angular/core/testing';
import { SloPolicyStore } from './slo-policy.store';

describe('SloPolicyStore', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  it('returns breaches when metrics violate policy', () => {
    const store = TestBed.inject(SloPolicyStore);
    store.setPolicy({ availabilityMinPct: 99.9, p95LatencyMaxMs: 200, errorRateMaxPct: 0.5 });

    const breaches = store.evaluate({
      availabilityPct: 97,
      p95HttpLatencyMs: 350,
      totalHttpRequests: 100,
      failedHttpRequests: 5
    });

    expect(breaches.length).toBe(3);
    expect(breaches.some((item) => item.id === 'availability')).toBeTrue();
    expect(breaches.some((item) => item.id === 'latency.p95')).toBeTrue();
    expect(breaches.some((item) => item.id === 'error.rate')).toBeTrue();
  });

  it('returns no breaches when metrics are healthy', () => {
    const store = TestBed.inject(SloPolicyStore);
    const breaches = store.evaluate({
      availabilityPct: 100,
      p95HttpLatencyMs: 120,
      totalHttpRequests: 30,
      failedHttpRequests: 0
    });

    expect(breaches.length).toBe(0);
  });
});
