import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { IdentityConfigDto, SecurityModelDto } from '../wire-dtos.js'

test('IdentityConfigDto carries an optional securityModel that JSON-round-trips', () =>
{
    const model: SecurityModelDto = {
        businessUnits: [{ id: 'root', name: 'Root' }, { id: 'sales', name: 'Sales', parent: 'root' }],
        teams: [{ id: 'reps', name: 'Reps', owningBusinessUnit: 'sales' }],
        membership: {
            claimsMapping: [{ claim: 'dept', value: 'sales', homeBusinessUnit: 'sales', teams: ['reps'] }],
            overrides: [{ principalId: 'u1', homeBusinessUnit: 'sales', teams: ['reps'] }]
        },
        ownershipRules: [{ concept: 'Order', owningBusinessUnit: { kind: 'fromField', value: 'bu' }, owner: { kind: 'fixed', value: 'u1' } }],
        roles: [{ id: 'rep', name: 'Rep', privileges: [{ action: 'read', concept: 'Order', level: 'businessUnit' }] }],
        roleAssignment: { claimsMapping: [{ claim: 'dept', value: 'sales', roles: ['rep'] }], overrides: [], teamRoles: [{ teamId: 'reps', roles: ['rep'] }] },
        fieldSecurity: {
            securedFields: [{ concept: 'Order', field: 'total' }],
            profiles: [{ id: 'fin', name: 'Finance', grants: [{ concept: 'Order', field: 'total', read: true, update: false }] }],
            profileAssignment: { claimsMapping: [], overrides: [{ principalId: 'u1', profiles: ['fin'] }], teamProfiles: [] }
        }
    }
    const config: IdentityConfigDto = { packId: 'local', delegationDepth: 'FullAuthz', providerSettings: {}, groupRoleMap: {}, claimsMapping: {}, securityModel: model }
    assert.deepEqual(JSON.parse(JSON.stringify(config)), config)
    const bare: IdentityConfigDto = { packId: 'local', delegationDepth: 'FullAuthz', providerSettings: {}, groupRoleMap: {}, claimsMapping: {} }
    assert.equal(bare.securityModel, undefined)
})
