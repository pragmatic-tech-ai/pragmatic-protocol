import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DataAssignmentProtocol } from '../data-assignment-protocol.js'

test('DataAssignmentProtocol exposes the data/assign method name', () =>
{
    assert.equal(DataAssignmentProtocol.Assign.method, 'data/assign')
})
