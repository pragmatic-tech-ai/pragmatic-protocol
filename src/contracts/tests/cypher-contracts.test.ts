import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { CypherNodeCellDto, CypherQueryResultDto } from '../../dto/wire-dtos.js'
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

    public static Result(): CypherQueryResultDto
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
            rows: [[node, 3], [{ nested: [node] }, null]],
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
