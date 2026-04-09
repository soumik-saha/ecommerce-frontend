import { Injectable, signal } from '@angular/core';

const KEY = 'ecom.slo.policy';

export interface SloPolicy {
  availabilityMinPct: number;
  p95LatencyMaxMs: number;
  errorRateMaxPct: number;
}

export interface SloBreach {
  id: 'availability' | 'latency.p95' | 'error.rate';
  severity: 'high' | 'medium';
  title: string;
  description: string;
}

export interface SloEvaluationInput {
  availabilityPct: number;
  p95HttpLatencyMs: number;
  totalHttpRequests: number;
  failedHttpRequests: number;
}

const DEFAULT_POLICY: SloPolicy = {
  availabilityMinPct: 99,
  p95LatencyMaxMs: 900,
  errorRateMaxPct: 1
};

@Injectable({ providedIn: 'root' })
export class SloPolicyStore {
  private readonly state = signal<SloPolicy>(this.load());
  readonly policy = this.state.asReadonly();

  setPolicy(patch: Partial<SloPolicy>): void {
    const next: SloPolicy = {
      availabilityMinPct: this.clampNumber(
        typeof patch.availabilityMinPct === 'number' ? patch.availabilityMinPct : this.state().availabilityMinPct,
        0,
        100
      ),
      p95LatencyMaxMs: this.clampNumber(
        typeof patch.p95LatencyMaxMs === 'number' ? patch.p95LatencyMaxMs : this.state().p95LatencyMaxMs,
        50,
        15000
      ),
      errorRateMaxPct: this.clampNumber(
        typeof patch.errorRateMaxPct === 'number' ? patch.errorRateMaxPct : this.state().errorRateMaxPct,
        0,
        100
      )
    };

    this.persist(next);
  }

  resetDefaults(): void {
    this.persist(DEFAULT_POLICY);
  }

  evaluate(input: SloEvaluationInput): SloBreach[] {
    const policy = this.state();
    const errorRatePct = input.totalHttpRequests === 0
      ? 0
      : Number(((input.failedHttpRequests / input.totalHttpRequests) * 100).toFixed(2));

    const breaches: SloBreach[] = [];

    if (input.availabilityPct < policy.availabilityMinPct) {
      breaches.push({
        id: 'availability',
        severity: 'high',
        title: 'Availability breach',
        description: `Availability ${input.availabilityPct}% is below SLO ${policy.availabilityMinPct}%`
      });
    }

    if (input.p95HttpLatencyMs > policy.p95LatencyMaxMs) {
      breaches.push({
        id: 'latency.p95',
        severity: input.p95HttpLatencyMs > policy.p95LatencyMaxMs * 1.5 ? 'high' : 'medium',
        title: 'Latency breach',
        description: `P95 latency ${input.p95HttpLatencyMs}ms exceeds SLO ${policy.p95LatencyMaxMs}ms`
      });
    }

    if (errorRatePct > policy.errorRateMaxPct) {
      breaches.push({
        id: 'error.rate',
        severity: errorRatePct > policy.errorRateMaxPct * 2 ? 'high' : 'medium',
        title: 'Error rate breach',
        description: `Error rate ${errorRatePct}% exceeds SLO ${policy.errorRateMaxPct}%`
      });
    }

    return breaches;
  }

  private persist(next: SloPolicy): void {
    this.state.set(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  }

  private load(): SloPolicy {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      return DEFAULT_POLICY;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<SloPolicy>;
      return {
        availabilityMinPct: this.clampNumber(
          typeof parsed.availabilityMinPct === 'number' ? parsed.availabilityMinPct : DEFAULT_POLICY.availabilityMinPct,
          0,
          100
        ),
        p95LatencyMaxMs: this.clampNumber(
          typeof parsed.p95LatencyMaxMs === 'number' ? parsed.p95LatencyMaxMs : DEFAULT_POLICY.p95LatencyMaxMs,
          50,
          15000
        ),
        errorRateMaxPct: this.clampNumber(
          typeof parsed.errorRateMaxPct === 'number' ? parsed.errorRateMaxPct : DEFAULT_POLICY.errorRateMaxPct,
          0,
          100
        )
      };
    } catch {
      return DEFAULT_POLICY;
    }
  }

  private clampNumber(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
  }
}
