import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ConnectorProtocol } from '../connector-protocol.js'
import { AppWriteStatus } from '../../dto/wire-dtos.js'
import type { WriteResultDto, ConnectorRefreshOutcomeDto } from '../../dto/wire-dtos.js'

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
