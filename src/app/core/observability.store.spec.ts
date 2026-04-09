import { TestBed } from '@angular/core/testing';
import { ObservabilityStore } from './observability.store';

describe('ObservabilityStore', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  it('records http metrics and computes summary', () => {
    const store = TestBed.inject(ObservabilityStore);

    store.recordHttp('GET', '/api/products', 200, 100);
    store.recordHttp('GET', '/api/products', 200, 120);
    store.recordHttp('POST', '/api/orders', 500, 300);
    store.recordHttp('POST', '/api/orders', 503, 450);
    store.recordHttp('GET', '/api/orders', 200, 500);

    const summary = store.summary();
    expect(summary.totalHttpRequests).toBe(5);
    expect(summary.failedHttpRequests).toBe(2);
    expect(summary.avgHttpLatencyMs).toBe(294);
    expect(summary.p95HttpLatencyMs).toBe(500);
    expect(summary.p99HttpLatencyMs).toBe(500);
    expect(summary.availabilityPct).toBe(60);

    const hotspots = store.endpointInsights();
    expect(hotspots.length).toBeGreaterThan(0);
    expect(hotspots[0].endpoint).toContain('/api/orders');
    expect(hotspots[0].failureRatePct).toBeGreaterThan(0);
  });

  it('can clear metrics', () => {
    const store = TestBed.inject(ObservabilityStore);

    store.recordUiAction('wishlist.reloaded');
    expect(store.summary().totalEvents).toBe(1);

    store.clear();
    expect(store.summary().totalEvents).toBe(0);
  });
});
