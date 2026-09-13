import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '../../src/lib/db/connection';

// Import Route Handlers
import { GET as getSystemStatus } from '../../src/app/api/v1/system/status/route';
import { GET as getTables } from '../../src/app/api/v1/management/tables/route';
import { POST as attachTable } from '../../src/app/api/v1/management/tables/[tableName]/attach/route';
import { DELETE as detachTable } from '../../src/app/api/v1/management/tables/[tableName]/detach/route';
import { GET as getEvents } from '../../src/app/api/v1/history/events/route';
import { GET as getRecordHistory } from '../../src/app/api/v1/history/records/[tableName]/[recordPk]/route';
import { GET as getRecordDiff } from '../../src/app/api/v1/history/records/[tableName]/[recordPk]/diff/route';
import { GET as replayRecord } from '../../src/app/api/v1/replay/records/[tableName]/[recordPk]/route';
import { GET as replayTable } from '../../src/app/api/v1/replay/tables/[tableName]/route';
import { GET as getTxById } from '../../src/app/api/v1/transactions/[txId]/route';
import { GET as correlateTx } from '../../src/app/api/v1/transactions/correlate/route';
import { GET as getBranches, POST as createBranch } from '../../src/app/api/v1/branches/route';
import { GET as getBranchState } from '../../src/app/api/v1/branches/[branchId]/state/[tableName]/route';
import { POST as handleDemo } from '../../src/app/api/v1/demo/route';

describe('Next.js REST API Route Handlers Suite', () => {
  beforeEach(() => {
    db.seedInitialDemoData();
  });

  it('GET /api/v1/system/status returns system health payload', async () => {
    const res = await getSystemStatus();
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.version).toBe('1.0.0-ReplayDB');
    expect(json.data.totalEventsInLedger).toBeGreaterThan(0);
  });

  it('GET /api/v1/management/tables returns monitored tables', async () => {
    const res = await getTables();
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.some((t: any) => t.name === 'users')).toBe(true);
  });

  it('POST & DELETE /api/v1/management/tables/[tableName]/attach & detach', async () => {
    const detachReq = new NextRequest('http://localhost:3000/api/v1/management/tables/users/detach', { method: 'DELETE' });
    const detachRes = await detachTable(detachReq, { params: Promise.resolve({ tableName: 'users' }) });
    const detachJson = await detachRes.json();
    expect(detachJson.success).toBe(true);
    expect(detachJson.monitored).toBe(false);

    const attachReq = new NextRequest('http://localhost:3000/api/v1/management/tables/users/attach', { method: 'POST' });
    const attachRes = await attachTable(attachReq, { params: Promise.resolve({ tableName: 'users' }) });
    const attachJson = await attachRes.json();
    expect(attachJson.success).toBe(true);
    expect(attachJson.monitored).toBe(true);
  });

  it('GET /api/v1/history/events returns filtered events list', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/history/events?table=users&limit=5');
    const res = await getEvents(req);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.length).toBeLessThanOrEqual(5);
    expect(json.data.every((e: any) => e.tableName === 'users')).toBe(true);
  });

  it('GET /api/v1/history/records/[tableName]/[recordPk] returns chronological events', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/history/records/users/1');
    const res = await getRecordHistory(req, { params: Promise.resolve({ tableName: 'users', recordPk: '1' }) });
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.recordPk).toBe('1');
    expect(json.data.events.length).toBeGreaterThanOrEqual(3);
  });

  it('GET /api/v1/history/records/[tableName]/[recordPk]/diff computes field differential', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/history/records/users/1/diff');
    const res = await getRecordDiff(req, { params: Promise.resolve({ tableName: 'users', recordPk: '1' }) });
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toHaveProperty('changes');
    expect(Array.isArray(json.data.changes)).toBe(true);
  });

  it('GET /api/v1/replay/records/[tableName]/[recordPk] reconstructs past state', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/replay/records/users/1?asOf=2026-09-07T08:16:00Z');
    const res = await replayRecord(req, { params: Promise.resolve({ tableName: 'users', recordPk: '1' }) });
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.exists).toBe(true);
    expect(json.data.state.balance).toBe(750);
  });

  it('GET /api/v1/replay/tables/[tableName] reconstructs table at target timestamp', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/replay/tables/users');
    const res = await replayTable(req, { params: Promise.resolve({ tableName: 'users' }) });
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.totalRecords).toBeGreaterThan(0);
  });

  it('GET /api/v1/transactions/[txId] returns clustered transaction mutations', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/transactions/100');
    const res = await getTxById(req, { params: Promise.resolve({ txId: '100' }) });
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.transactionId).toBe('100');
    expect(json.data.tablesMutated).toContain('users');
    expect(json.data.tablesMutated).toContain('accounts');
  });

  it('GET /api/v1/transactions/correlate locates concurrent transactions', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/transactions/correlate?nearTxId=100&windowMs=600000');
    const res = await correlateTx(req);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.targetTransaction.transactionId).toBe('100');
    expect(Array.isArray(json.data.correlatedTransactions)).toBe(true);
  });

  it('POST & GET /api/v1/branches creates branch and evaluates counterfactual state', async () => {
    // 1. Create branch
    const postReq = new NextRequest('http://localhost:3000/api/v1/branches', {
      method: 'POST',
      body: JSON.stringify({
        branchName: 'e2e-test-branch',
        excludedTransactions: ['105'],
      }),
    });
    const postRes = await createBranch(postReq);
    const postJson = await postRes.json();
    expect(postJson.success).toBe(true);
    const branchId = postJson.data.branchId;

    // 2. List branches
    const listRes = await getBranches();
    const listJson = await listRes.json();
    expect(listJson.success).toBe(true);
    expect(listJson.data.some((b: any) => b.branchId === branchId)).toBe(true);

    // 3. Inspect branch state for users #1
    const stateReq = new NextRequest(`http://localhost:3000/api/v1/branches/${branchId}/state/users?recordPk=1`);
    const stateRes = await getBranchState(stateReq, { params: Promise.resolve({ branchId, tableName: 'users' }) });
    const stateJson = await stateRes.json();
    expect(stateRes.status).toBe(200);
    expect(stateJson.success).toBe(true);
    expect(stateJson.data).toHaveProperty('diverged');
  });

  it('POST /api/v1/demo handles seed, inject_bug, and custom_mutation', async () => {
    // Inject bug
    const bugReq = new NextRequest('http://localhost:3000/api/v1/demo', {
      method: 'POST',
      body: JSON.stringify({ action: 'inject_bug' }),
    });
    const bugRes = await handleDemo(bugReq);
    const bugJson = await bugRes.json();
    expect(bugJson.success).toBe(true);
    expect(bugJson.data.bugTransactionId).toBe('402');

    // Custom mutation
    const mutReq = new NextRequest('http://localhost:3000/api/v1/demo', {
      method: 'POST',
      body: JSON.stringify({
        action: 'custom_mutation',
        payload: {
          tableName: 'users',
          recordPk: '1',
          operationType: 'UPDATE',
          newState: { balance: 8888 },
        },
      }),
    });
    const mutRes = await handleDemo(mutReq);
    const mutJson = await mutRes.json();
    expect(mutJson.success).toBe(true);
    expect(mutJson.data.newState.balance).toBe(8888);

    // Reset baseline
    const seedReq = new NextRequest('http://localhost:3000/api/v1/demo', {
      method: 'POST',
      body: JSON.stringify({ action: 'seed' }),
    });
    const seedRes = await handleDemo(seedReq);
    const seedJson = await seedRes.json();
    expect(seedJson.success).toBe(true);
  });
});
