import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../src/lib/db/connection';
import { reconstructRecord, reconstructTable } from '../../src/lib/engine/reconstruct';
import { computeStateDiff } from '../../src/lib/engine/diff';
import { defaultBranchEngine } from '../../src/lib/engine/branch';
import { groupEventsByTransaction, findTemporalCorrelations } from '../../src/lib/forensic/tx-group';
import { createTableSnapshot } from '../../src/lib/engine/snapshot';

describe('End-to-End Feature Verification Suite', () => {
  beforeEach(() => {
    // Reset in-memory database to clean baseline before each test
    db.seedInitialDemoData();
  });

  describe('Feature 1: System Status & Health', () => {
    it('returns valid system connection status and event count', async () => {
      const status = db.getConnectionStatus();
      expect(status).toBeDefined();
      expect(typeof status.connected).toBe('boolean');
      expect(['live_postgres', 'standalone_memory']).toContain(status.mode);

      const { total } = await db.getEvents({ limit: 1 });
      expect(typeof total).toBe('number');
      expect(total).toBeGreaterThan(0);
    });
  });

  describe('Feature 2: Table Schema & Trigger Attachment Management', () => {
    it('discovers application business tables with event counts', async () => {
      const tables = await db.getMonitoredTables();
      expect(tables.length).toBeGreaterThanOrEqual(4);
      const tableNames = tables.map((t) => t.name);
      expect(tableNames).toContain('users');
      expect(tableNames).toContain('accounts');
      expect(tableNames).toContain('orders');
      expect(tableNames).toContain('inventory');
    });

    it('attaches and detaches CDC triggers without data loss', async () => {
      // Detach 'users'
      await db.detachTable('users');
      let tables = await db.getMonitoredTables();
      let usersTable = tables.find((t) => t.name === 'users');
      expect(usersTable?.isMonitored).toBe(false);

      // Re-attach 'users'
      await db.attachTable('users');
      tables = await db.getMonitoredTables();
      usersTable = tables.find((t) => t.name === 'users');
      expect(usersTable?.isMonitored).toBe(true);
    });
  });

  describe('Feature 3: Event Ledger Stream & Filter Queries', () => {
    it('supports filtered and paginated event retrieval', async () => {
      const { events, total } = await db.getEvents({ limit: 10, offset: 0 });
      expect(events.length).toBeGreaterThan(0);
      expect(total).toBeGreaterThanOrEqual(events.length);

      // Filter by specific table
      const userEvents = await db.getEvents({ tableName: 'users' });
      expect(userEvents.events.every((e) => e.tableName === 'users')).toBe(true);

      // Verify event structure
      const first = events[0];
      expect(first).toHaveProperty('eventId');
      expect(first).toHaveProperty('tableName');
      expect(first).toHaveProperty('recordPk');
      expect(first).toHaveProperty('operationType');
      expect(first).toHaveProperty('transactionId');
      expect(first).toHaveProperty('recordedAt');
    });

    it('retrieves full chronological lifecycle for a specific record', async () => {
      const events = await db.getRecordEvents('users', '1');
      expect(events.length).toBeGreaterThan(0);
      expect(events.every((e) => e.tableName === 'users' && e.recordPk === '1')).toBe(true);

      // Verify chronological ordering
      for (let i = 1; i < events.length; i++) {
        const prevTime = new Date(events[i - 1].recordedAt).getTime();
        const currTime = new Date(events[i].recordedAt).getTime();
        expect(currTime).toBeGreaterThanOrEqual(prevTime);
      }
    });
  });

  describe('Feature 4: Point-in-Time Historical Reconstruction (Replay)', () => {
    it('accurately reconstructs Alice balance evolution across timestamps', async () => {
      const events = await db.getRecordEvents('users', '1');
      expect(events.length).toBeGreaterThanOrEqual(3);

      // 1. Prior to creation
      const preCreation = reconstructRecord('users', '1', events, '2026-09-07T07:59:00Z');
      expect(preCreation.exists).toBe(false);
      expect(preCreation.state).toBeNull();

      // 2. At initial creation (balance = 500)
      const afterInsert = reconstructRecord('users', '1', events, events[0].recordedAt);
      expect(afterInsert.exists).toBe(true);
      expect(afterInsert.state?.balance).toBe(500);

      // 3. After second deposit (Tx 108: balance = 1000)
      const tx108Event = events.find((e) => e.transactionId === '108');
      expect(tx108Event).toBeDefined();
      const afterTx108 = reconstructRecord('users', '1', events, tx108Event!.recordedAt);
      expect(afterTx108.exists).toBe(true);
      expect(afterTx108.state?.balance).toBe(1000);
      expect(afterTx108.state?.status).toBe('ACTIVE');
    });

    it('reconstructs entire table state at a target timestamp', async () => {
      const { events } = await db.getEvents({ tableName: 'users', limit: 1000 });
      const tableDump = reconstructTable('users', events, new Date().toISOString());

      expect(tableDump.tableName).toBe('users');
      expect(tableDump.totalRecords).toBeGreaterThan(0);
      expect(tableDump.records.some((r) => r.id === 1 || r.id === '1')).toBe(true);
    });
  });

  describe('Feature 5: Incident Injection & Transaction Forensics', () => {
    it('simulates Tx 402 incident and verifies atomic multi-table blast radius', async () => {
      // Inject rogue transaction 402
      db.injectBugScenario();

      // Retrieve all events for Tx 402
      const { events: tx402Events } = await db.getEvents({ transactionId: '402' });
      expect(tx402Events.length).toBeGreaterThanOrEqual(2);

      // Check transaction group
      const groups = groupEventsByTransaction(tx402Events);
      const tx402 = groups.get('402');
      expect(tx402).toBeDefined();
      expect(tx402?.tablesMutated).toContain('users');
      expect(tx402?.tablesMutated).toContain('accounts');

      // Verify corruption in users
      const userEvent = tx402Events.find((e) => e.tableName === 'users' && e.recordPk === '1');
      expect(userEvent).toBeDefined();
      expect(userEvent?.newState?.balance).toBe(-5000);
      expect(userEvent?.newState?.status).toBe('FRAUD');

      // Verify account was frozen in same commit
      const accountEvent = tx402Events.find((e) => e.tableName === 'accounts');
      expect(accountEvent).toBeDefined();
      expect(accountEvent?.newState?.tier).toBe('FROZEN');
    });

    it('discovers temporal correlations near Tx 402', async () => {
      db.injectBugScenario();
      const { events } = await db.getEvents({ limit: 1000 });
      const correlations = findTemporalCorrelations(events, '402', 10000);

      expect(correlations.targetTransaction).toBeDefined();
      expect(correlations.targetTransaction?.transactionId).toBe('402');
      expect(Array.isArray(correlations.correlatedTransactions)).toBe(true);
    });
  });

  describe('Feature 6: Counterfactual Branching & Recovery Sandbox', () => {
    it('materializes clean recovery of balance by omitting Tx 402', async () => {
      // Inject bug first
      db.injectBugScenario();

      const events = await db.getRecordEvents('users', '1');
      const has402 = events.some((e) => e.transactionId === '402');
      expect(has402).toBe(true);

      // Create branch omitting Tx 402
      const branch = defaultBranchEngine.createBranch({
        branchName: 'fix-rogue-402',
        baseTimestamp: events[0].recordedAt,
        excludedTransactions: ['402'],
      });

      // Target time right after 402 committed (before 415)
      const tx402Event = events.find((e) => e.transactionId === '402');
      expect(tx402Event).toBeDefined();

      // Compare reality vs branch at Tx 402 commit time
      const comparison = defaultBranchEngine.compareRecord(
        branch,
        'users',
        '1',
        events,
        tx402Event!.recordedAt
      );

      expect(comparison.diverged).toBe(true);
      // In reality: corrupted to -5000 / FRAUD
      expect(comparison.actualState?.balance).toBe(-5000);
      expect(comparison.actualState?.status).toBe('FRAUD');

      // In counterfactual sandbox: clean $950.01 / ACTIVE
      expect(comparison.branchedState?.balance).toBe(950.01);
      expect(comparison.branchedState?.status).toBe('ACTIVE');

      // Diff should clearly identify restored balance and status
      const balanceDiff = comparison.diffs.find((d) => d.field === 'balance');
      expect(balanceDiff?.status).toBe('modified');
      expect(balanceDiff?.oldValue).toBe(-5000);
      expect(balanceDiff?.newValue).toBe(950.01);
    });
  });

  describe('Feature 7: Custom Mutation Ingestion', () => {
    it('appends and immediately reflects custom user mutations', async () => {
      await db.insertEvent({
        tableSchema: 'public',
        tableName: 'users',
        recordPk: '1',
        operationType: 'UPDATE',
        oldState: { balance: 950.01 },
        newState: { balance: 9999, status: 'EXECUTIVE_TIER' },
        diffState: { balance: 9999, status: 'EXECUTIVE_TIER' },
        transactionId: '999',
        recordedAt: new Date().toISOString(),
        dbUser: 'live_tester',
      });

      const events = await db.getRecordEvents('users', '1');
      const latest = events[events.length - 1];
      expect(latest.newState?.balance).toBe(9999);
      expect(latest.newState?.status).toBe('EXECUTIVE_TIER');

      // Reconstructed state reflects the new mutation
      const reconstructed = reconstructRecord('users', '1', events, new Date().toISOString());
      expect(reconstructed.state?.balance).toBe(9999);
      expect(reconstructed.state?.status).toBe('EXECUTIVE_TIER');
    });
  });

  describe('Feature 8: Table Snapshot Checkpoints', () => {
    it('creates compacted table snapshot checkpoints', async () => {
      const { events } = await db.getEvents({ tableName: 'users' });
      const snapshot = createTableSnapshot('users', events, new Date().toISOString());

      expect(snapshot).toHaveProperty('snapshotId');
      expect(snapshot.tableName).toBe('users');
      expect(Array.isArray(snapshot.tableStateDump)).toBe(true);
      expect(snapshot.tableStateDump.length).toBeGreaterThan(0);
    });
  });
});
