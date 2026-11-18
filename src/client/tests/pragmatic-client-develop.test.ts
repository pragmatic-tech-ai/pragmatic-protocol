import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createMessageConnection, NullLogger } from 'vscode-jsonrpc'
import { InMemoryMessageSocket } from '../../transport/in-memory-message-socket.js'
import { WebSocketMessageReader } from '../../transport/web-socket-message-reader.js'
import { WebSocketMessageWriter } from '../../transport/web-socket-message-writer.js'
import { SolutionProtocol } from '../../contracts/solution-protocol.js'
import { StorageProtocol } from '../../contracts/storage-protocol.js'
import { BuildState } from '../../dto/wire-dtos.js'
import type { StorageChangedPayload } from '../../dto/wire-dtos.js'
import { PragmaticClient } from '../pragmatic-client.js'

const AddedChange: StorageChangedPayload = { Kind: 'added', Path: 'a.todl', IsDirectory: false }

class DevelopHarness
{
    public readonly server
    public readonly client: PragmaticClient

    public constructor()
    {
        const [serverSocket, clientSocket] = InMemoryMessageSocket.Pair()
        this.server = createMessageConnection(new WebSocketMessageReader(serverSocket), new WebSocketMessageWriter(serverSocket), NullLogger)
        this.client = PragmaticClient.CreateOverSocket(clientSocket)
    }

    public async Dispose(): Promise<void>
    {
        await this.client.DisposeAsync()
        this.server.dispose()
    }
}

test('StorageReadBytes decodes the BytesBase64 response into bytes', async () =>
{
    const h = new DevelopHarness()
    const source = Uint8Array.from([0, 1, 2, 250, 251, 255])
    h.server.onRequest(StorageProtocol.ReadBytes, () => ({ BytesBase64: Buffer.from(source).toString('base64') }))
    h.server.listen()
    const bytes = await h.client.StorageReadBytes('a.bin')
    assert.deepEqual(Array.from(bytes), Array.from(source))
    await h.Dispose()
})

test('StorageWriteBytes encodes bytes to BytesBase64 on the wire', async () =>
{
    const h = new DevelopHarness()
    let received: unknown
    h.server.onRequest(StorageProtocol.WriteBytes, params =>
    {
        received = params
    })
    h.server.listen()
    const source = Uint8Array.from([0, 1, 2, 250, 251, 255])
    await h.client.StorageWriteBytes('a.bin', source)
    assert.deepEqual(received, { Path: 'a.bin', BytesBase64: Buffer.from(source).toString('base64') })
    await h.Dispose()
})

test('Storage text, exists, delete, mkdir, rename and list map to their protocol requests', async () =>
{
    const h = new DevelopHarness()
    const seen: unknown[] = []
    h.server.onRequest(StorageProtocol.ReadText, p => { seen.push(p); return { Content: 'hi' } })
    h.server.onRequest(StorageProtocol.WriteText, p => { seen.push(p) })
    h.server.onRequest(StorageProtocol.Exists, p => { seen.push(p); return true })
    h.server.onRequest(StorageProtocol.Delete, p => { seen.push(p) })
    h.server.onRequest(StorageProtocol.CreateDirectory, p => { seen.push(p) })
    h.server.onRequest(StorageProtocol.Rename, p => { seen.push(p) })
    h.server.onRequest(StorageProtocol.List, p => { seen.push(p); return [{ Name: 'x', IsDirectory: false }] })
    h.server.listen()
    assert.equal(await h.client.StorageReadText('t.txt'), 'hi')
    await h.client.StorageWriteText('t.txt', 'body')
    assert.equal(await h.client.StorageExists('t.txt'), true)
    await h.client.StorageDelete('t.txt')
    await h.client.StorageCreateDirectory('d')
    await h.client.StorageRename('a', 'b')
    assert.deepEqual(await h.client.StorageList('d'), [{ Name: 'x', IsDirectory: false }])
    assert.deepEqual(seen, [
        { Path: 't.txt' }, { Path: 't.txt', Content: 'body' }, { Path: 't.txt' }, { Path: 't.txt' },
        { Path: 'd' }, { From: 'a', To: 'b' }, { Path: 'd' },
    ])
    await h.Dispose()
})

test('ListSolutions and SelectAuthoring map to the solution requests', async () =>
{
    const h = new DevelopHarness()
    let selected: unknown
    h.server.onRequest(SolutionProtocol.ListSolutions, () => [{ Name: 'S', Id: 's1' }])
    h.server.onRequest(SolutionProtocol.SelectAuthoring, params =>
    {
        selected = params
        return { name: 'S', members: [], buildState: BuildState.Ready }
    })
    h.server.listen()
    assert.deepEqual(await h.client.ListSolutions(), [{ Name: 'S', Id: 's1' }])
    const summary = await h.client.SelectAuthoring({ SolutionId: 's1' })
    assert.equal(summary.name, 'S')
    assert.deepEqual(selected, { SolutionId: 's1' })
    await h.Dispose()
})

test('CreateSolution sends solution/create with the name and returns the result', async () =>
{
    const h = new DevelopHarness()
    let received: unknown
    h.server.onRequest(SolutionProtocol.CreateSolution, params =>
    {
        received = params
        return { Name: 'Up', Created: true }
    })
    h.server.listen()
    const result = await h.client.CreateSolution({ Name: 'Up' })
    assert.deepEqual(received, { Name: 'Up' })
    assert.deepEqual(result, { Name: 'Up', Created: true })
    await h.Dispose()
})

test('OnStorageChanged delivers storage/changed pushes and stops after dispose', async () =>
{
    const h = new DevelopHarness()
    h.server.listen()
    const received: StorageChangedPayload[] = []
    let wake!: () => void
    let arrived = new Promise<void>(resolve => { wake = resolve })
    const sub = h.client.OnStorageChanged(change => { received.push(change); wake() })
    await h.server.sendNotification(StorageProtocol.Changed, AddedChange)
    await arrived
    assert.deepEqual(received, [AddedChange])
    sub.dispose()
    arrived = new Promise<void>(resolve => { wake = resolve })
    await h.server.sendNotification(StorageProtocol.Changed, { Kind: 'removed', Path: 'b', IsDirectory: false })
    await new Promise(resolve => setTimeout(resolve, 30))
    assert.equal(received.length, 1)
    await h.Dispose()
})
