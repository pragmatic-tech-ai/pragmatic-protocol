import { test } from 'node:test'
import assert from 'node:assert/strict'
import { GraphProtocol } from '../contracts/graph-protocol.js'
import { PragmaticClient } from '../client/pragmatic-client.js'
import type { GraphContributeParamsDto } from '../dto/wire-dtos.js'

class GraphContractFixture
{
    public static async BarrelNames(): Promise<string[]>
    {
        const node = await import('../index.js')
        const browser = await import('../browser.js')
        return [node, browser].map(barrel => typeof (barrel as Record<string, unknown>).GraphProtocol)
    }
}

test('graph contract carries its wire method names', () =>
{
    assert.equal(GraphProtocol.Create.method, 'graph/create')
    assert.equal(GraphProtocol.List.method, 'graph/list')
    assert.equal(GraphProtocol.Get.method, 'graph/get')
    assert.equal(GraphProtocol.Delete.method, 'graph/delete')
    assert.equal(GraphProtocol.Contribute.method, 'graph/contribute')
})

test('both barrels re-export GraphProtocol', async () =>
{
    assert.deepEqual(await GraphContractFixture.BarrelNames(), ['function', 'function'])
})

test('ContributeGraph forwards to GraphProtocol.Contribute', async () =>
{
    const sent: { type: unknown; params: unknown }[] = []
    const detail = { name: 'g', description: '', packages: [], createdAt: '' }
    const connection = { sendRequest: (type: unknown, params: unknown) => { sent.push({ type, params }); return Promise.resolve(detail) } }
    const client = Object.create(PragmaticClient.prototype) as Record<string, unknown>
    client.connection = connection
    client.lost = { promise: new Promise(() => {}) }
    const params: GraphContributeParamsDto = { graphName: 'g', solutionId: 's', packages: [{ id: 'p', version: '1.0.0', modelJson: '{}' }] }
    const result = await (client as unknown as PragmaticClient).ContributeGraph(params)
    assert.equal(sent.length, 1)
    assert.equal(sent[0].type, GraphProtocol.Contribute)
    assert.equal(sent[0].params, params)
    assert.equal(result, detail)
})
