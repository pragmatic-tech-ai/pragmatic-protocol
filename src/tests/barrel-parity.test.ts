import { test } from 'node:test'
import assert from 'node:assert/strict'

class BarrelParity
{
    public static async MissingFromNode(): Promise<string[]>
    {
        const browser = await import('../browser.js')
        const node = await import('../index.js')
        const nodeNames = new Set(Object.keys(node))
        return Object.keys(browser).filter(name => !nodeNames.has(name))
    }
}

test('every runtime export of the browser barrel is also exported by the node barrel', async () =>
{
    assert.deepEqual(await BarrelParity.MissingFromNode(), [])
})
