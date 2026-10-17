import { test } from 'node:test'
import assert from 'node:assert/strict'
import { TransportCloseCode, ConnectionLostError, DrainingError } from '../transport-signals.js'

test('TransportCloseCode carries the ws go-away and try-again codes', () =>
{
    assert.equal(TransportCloseCode.GoingAway, 1001)
    assert.equal(TransportCloseCode.TryAgainLater, 1013)
})

test('ConnectionLostError is a named Error with a default message', () =>
{
    const error = new ConnectionLostError()
    assert.ok(error instanceof Error)
    assert.equal(error.name, 'ConnectionLostError')
    assert.ok(error.message.length > 0)
})

test('DrainingError pins the reserved code and message', () =>
{
    assert.equal(DrainingError.Code, -32031)
    assert.equal(DrainingError.Message, 'server is draining')
})
