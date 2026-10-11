import { test } from 'node:test'
import assert from 'node:assert/strict'
import { InMemoryMessageSocket } from '../in-memory-message-socket.js'

test('a paired socket delivers each send to the other end', async () =>
{
    const [a, b] = InMemoryMessageSocket.Pair()
    const seenByB: string[] = []
    const seenByA: string[] = []
    b.OnMessage(json => seenByB.push(json))
    a.OnMessage(json => seenByA.push(json))
    await a.Send('from-a')
    await b.Send('from-b')
    await new Promise(resolve => setImmediate(resolve))
    assert.deepEqual(seenByB, ['from-a'])
    assert.deepEqual(seenByA, ['from-b'])
})

test('closing one end fires close on both ends', () =>
{
    const [a, b] = InMemoryMessageSocket.Pair()
    let aClosed = false
    let bClosed = false
    a.OnClose(() => { aClosed = true })
    b.OnClose(() => { bClosed = true })
    a.Close()
    assert.equal(aClosed, true)
    assert.equal(bClosed, true)
})
