import { test } from 'node:test'
import assert from 'node:assert/strict'
import { AdminProtocol } from '../admin-protocol.js'

test('admin account and token contracts carry their exact wire method names', () =>
{
    assert.equal(AdminProtocol.ListAccounts.method, 'admin/accounts/list')
    assert.equal(AdminProtocol.CreateAccount.method, 'admin/accounts/create')
    assert.equal(AdminProtocol.DisableAccount.method, 'admin/accounts/disable')
    assert.equal(AdminProtocol.ListTokens.method, 'admin/tokens/list')
    assert.equal(AdminProtocol.IssueToken.method, 'admin/tokens/issue')
    assert.equal(AdminProtocol.RevokeToken.method, 'admin/tokens/revoke')
})
