import { Injectable, computed, signal } from '@angular/core';

const KEY = 'ecom.observability.metrics';

export type MetricType = 'http' | 'navigation' | 'ui' | 'error';

export interface ClientMetric {
  id: string;
  type: MetricType;
  name: string;
  timestamp: string;
  durationMs?: number;
  status?: number;
  metadata?: string;
}

export interface EndpointReliabilityInsight {
  endpoint: string;
  requests: number;
  failed: number;
  failureRatePct: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
}

@Injectable({ providedIn: 'root' })
export class ObservabilityStore {
  private readonly state = signal<ClientMetric[]>(this.load());
  readonly metrics = this.state.asReadonly();

  readonly summary = computed(() => {
    const all = this.state();
    const http = all.filter((metric) => metric.type === 'http');
    const errors = all.filter((metric) => metric.type === 'error');
    const durations = http
      .map((metric) => Number(metric.durationMs ?? 0))
      .filter((value) => Number.isFinite(value) && value >= 0)
      .sort((a, b) => a - b);
    const avgHttpLatencyMs =
      http.length === 0
        ? 0
        : Math.round(http.reduce((acc, metric) => acc + (metric.durationMs ?? 0), 0) / http.length);
    const failedHttpRequests = http.filter((metric) => (metric.status ?? 0) >= 400 || (metric.status ?? 0) === 0).length;
    const errorRatePct = http.length === 0 ? 0 : Number(((failedHttpRequests / http.length) * 100).toFixed(2));
    const availabilityPct = http.length === 0 ? 100 : Number((((http.length - failedHttpRequests) / http.length) * 100).toFixed(2));

    return {
      totalEvents: all.length,
      totalHttpRequests: http.length,
      failedHttpRequests,
      errorRatePct,
      avgHttpLatencyMs,
      p95HttpLatencyMs: this.percentile(durations, 95),
      p99HttpLatencyMs: this.percentile(durations, 99),
      availabilityPct,
      totalErrors: errors.length,
      lastUpdatedAt: all[0]?.timestamp ?? null
    };
  });

  readonly recentMetrics = computed(() => this.state().slice(0, 30));
  readonly endpointInsights = computed<EndpointReliabilityInsight[]>(() => {
    const http = this.state().filter((metric) => metric.type === 'http');
    const grouped = new Map<string, ClientMetric[]>();

    for (const metric of http) {
      const key = metric.name;
      grouped.set(key, [...(grouped.get(key) ?? []), metric]);
    }

    return Array.from(grouped.entries())
      .map(([endpoint, metrics]) => {
        const requests = metrics.length;
        const failed = metrics.filter((metric) => (metric.status ?? 0) >= 400 || (metric.status ?? 0) === 0).length;
        const durations = metrics
          .map((metric) => Number(metric.durationMs ?? 0))
          .filter((value) => Number.isFinite(value) && value >= 0)
          .sort((a, b) => a - b);

        const avgLatencyMs = requests === 0
          ? 0
          : Math.round(durations.reduce((acc, value) => acc + value, 0) / requests);

        return {
          endpoint,
          requests,
          failed,
          failureRatePct: requests === 0 ? 0 : Number(((failed / requests) * 100).toFixed(2)),
          avgLatencyMs,
          p95LatencyMs: this.percentile(durations, 95)
        };
      })
      .sort((a, b) => {
        if (b.failureRatePct !== a.failureRatePct) {
          return b.failureRatePct - a.failureRatePct;
        }
        return b.requests - a.requests;
      })
      .slice(0, 8);
  });

  recordHttp(method: string, url: string, status: number, durationMs: number): void {
    this.add({
      type: 'http',
      name: `${method.toUpperCase()} ${this.sanitizeUrl(url)}`,
      status,
      durationMs
    });
  }

  recordNavigation(path: string, durationMs: number, outcome: 'ok' | 'cancelled' | 'error'): void {
    this.add({
      type: 'navigation',
      name: path,
      durationMs,
      metadata: `outcome=${outcome}`
    });
  }

  recordUiAction(action: string, metadata?: string): void {
    this.add({
      type: 'ui',
      name: action,
      metadata
    });
  }

  recordError(name: string, metadata?: string): void {
    this.add({
      type: 'error',
      name,
      metadata
    });
  }

  clear(): void {
    this.persist([]);
  }

  private add(metric: Omit<ClientMetric, 'id' | 'timestamp'>): void {
    const next: ClientMetric = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`,
      timestamp: new Date().toISOString(),
      ...metric
    };

    this.persist([next, ...this.state()].slice(0, 1000));
  }

  private sanitizeUrl(url: string): string {
    try {
      const parsed = new URL(url, window.location.origin);
      return parsed.pathname;
    } catch {
      return url;
    }
  }

  private persist(next: ClientMetric[]): void {
    this.state.set(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  }

  private load(): ClientMetric[] {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as ClientMetric[];
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .filter((item) => !!item && typeof item.id === 'string' && typeof item.type === 'string' && typeof item.name === 'string')
        .slice(0, 1000);
    } catch {
      return [];
    }
  }

  private percentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) {
      return 0;
    }

    const index = Math.min(
      sortedValues.length - 1,
      Math.max(0, Math.ceil((percentile / 100) * sortedValues.length) - 1)
    );

    return Math.round(sortedValues[index]);
  }
}
