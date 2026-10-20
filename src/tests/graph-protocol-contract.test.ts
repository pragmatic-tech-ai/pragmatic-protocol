import { test } from 'node:test'
import assert from 'node:assert/strict'
import { GraphProtocol } from '../contracts/graph-protocol.js'

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
})

test('both barrels re-export GraphProtocol', async () =>
{
    assert.deepEqual(await GraphContractFixture.BarrelNames(), ['function', 'function'])
})
