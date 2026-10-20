import { test } from 'node:test'
import assert from 'node:assert/strict'
import { GraphProtocol } from '../contracts/graph-protocol.js'
import { PragmaticClient } from '../client/pragmatic-client.js'
import type { GraphContributeParamsDto, GraphExportDto, GraphLoadParamsDto, GraphLoadedDto } from '../dto/wire-dtos.js'

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
    assert.equal(GraphProtocol.Export.method, 'graph/export')
    assert.equal(GraphProtocol.Load.method, 'graph/load')
    assert.equal(GraphProtocol.Loaded.method, 'graph/loaded')
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

class GraphClientFixture
{
    public static Make(result: unknown): { client: PragmaticClient; sent: { type: unknown; params: unknown }[] }
    {
        const sent: { type: unknown; params: unknown }[] = []
        const connection = { sendRequest: (type: unknown, params?: unknown) => { sent.push({ type, params }); return Promise.resolve(result) } }
        const client = Object.create(PragmaticClient.prototype) as Record<string, unknown>
        client.connection = connection
        client.lost = { promise: new Promise(() => {}) }
        return { client: client as unknown as PragmaticClient, sent }
    }
}

test('ExportGraph forwards to GraphProtocol.Export', async () =>
{
    const exported: GraphExportDto = { name: 'g', packages: [{ id: 'p', version: '1.0.0', modelJson: '{}' }] }
    const { client, sent } = GraphClientFixture.Make(exported)
    const params = { graphName: 'g' }
    const result = await client.ExportGraph(params)
    assert.equal(sent[0].type, GraphProtocol.Export)
    assert.equal(sent[0].params, params)
    assert.equal(result, exported)
})

test('LoadGraph forwards to GraphProtocol.Load', async () =>
{
    const loaded: GraphLoadedDto = { name: 'g', packages: [{ id: 'p', version: '1.0.0' }], promotedAt: 't' }
    const { client, sent } = GraphClientFixture.Make(loaded)
    const params: GraphLoadParamsDto = { graphName: 'g', packages: [{ id: 'p', version: '1.0.0', modelJson: '{}' }] }
    const result = await client.LoadGraph(params)
    assert.equal(sent[0].type, GraphProtocol.Load)
    assert.equal(sent[0].params, params)
    assert.equal(result, loaded)
})

test('GetLoadedGraph forwards to GraphProtocol.Loaded and passes null through', async () =>
{
    const { client, sent } = GraphClientFixture.Make(null)
    const result = await client.GetLoadedGraph()
    assert.equal(sent[0].type, GraphProtocol.Loaded)
    assert.equal(result, null)
})
