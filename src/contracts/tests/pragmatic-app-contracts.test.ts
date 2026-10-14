import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PragmaticAppProtocol } from '../pragmatic-app-protocol.js'

test('application list contract carries its wire method name', () =>
{
    assert.equal(PragmaticAppProtocol.List.method, 'application/list')
})

test('application open contract carries its wire method name', () =>
{
    assert.equal(PragmaticAppProtocol.Open.method, 'application/open')
})
