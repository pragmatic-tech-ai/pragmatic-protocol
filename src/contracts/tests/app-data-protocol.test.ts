import { test } from 'node:test'
import assert from 'node:assert/strict'
import { AppDataProtocol } from '../app-data-protocol.js'
import { AppWriteOpKind, AppWriteStatus } from '../../dto/wire-dtos.js'

test('AppDataProtocol.Write carries the data/write method', () =>
{
    assert.equal(AppDataProtocol.Write.method, 'data/write')
})

test('write op + status enums have the wire values', () =>
{
    assert.equal(AppWriteOpKind.Create, 'create')
    assert.equal(AppWriteOpKind.Update, 'update')
    assert.equal(AppWriteOpKind.Delete, 'delete')
    assert.equal(AppWriteStatus.Applied, 'applied')
    assert.equal(AppWriteStatus.Conflict, 'conflict')
    assert.equal(AppWriteStatus.Denied, 'denied')
    assert.equal(AppWriteStatus.Invalid, 'invalid')
})
