import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { AppWriteStatus } from '../../dto/wire-dtos.js'
import type { CypherExecuteResultDto, CypherNodeCellDto, CypherQueryPageDto, CypherQueryParams } from '../../dto/wire-dtos.js'
import { CypherProtocol } from '../cypher-protocol.js'

class CypherContractFixtures
{
    private static readonly NodeId = 'n1'
    private static readonly Concept = 'Component'
    private static readonly Label = 'Billing'
    private static readonly FieldName = 'owner'
    private static readonly RefName = 'dependsOn'
    private static readonly Origin = 'Component'
    private static readonly Column = 'n'
    private static readonly CountColumn = 'cnt'

    public static Result(): CypherQueryPageDto
    {
        const node: CypherNodeCellDto = {
            id: CypherContractFixtures.NodeId,
            concept: CypherContractFixtures.Concept,
            label: CypherContractFixtures.Label,
            fields: {
                [CypherContractFixtures.FieldName]: {
                    value: null,
                    definitionOrigin: CypherContractFixtures.Origin,
                    valueOrigin: CypherContractFixtures.Origin
                }
            },
            refs: { [CypherContractFixtures.RefName]: ['n2', 'n3'] }
        }
        return {
            columns: [CypherContractFixtures.Column, CypherContractFixtures.CountColumn],
            items: [[node, 3], [{ nested: [node] }, null]],
            truncated: false
        }
    }
}

test('cypher query result with node cells survives a JSON round trip', () =>
{
    const result = CypherContractFixtures.Result()
    assert.deepEqual(JSON.parse(JSON.stringify(result)), result)
})

test('cypher contract carries its wire method name', () =>
{
    assert.equal(CypherProtocol.Query.method, 'cypher/query')
})

class CypherModelIdFixtures
{
    public static readonly ModelId = 'x'
    public static readonly Query = 'MATCH (n) RETURN n'
    public static readonly ExpectedVersion = '0.8.0'
    public static readonly PackageJson = '../../../package.json'
}

test('cypher query params accept modelId and it survives a JSON round trip', () =>
{
    const params: CypherQueryParams = {
        cypher: CypherModelIdFixtures.Query,
        modelId: CypherModelIdFixtures.ModelId
    }
    const back = JSON.parse(JSON.stringify(params)) as CypherQueryParams
    assert.equal(back.modelId, CypherModelIdFixtures.ModelId)
    assert.deepEqual(back, params)
})

test('protocol package version is 0.8.0', () =>
{
    const url = new URL(CypherModelIdFixtures.PackageJson, import.meta.url)
    const pkg = JSON.parse(readFileSync(url, 'utf8')) as { version: string }
    assert.equal(pkg.version, CypherModelIdFixtures.ExpectedVersion)
})

test('cypher contract carries its execute wire method name', () =>
{
    assert.equal(CypherProtocol.Execute.method, 'cypher/execute')
})

test('app write status wire values are stable', () =>
{
    assert.deepEqual(
        [AppWriteStatus.Applied, AppWriteStatus.Conflict, AppWriteStatus.Denied, AppWriteStatus.Invalid, AppWriteStatus.Failed],
        ['applied', 'conflict', 'denied', 'invalid', 'failed'])
})

test('cypher execute result survives a JSON round trip', () =>
{
    const node: CypherNodeCellDto = {
        id: 'n1',
        concept: 'Component',
        label: 'Billing',
        fields: { owner: { value: 'team', definitionOrigin: 'Component', valueOrigin: 'Component' } },
        refs: { dependsOn: ['n2'] }
    }
    const dto: CypherExecuteResultDto = {
        status: AppWriteStatus.Applied,
        counts: { nodesCreated: 1, nodesDeleted: 2, relationshipsCreated: 3, relationshipsDeleted: 4, propertiesSet: 5 },
        revision: 7,
        columns: ['n', 'cnt'],
        rows: [[node, 3], [null, 0]],
        truncated: false
    }
    assert.deepEqual(JSON.parse(JSON.stringify(dto)), dto)
})
