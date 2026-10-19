import { test } from 'node:test'
import assert from 'node:assert/strict'
import { AdminProtocol } from '../contracts/admin-protocol.js'
import type { SetSecurityModelParams } from '../dto/wire-dtos.js'

class SecurityModelContractFixture
{
    public static Params(): SetSecurityModelParams
    {
        return {
            securityModel: {
                businessUnits: [],
                teams: [],
                membership: { claimsMapping: [], overrides: [] },
                ownershipRules: [],
                roles: [{ id: 'r1', name: 'Editor', privileges: [{ action: 'read', concept: 'Order', level: 'organization' }] }],
                roleAssignment: { claimsMapping: [], overrides: [], teamRoles: [] }
            }
        }
    }
}

test('security-model admin methods have the expected method strings', () =>
{
    assert.equal(AdminProtocol.GetSecurityModel.method, 'admin/security-model/get')
    assert.equal(AdminProtocol.SetSecurityModel.method, 'admin/security-model/set')
})

test('SetSecurityModelParams carries roles and roleAssignment', () =>
{
    const params = SecurityModelContractFixture.Params()
    assert.equal(params.securityModel.roles?.length, 1)
    assert.ok(params.securityModel.roleAssignment)
    assert.deepEqual(params.securityModel.roles?.[0].privileges[0], { action: 'read', concept: 'Order', level: 'organization' })
    assert.deepEqual(params.securityModel.membership, { claimsMapping: [], overrides: [] })
})
