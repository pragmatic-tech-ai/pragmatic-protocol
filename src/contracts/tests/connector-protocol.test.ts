import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ConnectorProtocol } from '../connector-protocol.js'

test('ConnectorProtocol method strings are stable and namespaced', () =>
{
    assert.equal(ConnectorProtocol.List.method, 'connector/list')
    assert.equal(ConnectorProtocol.Prepare.method, 'connector/prepare')
    assert.equal(ConnectorProtocol.Refresh.method, 'connector/refresh')
    assert.equal(ConnectorProtocol.Read.method, 'connector/read')
    assert.equal(ConnectorProtocol.WriteBack.method, 'connector/writeBack')
    assert.equal(ConnectorProtocol.Test.method, 'connector/test')
})
