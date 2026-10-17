import { test } from 'node:test'
import assert from 'node:assert/strict'
import { AdminProtocol } from '../admin-protocol.js'
import type { InvalidatePackParams, AdminAckDto } from '../../dto/wire-dtos.js'

test('admin account and token contracts carry their exact wire method names', () =>
{
    assert.equal(AdminProtocol.ListAccounts.method, 'admin/accounts/list')
    assert.equal(AdminProtocol.CreateAccount.method, 'admin/accounts/create')
    assert.equal(AdminProtocol.DisableAccount.method, 'admin/accounts/disable')
    assert.equal(AdminProtocol.ListTokens.method, 'admin/tokens/list')
    assert.equal(AdminProtocol.IssueToken.method, 'admin/tokens/issue')
    assert.equal(AdminProtocol.RevokeToken.method, 'admin/tokens/revoke')
})

test('InvalidatePack carries its wire method name and typed params/result', () =>
{
    const params: InvalidatePackParams = { name: 'acme-pack' }
    const ack: AdminAckDto = { ok: true }
    assert.equal(AdminProtocol.InvalidatePack.method, 'admin/packs/invalidate')
    assert.equal(params.name, 'acme-pack')
    assert.equal(ack.ok, true)
})
