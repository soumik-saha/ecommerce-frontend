import { TestBed } from '@angular/core/testing';
import { AuditLogStore } from './audit-log.store';

describe('AuditLogStore', () => {
  let store: AuditLogStore;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    store = TestBed.inject(AuditLogStore);
  });

  it('adds logs with timestamp and actor', () => {
    store.add({
      actor: 'admin@test.com',
      action: 'CREATE_PRODUCT',
      entity: 'product',
      entityId: '101'
    });

    const logs = store.logs();
    expect(logs.length).toBe(1);
    expect(logs[0].actor).toBe('admin@test.com');
    expect(logs[0].timestamp).toBeTruthy();
  });

  it('clears all logs', () => {
    store.add({ actor: 'a', action: 'X', entity: 'e' });
    store.add({ actor: 'b', action: 'Y', entity: 'e' });

    expect(store.logs().length).toBe(2);
    store.clear();
    expect(store.logs().length).toBe(0);
  });

  it('tracks pending and synced log states', () => {
    store.add({ actor: 'admin', action: 'A', entity: 'p' });
    store.add({ actor: 'admin', action: 'B', entity: 'p' });

    const pending = store.pending();
    expect(pending.length).toBe(2);

    store.markSynced([pending[0].id]);
    expect(store.pending().length).toBe(1);

    store.markFailed([pending[1].id]);
    const logs = store.logs();
    expect(logs.some((entry) => entry.syncStatus === 'failed')).toBeTrue();
  });
});
