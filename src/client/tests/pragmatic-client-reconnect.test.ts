import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createMessageConnection, NullLogger } from 'vscode-jsonrpc'
import type { MessageConnection } from 'vscode-jsonrpc'
import { InMemoryMessageSocket } from '../../transport/in-memory-message-socket.js'
import { WebSocketMessageReader } from '../../transport/web-socket-message-reader.js'
import { WebSocketMessageWriter } from '../../transport/web-socket-message-writer.js'
import { SolutionProtocol } from '../../contracts/solution-protocol.js'
import type { IMessageSocket } from '../../transport/message-socket.js'
import type { ISocketDialer } from '../socket-dialer.js'
import { ConnectionState } from '../connection-state.js'
import { ConnectionLostError } from '../../transport/transport-signals.js'
import { PragmaticClient } from '../pragmatic-client.js'

class PairedServer
{
    public readonly connection: MessageConnection
    public readonly clientSocket: IMessageSocket

    public constructor()
    {
        const [serverSocket, clientSocket] = InMemoryMessageSocket.Pair()
        this.clientSocket = clientSocket
        this.connection = createMessageConnection(new WebSocketMessageReader(serverSocket), new WebSocketMessageWriter(serverSocket), NullLogger)
        this.connection.onRequest(SolutionProtocol.OpenSolution, params => ({ name: params.location, members: [] }))
        this.connection.listen()
    }
}

class FakeDialer implements ISocketDialer
{
    public dials = 0
    private readonly servers: PairedServer[] = []

    public async Dial(): Promise<IMessageSocket>
    {
        this.dials++
        const server = new PairedServer()
        this.servers.push(server)
        return server.clientSocket
    }

    public DropLatest(): void
    {
        this.servers[this.servers.length - 1]!.clientSocket.Close()
    }

    public LatestServer(): MessageConnection
    {
        return this.servers[this.servers.length - 1]!.connection
    }
}

test('an unexpected drop reconnects, re-dials, and the state signal fires Reconnecting then Open', async () =>
{
    const dialer = new FakeDialer()
    const states: ConnectionState[] = []
    const client = await PragmaticClient.ConnectReconnecting(dialer, { reconnect: { initialDelayMs: 0, factor: 2, maxDelayMs: 0 }, schedule: (_ms, fn) => fn() })
    client.OnStateChanged(s => states.push(s))
    assert.equal(client.State(), ConnectionState.Open)
    dialer.DropLatest()
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(dialer.dials, 2)
    assert.ok(states.includes(ConnectionState.Reconnecting))
    assert.equal(client.State(), ConnectionState.Open)
    await client.DisposeAsync()
})

test('a caller-initiated Dispose does not reconnect', async () =>
{
    const dialer = new FakeDialer()
    const client = await PragmaticClient.ConnectReconnecting(dialer, { reconnect: { initialDelayMs: 0, factor: 2, maxDelayMs: 0 }, schedule: (_ms, fn) => fn() })
    await client.DisposeAsync()
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(dialer.dials, 1)
    assert.equal(client.State(), ConnectionState.Closed)
})

test('an in-flight request rejects with ConnectionLostError when the socket drops', async () =>
{
    const dialer = new FakeDialer()
    const client = await PragmaticClient.ConnectReconnecting(dialer, { reconnect: { initialDelayMs: 0, factor: 2, maxDelayMs: 0 }, schedule: (_ms, fn) => fn() })
    const pending = client.ActiveSolution()
    dialer.DropLatest()
    await assert.rejects(pending, (error: unknown) => error instanceof ConnectionLostError)
    await client.DisposeAsync()
})

test('read-idle past readIdleMs without a socket close triggers a reconnect', async () =>
{
    const dialer = new FakeDialer()
    let clock = 0
    const queue: Array<() => void> = []
    const client = await PragmaticClient.ConnectReconnecting(dialer, {
        reconnect: { initialDelayMs: 0, factor: 2, maxDelayMs: 0 },
        readIdleMs: 1000,
        now: () => clock,
        schedule: (_ms, fn) => { queue.push(fn) },
    })
    assert.equal(dialer.dials, 1)
    clock = 5000
    queue.shift()!()
    queue.shift()!()
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(dialer.dials, 2)
    assert.equal(client.State(), ConnectionState.Open)
    await client.DisposeAsync()
})

test('resubscribes graphChanged after an unexpected drop so a push on the new connection still fires', async () =>
{
    const dialer = new FakeDialer()
    const client = await PragmaticClient.ConnectReconnecting(dialer, { reconnect: { initialDelayMs: 0, factor: 2, maxDelayMs: 0 }, schedule: (_ms, fn) => fn() })
    const seen: string[] = []
    client.OnGraphChanged(change => { for (const id of change.memberIds) { seen.push(id) } })
    dialer.DropLatest()
    await new Promise(resolve => setImmediate(resolve))
    await dialer.LatestServer().sendNotification(SolutionProtocol.GraphChanged, { memberIds: ['m1'], fileIds: [] })
    await new Promise(resolve => setTimeout(resolve, 20))
    assert.deepEqual(seen, ['m1'])
    await client.DisposeAsync()
})
