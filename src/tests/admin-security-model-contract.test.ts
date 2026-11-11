import { test } from 'node:test'
import assert from 'node:assert/strict'
import { AdminProtocol } from '../contracts/admin-protocol.js'
import type { SecurityModelDto, SetSecurityModelParams } from '../dto/wire-dtos.js'

class SecurityModelContractFixture
{
    public static Params(): SetSecurityModelParams
    {
        return {
            securityModel: {
                businessUnits: [{ id: 'root', name: 'Contoso' }, { id: 'sales', name: 'Sales', parent: 'root' }],
                users: [{ principalId: 'alice', businessUnitId: 'sales' }],
                teams: [{ id: 't1', name: 'Sales team', businessUnitId: 'sales', idpGroups: ['g1'], manualMembers: ['bob'] }],
                roleAssignments: [{ role: 'BasicUser', principalIds: ['alice'], teamIds: ['t1'] }],
                profileAssignments: [{ profile: 'hr.Compensation', principalIds: ['alice'], teamIds: [] }],
                roleOverrides: [{ role: 'projects.ProjectManager', concept: 'projects.Project', action: 'read', level: 'businessUnit' }],
                profileOverrides: [{ profile: 'hr.Compensation', concept: 'hr.Employee', field: 'Salary', read: true, update: false, create: false }],
            },
        }
    }
}

test('security-model admin methods have the expected method strings', () =>
{
    assert.equal(AdminProtocol.GetSecurityModel.method, 'admin/security-model/get')
    assert.equal(AdminProtocol.SetSecurityModel.method, 'admin/security-model/set')
})

test('SetSecurityModelParams carries the C5 setting', () =>
{
    const params = SecurityModelContractFixture.Params()
    const wire: SetSecurityModelParams = JSON.parse(JSON.stringify(params))
    assert.deepEqual(wire, params)
    const model = wire.securityModel
    for (const section of [model.businessUnits, model.users, model.teams, model.roleAssignments, model.profileAssignments, model.roleOverrides, model.profileOverrides])
    {
        assert.ok(section.length > 0)
    }
})

test('retired sections are gone', () =>
{
    const model: SecurityModelDto = SecurityModelContractFixture.Params().securityModel
    // @ts-expect-error ownershipRules is retired from the C5 setting
    const retired: SecurityModelDto = { ...model, ownershipRules: [] }
    assert.ok(retired)
})
