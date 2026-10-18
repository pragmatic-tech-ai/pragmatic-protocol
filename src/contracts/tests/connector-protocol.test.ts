import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ConnectorProtocol } from '../connector-protocol.js'
import { AppWriteStatus, ConnectorWriteOp } from '../../dto/wire-dtos.js'
import type { WriteResultDto, ConnectorRefreshOutcomeDto, ConnectorPagedWriteParams, ConnectorPagedWriteResultDto } from '../../dto/wire-dtos.js'

test('ConnectorProtocol method strings are stable and namespaced', () =>
{
    assert.equal(ConnectorProtocol.List.method, 'connector/list')
    assert.equal(ConnectorProtocol.Prepare.method, 'connector/prepare')
    assert.equal(ConnectorProtocol.Refresh.method, 'connector/refresh')
    assert.equal(ConnectorProtocol.Read.method, 'connector/read')
    assert.equal(ConnectorProtocol.WriteBack.method, 'connector/writeBack')
    assert.equal(ConnectorProtocol.Test.method, 'connector/test')
})

test('WriteResultDto failures round-trip through JSON for every kind', () =>
{
    const result: WriteResultDto = {
        applied: 1,
        failures: [
            { key: 'a', kind: 'conflict', reason: 'stale' },
            { key: 2, kind: 'error', reason: 'boom' },
            { key: null, kind: 'unsupported', reason: 'no delete' },
        ],
    }
    const back = JSON.parse(JSON.stringify(result)) as WriteResultDto
    assert.deepEqual(back, result)
    assert.deepEqual(back.failures.map(f => f.kind), ['conflict', 'error', 'unsupported'])
})

test('AppWriteStatus.Failed is stable', () =>
{
    assert.equal(AppWriteStatus.Failed, 'failed')
})

test('ConnectorProtocol.RefreshModel method string is connector/refreshModel', () =>
{
    assert.equal(ConnectorProtocol.RefreshModel.method, 'connector/refreshModel')
})

test('the existing connector/refresh method string is unchanged', () =>
{
    assert.equal(ConnectorProtocol.Refresh.method, 'connector/refresh')
})

test('ConnectorRefreshOutcomeDto round-trips through JSON', () =>
{
    const outcome: ConnectorRefreshOutcomeDto = {
        diagnostics: [{ code: 'connector.refresh-dropped', message: 'x' }],
    }
    const back = JSON.parse(JSON.stringify(outcome)) as ConnectorRefreshOutcomeDto
    assert.deepEqual(back, outcome)
})

test('paged connector method strings are stable and legacy ones unchanged', () =>
{
    assert.equal(ConnectorProtocol.ReadPage.method, 'connector/readPage')
    assert.equal(ConnectorProtocol.WritePaged.method, 'connector/writePaged')
    assert.equal(ConnectorProtocol.Read.method, 'connector/read')
    assert.equal(ConnectorProtocol.WriteBack.method, 'connector/writeBack')
})

test('ConnectorPagedWriteParams round-trips through JSON', () =>
{
    const params: ConnectorPagedWriteParams = {
        modelId: 'm1',
        operations: [
            {
                op: ConnectorWriteOp.Upsert,
                concept: 'Customer',
                connector: 'crm',
                source: 'customers',
                key: 7,
                fields: { name: 'Ann', active: true, note: null },
                expectedVersion: 'v3',
            },
            { op: ConnectorWriteOp.Delete, concept: 'Customer', connector: 'crm', source: 'customers', key: 'k9' },
        ],
    }
    const back = JSON.parse(JSON.stringify(params)) as ConnectorPagedWriteParams
    assert.deepEqual(back, params)
})

test('ConnectorWriteOp enum carries its wire values', () =>
{
    assert.equal(ConnectorWriteOp.Upsert, 'upsert')
    assert.equal(ConnectorWriteOp.Delete, 'delete')
})

test('ConnectorPagedWriteResultDto round-trips every AppWriteStatus', () =>
{
    const result: ConnectorPagedWriteResultDto = {
        results: [
            { key: 1, status: AppWriteStatus.Applied },
            { key: 'a', status: AppWriteStatus.Conflict, reason: 'stale' },
            { key: true, status: AppWriteStatus.Failed, reason: 'boom' },
            { key: null, status: AppWriteStatus.Invalid, reason: 'bad' },
            { key: 2, status: AppWriteStatus.Denied, reason: 'no' },
        ],
    }
    const back = JSON.parse(JSON.stringify(result)) as ConnectorPagedWriteResultDto
    assert.deepEqual(back, result)
})
