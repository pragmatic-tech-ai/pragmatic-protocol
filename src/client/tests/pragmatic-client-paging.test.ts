import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createMessageConnection, NullLogger, ResponseError } from 'vscode-jsonrpc'
import type { MessageConnection } from 'vscode-jsonrpc'
import { InMemoryMessageSocket } from '../../transport/in-memory-message-socket.js'
import { WebSocketMessageReader } from '../../transport/web-socket-message-reader.js'
import { WebSocketMessageWriter } from '../../transport/web-socket-message-writer.js'
import { SolutionProtocol } from '../../contracts/solution-protocol.js'
import { CypherProtocol } from '../../contracts/cypher-protocol.js'
import { ConnectorProtocol } from '../../contracts/connector-protocol.js'
import { ModelProtocol } from '../../contracts/model-protocol.js'
import { BuildState } from '../../dto/wire-dtos.js'
import type { IMessageSocket } from '../../transport/message-socket.js'
import type { ISocketDialer } from '../socket-dialer.js'
import { PragmaticClient } from '../pragmatic-client.js'

class PagingHarness
{
    public static readonly StaleCode = -32032
    public readonly server: MessageConnection
    public readonly client: PragmaticClient

    public constructor()
    {
        const [serverSocket, clientSocket] = InMemoryMessageSocket.Pair()
        this.server = createMessageConnection(new WebSocketMessageReader(serverSocket), new WebSocketMessageWriter(serverSocket), NullLogger)
        this.client = PragmaticClient.CreateOverSocket(clientSocket)
    }

    public async Close(): Promise<void>
    {
        await this.client.DisposeAsync()
        this.server.dispose()
    }
}

class ReconnectPair
{
    public readonly connection: MessageConnection
    public readonly clientSocket: IMessageSocket

    public constructor()
    {
        const [serverSocket, clientSocket] = InMemoryMessageSocket.Pair()
        this.clientSocket = clientSocket
        this.connection = createMessageConnection(new WebSocketMessageReader(serverSocket), new WebSocketMessageWriter(serverSocket), NullLogger)
        this.connection.listen()
    }
}

class PagingDialer implements ISocketDialer
{
    private readonly pairs: ReconnectPair[] = []

    public async Dial(): Promise<IMessageSocket>
    {
        const pair = new ReconnectPair()
        this.pairs.push(pair)
        return pair.clientSocket
    }

    public DropLatest(): void
    {
        this.pairs[this.pairs.length - 1]!.clientSocket.Close()
    }

    public LatestServer(): MessageConnection
    {
        return this.pairs[this.pairs.length - 1]!.connection
    }
}

test('QueryAll walks every page by cursor', async () =>
{
    const h = new PagingHarness()
    const cursors: Array<string | undefined> = []
    const replies = [
        { columns: ['a'], items: [[1]], truncated: false, nextCursor: 'c1' },
        { columns: ['a'], items: [[2]], truncated: false, nextCursor: 'c2' },
        { columns: ['a'], items: [[3]], truncated: false },
    ]
    h.server.onRequest(CypherProtocol.Query, params =>
    {
        cursors.push(params.cursor)
        return replies[cursors.length - 1]!
    })
    h.server.listen()
    const pages = []
    for await (const page of h.client.QueryAll('MATCH (n) RETURN n'))
    {
        pages.push(page)
    }
    assert.equal(pages.length, 3)
    assert.deepEqual(cursors, [undefined, 'c1', 'c2'])
    await h.Close()
})

test('QueryAll carries modelId on every page request', async () =>
{
    const h = new PagingHarness()
    const modelIds: Array<string | undefined> = []
    const replies = [
        { columns: ['a'], items: [[1]], truncated: false, nextCursor: 'c1' },
        { columns: ['a'], items: [[2]], truncated: false },
    ]
    h.server.onRequest(CypherProtocol.Query, params =>
    {
        modelIds.push(params.modelId)
        return replies[modelIds.length - 1]!
    })
    h.server.listen()
    for await (const _ of h.client.QueryAll('MATCH (n) RETURN n', undefined, undefined, 'm1'))
    {
        // drain
    }
    assert.deepEqual(modelIds, ['m1', 'm1'])
    await h.Close()
})

test('ReadAll and ModelViewAll forward pageSize', async () =>
{
    const h = new PagingHarness()
    const readSizes: Array<number | undefined> = []
    const viewSizes: Array<number | undefined> = []
    h.server.onRequest(ConnectorProtocol.Read, params =>
    {
        readSizes.push(params.pageSize)
        return params.cursor === undefined ? { items: [], nextCursor: 'r1' } : { items: [] }
    })
    h.server.onRequest(ModelProtocol.ModelView, params =>
    {
        viewSizes.push(params.pageSize)
        return params.cursor === undefined ? { items: [], nextCursor: 'v1' } as never : { items: [] } as never
    })
    h.server.listen()
    let reads = 0
    for await (const _ of h.client.ReadAll('m', 'Person', 25))
    {
        reads++
    }
    let views = 0
    for await (const _ of h.client.ModelViewAll('mem', 40))
    {
        views++
    }
    assert.equal(reads, 2)
    assert.equal(views, 2)
    assert.deepEqual(readSizes, [25, 25])
    assert.deepEqual(viewSizes, [40, 40])
    await h.Close()
})

test('a stale cursor error surfaces to the caller', async () =>
{
    const h = new PagingHarness()
    let calls = 0
    h.server.onRequest(CypherProtocol.Query, () =>
    {
        calls++
        if (calls === 2)
        {
            throw new ResponseError(PagingHarness.StaleCode, 'cursor is stale or invalid')
        }
        return { columns: ['a'], items: [[1]], truncated: false, nextCursor: 'c1' }
    })
    h.server.listen()
    await assert.rejects(async () =>
    {
        for await (const _ of h.client.QueryAll('MATCH (n) RETURN n'))
        {
            // drain
        }
    }, (error: unknown) => (error as ResponseError<unknown>).code === PagingHarness.StaleCode)
    assert.equal(calls, 2)
    await h.Close()
})

test('OnBuildStateChanged receives solution/buildStateChanged and survives reconnect', async () =>
{
    const dialer = new PagingDialer()
    const client = await PragmaticClient.ConnectReconnecting(dialer, { reconnect: { initialDelayMs: 0, factor: 2, maxDelayMs: 0 }, schedule: (_ms, fn) => fn() })
    const seen: BuildState[] = []
    client.OnBuildStateChanged(p => seen.push(p.buildState))
    await dialer.LatestServer().sendNotification(SolutionProtocol.BuildStateChanged, { buildState: BuildState.Building })
    await new Promise(resolve => setTimeout(resolve, 20))
    dialer.DropLatest()
    await new Promise(resolve => setImmediate(resolve))
    await dialer.LatestServer().sendNotification(SolutionProtocol.BuildStateChanged, { buildState: BuildState.Ready })
    await new Promise(resolve => setTimeout(resolve, 20))
    assert.deepEqual(seen, [BuildState.Building, BuildState.Ready])
    await client.DisposeAsync()
})
