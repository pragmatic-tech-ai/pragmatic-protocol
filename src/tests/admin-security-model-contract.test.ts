import { test } from 'node:test'
import assert from 'node:assert/strict'
import { AdminProtocol } from '../contracts/admin-protocol.js'
import { SecurityRoleKind, TeamMemberOrigin } from '../dto/wire-dtos.js'
import type { SecurityCatalogDto, SecurityModelDto, SetSecurityModelParams, TeamMemberDto } from '../dto/wire-dtos.js'

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

test('security-catalog and team-members methods have the expected method strings', () =>
{
    assert.equal(AdminProtocol.GetSecurityCatalog.method, 'admin/security-catalog/get')
    assert.equal(AdminProtocol.ListTeamMembers.method, 'admin/team-members/list')
})

test('the catalog and team-member wire shapes survive a round trip', () =>
{
    const catalog: SecurityCatalogDto = {
        roles: [
            { name: 'SystemAdministrator', kind: SecurityRoleKind.Base, defaults: [] },
            { name: 'projects.ProjectManager', kind: SecurityRoleKind.Package, package: 'projects', defaults: [{ action: 'read', concept: 'projects.Project', level: 'organization' }] },
        ],
        concepts: [{ name: 'hr.Employee', package: 'hr', owned: true }],
        securedFields: [{ concept: 'hr.Employee', field: 'Salary' }],
        profiles: [{ name: 'hr.Compensation', package: 'hr', defaults: [{ concept: 'hr.Employee', field: 'Salary', read: true, update: false, create: false }] }],
    }
    assert.deepEqual(JSON.parse(JSON.stringify(catalog)) as SecurityCatalogDto, catalog)
    const members: TeamMemberDto[] = [{ principalId: 'alice', origin: TeamMemberOrigin.Synced }, { principalId: 'alice', origin: TeamMemberOrigin.Manual }]
    assert.deepEqual(JSON.parse(JSON.stringify(members)) as TeamMemberDto[], members)
})

test('retired sections are gone', () =>
{
    const model: SecurityModelDto = SecurityModelContractFixture.Params().securityModel
    // @ts-expect-error ownershipRules is retired from the C5 setting
    const retired: SecurityModelDto = { ...model, ownershipRules: [] }
    assert.ok(retired)
})
