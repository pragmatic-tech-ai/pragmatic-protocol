import { test } from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createServer } from 'node:http'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import type { Duplex } from 'node:stream'
import { setTimeout as delay } from 'node:timers/promises'
import { WebSocketServer } from 'ws'
import { ConnectionError, ConnectionErrors, createMessageConnection, NullLogger } from 'vscode-jsonrpc'
import { ConnectionLostError, UpgradeRefusedError } from '../../transport/transport-signals.js'
import { ConnectionState } from '../connection-state.js'
import { NodeClientWiring } from '../node-client-wiring.js'
import { InMemoryMessageSocket } from '../../transport/in-memory-message-socket.js'
import { WebSocketMessageReader } from '../../transport/web-socket-message-reader.js'
import { WebSocketMessageWriter } from '../../transport/web-socket-message-writer.js'
import { LanguageProtocol } from '../../contracts/language-protocol.js'
import { SolutionProtocol } from '../../contracts/solution-protocol.js'
import { CypherProtocol } from '../../contracts/cypher-protocol.js'
import { ConnectorProtocol } from '../../contracts/connector-protocol.js'
import { AppWriteStatus, BuildState, ConnectorFilterOp } from '../../dto/wire-dtos.js'
import type { CypherExecuteResultDto, CypherQueryPageDto } from '../../dto/wire-dtos.js'
import { PragmaticClient } from '../pragmatic-client.js'

test('client sends a typed request and receives the typed result', async () =>
{
    const [serverSocket, clientSocket] = InMemoryMessageSocket.Pair()
    const server = createMessageConnection(new WebSocketMessageReader(serverSocket), new WebSocketMessageWriter(serverSocket), NullLogger)
    server.onRequest(SolutionProtocol.OpenSolution, params => ({ name: params.location, members: [], buildState: BuildState.Ready }))
    server.listen()
    const client = PragmaticClient.CreateOverSocket(clientSocket)
    const summary = await client.OpenSolution('/solutions/demo')
    assert.equal(summary.name, '/solutions/demo')
    assert.deepEqual(summary.members, [])
    await client.DisposeAsync()
    server.dispose()
})

test('client receives a diagnostics push notification', async () =>
{
    const [serverSocket, clientSocket] = InMemoryMessageSocket.Pair()
    const server = createMessageConnection(new WebSocketMessageReader(serverSocket), new WebSocketMessageWriter(serverSocket), NullLogger)
    server.listen()
    const client = PragmaticClient.CreateOverSocket(clientSocket)
    const received: string[] = []
    const arrived = new Promise<void>(resolve => client.OnDiagnostics(params =>
    {
        received.push(params.uri)
        resolve()
    }))
    await server.sendNotification(LanguageProtocol.PublishDiagnostics, { uri: 'file:///a.todl', diagnostics: [] })
    await arrived
    assert.deepEqual(received, ['file:///a.todl'])
    await client.DisposeAsync()
    server.dispose()
})

test('client CypherQuery sends the query and receives the result DTO', async () =>
{
    const stub: CypherQueryPageDto = { columns: ['a.name'], items: [['Alice'], ['Bob']], truncated: false }
    const [serverSocket, clientSocket] = InMemoryMessageSocket.Pair()
    const server = createMessageConnection(new WebSocketMessageReader(serverSocket), new WebSocketMessageWriter(serverSocket), NullLogger)
    let received: unknown
    server.onRequest(CypherProtocol.Query, params =>
    {
        received = params
        return stub
    })
    server.listen()
    const client = PragmaticClient.CreateOverSocket(clientSocket)
    const result = await client.CypherQuery('MATCH (a) RETURN a.name')
    assert.deepEqual(result, stub)
    assert.deepEqual(received, { cypher: 'MATCH (a) RETURN a.name' })
    await client.DisposeAsync()
    server.dispose()
})

test('client CypherQuery carries modelId', async () =>
{
    const stub: CypherQueryPageDto = { columns: ['a.name'], items: [['Alice'], ['Bob']], truncated: false }
    const [serverSocket, clientSocket] = InMemoryMessageSocket.Pair()
    const server = createMessageConnection(new WebSocketMessageReader(serverSocket), new WebSocketMessageWriter(serverSocket), NullLogger)
    let received: unknown
    server.onRequest(CypherProtocol.Query, params =>
    {
        received = params
        return stub
    })
    server.listen()
    const client = PragmaticClient.CreateOverSocket(clientSocket)
    const result = await client.CypherQuery('MATCH (a) RETURN a.name', undefined, undefined, 'm1')
    assert.deepEqual(result, stub)
    assert.deepEqual(received, { cypher: 'MATCH (a) RETURN a.name', modelId: 'm1' })
    await client.DisposeAsync()
    server.dispose()
})

test('client CypherExecute routes to cypher/execute with its params', async () =>
{
    const stub: CypherExecuteResultDto = {
        status: AppWriteStatus.Applied,
        counts: { nodesCreated: 1, nodesDeleted: 0, relationshipsCreated: 0, relationshipsDeleted: 0, propertiesSet: 2 },
        revision: 5,
        columns: [],
        rows: [],
        truncated: false
    }
    const [serverSocket, clientSocket] = InMemoryMessageSocket.Pair()
    const server = createMessageConnection(new WebSocketMessageReader(serverSocket), new WebSocketMessageWriter(serverSocket), NullLogger)
    let received: unknown
    server.onRequest(CypherProtocol.Execute, params =>
    {
        received = params
        return stub
    })
    server.listen()
    const client = PragmaticClient.CreateOverSocket(clientSocket)
    const result = await client.CypherExecute('CREATE (n:A)', { x: 1 }, 'm1', 4)
    assert.deepEqual(result, stub)
    assert.deepEqual(received, { cypher: 'CREATE (n:A)', parameters: { x: 1 }, modelId: 'm1', expectedRevision: 4 })
    await client.DisposeAsync()
    server.dispose()
})

test('client CypherExecute drops omitted optionals from the wire payload', async () =>
{
    const stub: CypherExecuteResultDto = {
        status: AppWriteStatus.Applied,
        counts: { nodesCreated: 0, nodesDeleted: 0, relationshipsCreated: 0, relationshipsDeleted: 0, propertiesSet: 0 },
        revision: 1,
        columns: [],
        rows: [],
        truncated: false
    }
    const [serverSocket, clientSocket] = InMemoryMessageSocket.Pair()
    const server = createMessageConnection(new WebSocketMessageReader(serverSocket), new WebSocketMessageWriter(serverSocket), NullLogger)
    let received: unknown
    server.onRequest(CypherProtocol.Execute, params =>
    {
        received = params
        return stub
    })
    server.listen()
    const client = PragmaticClient.CreateOverSocket(clientSocket)
    await client.CypherExecute('CREATE (n:A)')
    assert.deepEqual(received, { cypher: 'CREATE (n:A)' })
    assert.deepEqual(Object.keys(received as object), ['cypher'])
    await client.DisposeAsync()
    server.dispose()
})

test('client CypherModels routes to cypher/models', async () =>
{
    const [serverSocket, clientSocket] = InMemoryMessageSocket.Pair()
    const server = createMessageConnection(new WebSocketMessageReader(serverSocket), new WebSocketMessageWriter(serverSocket), NullLogger)
    server.onRequest(CypherProtocol.Models, () => ({ models: ['acme.aModel', 'acme.bModel'] }))
    server.listen()
    const client = PragmaticClient.CreateOverSocket(clientSocket)
    assert.deepEqual(await client.CypherModels(), { models: ['acme.aModel', 'acme.bModel'] })
    await client.DisposeAsync()
    server.dispose()
})

test('client ConnectorDecisions routes to connector/decisions, sending canonical only when given', async () =>
{
    const [serverSocket, clientSocket] = InMemoryMessageSocket.Pair()
    const server = createMessageConnection(new WebSocketMessageReader(serverSocket), new WebSocketMessageWriter(serverSocket), NullLogger)
    const received: unknown[] = []
    server.onRequest(ConnectorProtocol.Decisions, params =>
    {
        received.push(params)
        return [{ canonical: 'c1', member: 'name', source: 'crm.people', winningNode: 'n1' }]
    })
    server.listen()
    const client = PragmaticClient.CreateOverSocket(clientSocket)
    assert.equal((await client.ConnectorDecisions('m')).length, 1)
    await client.ConnectorDecisions('m', 'c1')
    assert.deepEqual(received, [{ modelId: 'm' }, { modelId: 'm', canonical: 'c1' }])
    await client.DisposeAsync()
    server.dispose()
})

test('client ReadEntitiesPage routes to connector/readPage and carries where only when given', async () =>
{
    const [serverSocket, clientSocket] = InMemoryMessageSocket.Pair()
    const server = createMessageConnection(new WebSocketMessageReader(serverSocket), new WebSocketMessageWriter(serverSocket), NullLogger)
    const received: unknown[] = []
    server.onRequest(ConnectorProtocol.ReadPage, params =>
    {
        received.push(params)
        return { items: [] }
    })
    server.listen()
    const client = PragmaticClient.CreateOverSocket(clientSocket)
    await client.ReadEntitiesPage('m', 'shop.Customer', { pageSize: 5 })
    await client.ReadEntitiesPage('m', 'shop.Customer', undefined, [{ field: 'region', op: ConnectorFilterOp.In, values: ['eu'] }])
    assert.deepEqual(received, [
        { modelId: 'm', concept: 'shop.Customer', pageSize: 5 },
        { modelId: 'm', concept: 'shop.Customer', where: [{ field: 'region', op: 'in', values: ['eu'] }] },
    ])
    await client.DisposeAsync()
    server.dispose()
})

class RealWsFixture
{
    public static readonly Loopback = '127.0.0.1'
    public static readonly RefusedStatus = 503
    public static readonly RefusedBody = '{"error":"console-not-registered"}'
    public static readonly RefusedError = 'console-not-registered'
    public static readonly RefusedMessage = 'Unexpected server response: 503'
    public static readonly RetiredCode = 4003
    public static readonly BodyCap = 4096
    public static readonly OverCapLength = 20000
    public static readonly AsciiFiller = 'x'
    public static readonly MultiByteChar = '€'
    public static readonly MissingBytes = 100
    public static readonly SettleMs = 100

    public static Url(address: AddressInfo): string
    {
        return `ws://${RealWsFixture.Loopback}:${address.port}`
    }

    public static Connect(url: string): Promise<PragmaticClient>
    {
        NodeClientWiring.Install()
        return PragmaticClient.ConnectAsync(url)
    }

    public static async UntilClosed(client: PragmaticClient): Promise<void>
    {
        if (client.State() === ConnectionState.Closed)
        {
            return
        }
        await new Promise<void>(resolve =>
        {
            const watch = client.OnStateChanged(state =>
            {
                if (state === ConnectionState.Closed)
                {
                    watch.dispose()
                    resolve()
                }
            })
        })
    }
}

/** An HTTP server that answers every upgrade request with a raw non-101 response. */
class RefusingServer
{
    private static readonly StatusLine = 'HTTP/1.1 {status} Refused'
    private static readonly StatusToken = '{status}'
    private static readonly Crlf = '\r\n'
    private static readonly ContentTypeHeader = 'Content-Type: application/json'
    private static readonly ContentLengthHeader = 'Content-Length: '
    private static readonly ConnectionCloseHeader = 'Connection: close'

    private readonly server: Server

    /** `missingBytes` > 0 declares a longer Content-Length than is sent, so the body ends prematurely. */
    public constructor(status: number, body: string, missingBytes: number = 0)
    {
        this.server = createServer()
        this.server.on('upgrade', (_request, socket: Duplex) =>
        {
            socket.on('error', () => { /* the client may hang up mid-body */ })
            const bytes = Buffer.from(body, 'utf8')
            const head = [
                RefusingServer.StatusLine.replace(RefusingServer.StatusToken, String(status)),
                RefusingServer.ContentTypeHeader,
                RefusingServer.ContentLengthHeader + String(bytes.length + missingBytes),
                RefusingServer.ConnectionCloseHeader,
            ].join(RefusingServer.Crlf)
            socket.write(head + RefusingServer.Crlf + RefusingServer.Crlf)
            socket.end(bytes)
        })
    }

    public async Start(): Promise<string>
    {
        this.server.listen(0, RealWsFixture.Loopback)
        await once(this.server, 'listening')
        return RealWsFixture.Url(this.server.address() as AddressInfo)
    }

    public async Stop(): Promise<void>
    {
        this.server.closeAllConnections()
        await new Promise<void>(resolve => this.server.close(() => resolve()))
    }
}

enum CloseMoment
{
    Never,
    OnConnect,
    OnFirstMessage,
}

/** A real ws server that closes each connection with a given code at a given moment. */
class ClosingServer
{
    private readonly server: WebSocketServer

    public constructor(moment: CloseMoment, code: number)
    {
        this.server = new WebSocketServer({ port: 0, host: RealWsFixture.Loopback })
        this.server.on('connection', ws =>
        {
            if (moment === CloseMoment.OnConnect)
            {
                ws.close(code)
            }
            if (moment === CloseMoment.OnFirstMessage)
            {
                ws.once('message', () => ws.close(code))
            }
        })
    }

    public async Start(): Promise<string>
    {
        await once(this.server, 'listening')
        return RealWsFixture.Url(this.server.address() as AddressInfo)
    }

    public async Stop(): Promise<void>
    {
        for (const ws of this.server.clients)
        {
            ws.terminate()
        }
        await new Promise<void>(resolve => this.server.close(() => resolve()))
    }
}

/** Records every uncaught exception and unhandled rejection while armed. */
class UnhandledWatch
{
    public readonly Seen: unknown[] = []
    private readonly listener = (error: unknown): void => { this.Seen.push(error) }

    public Arm(): void
    {
        process.on('uncaughtException', this.listener)
        process.on('unhandledRejection', this.listener)
    }

    public Disarm(): void
    {
        process.off('uncaughtException', this.listener)
        process.off('unhandledRejection', this.listener)
    }
}

test('a refused upgrade rejects with its status and body', async () =>
{
    const server = new RefusingServer(RealWsFixture.RefusedStatus, RealWsFixture.RefusedBody)
    const url = await server.Start()
    try
    {
        const error = await RealWsFixture.Connect(url).then(() => undefined, (caught: unknown) => caught)
        assert.ok(error instanceof UpgradeRefusedError)
        assert.equal(error.Status, RealWsFixture.RefusedStatus)
        assert.equal(JSON.parse(error.Body).error, RealWsFixture.RefusedError)
        assert.equal(error.message, RealWsFixture.RefusedMessage)
    }
    finally
    {
        await server.Stop()
    }
})

test('a refused upgrade with an over-cap body keeps at most the cap and leaves no unhandled error', async () =>
{
    const server = new RefusingServer(RealWsFixture.RefusedStatus, RealWsFixture.AsciiFiller.repeat(RealWsFixture.OverCapLength))
    const url = await server.Start()
    const watch = new UnhandledWatch()
    watch.Arm()
    try
    {
        const error = await RealWsFixture.Connect(url).then(() => undefined, (caught: unknown) => caught)
        assert.ok(error instanceof UpgradeRefusedError)
        assert.equal(error.Status, RealWsFixture.RefusedStatus)
        assert.equal(error.Body, RealWsFixture.AsciiFiller.repeat(RealWsFixture.BodyCap))
        assert.equal(error.Body.length, RealWsFixture.BodyCap)
        await delay(RealWsFixture.SettleMs)
        assert.deepEqual(watch.Seen, [])
    }
    finally
    {
        watch.Disarm()
        await server.Stop()
    }
})

test('a refused upgrade with a multi-byte character cut at the cap drops the cut character', async () =>
{
    // 4095 ASCII bytes, then a 3-byte character straddling the cap, then more bytes past it
    const lead = RealWsFixture.AsciiFiller.repeat(RealWsFixture.BodyCap - 1)
    const body = lead + RealWsFixture.MultiByteChar.repeat(RealWsFixture.OverCapLength)
    const server = new RefusingServer(RealWsFixture.RefusedStatus, body)
    const url = await server.Start()
    const watch = new UnhandledWatch()
    watch.Arm()
    try
    {
        const error = await RealWsFixture.Connect(url).then(() => undefined, (caught: unknown) => caught)
        assert.ok(error instanceof UpgradeRefusedError)
        assert.ok(error.Body.length <= RealWsFixture.BodyCap)
        assert.equal(error.Body, lead)
        await delay(RealWsFixture.SettleMs)
        assert.deepEqual(watch.Seen, [])
    }
    finally
    {
        watch.Disarm()
        await server.Stop()
    }
})

test('a refused upgrade whose body ends prematurely rejects with the partial body', async () =>
{
    const server = new RefusingServer(RealWsFixture.RefusedStatus, RealWsFixture.RefusedBody, RealWsFixture.MissingBytes)
    const url = await server.Start()
    const watch = new UnhandledWatch()
    watch.Arm()
    try
    {
        const error = await RealWsFixture.Connect(url).then(() => undefined, (caught: unknown) => caught)
        assert.ok(error instanceof UpgradeRefusedError)
        assert.equal(error.Status, RealWsFixture.RefusedStatus)
        assert.equal(error.Body, RealWsFixture.RefusedBody)
        await delay(RealWsFixture.SettleMs)
        assert.deepEqual(watch.Seen, [])
    }
    finally
    {
        watch.Disarm()
        await server.Stop()
    }
})

test('a server close keeps its code', async () =>
{
    const server = new ClosingServer(CloseMoment.OnFirstMessage, RealWsFixture.RetiredCode)
    const url = await server.Start()
    try
    {
        const client = await RealWsFixture.Connect(url)
        await assert.rejects(client.CypherModels(), ConnectionLostError)
        assert.equal(client.CloseCode(), RealWsFixture.RetiredCode)
        assert.equal(client.State(), ConnectionState.Closed)
        await client.DisposeAsync()
    }
    finally
    {
        await server.Stop()
    }
})

test('a server close before a request is sent rejects that request as closed', async () =>
{
    const server = new ClosingServer(CloseMoment.OnConnect, RealWsFixture.RetiredCode)
    const url = await server.Start()
    try
    {
        const client = await RealWsFixture.Connect(url)
        await RealWsFixture.UntilClosed(client)
        await assert.rejects(client.CypherModels(), (error: unknown) => error instanceof ConnectionError && error.code === ConnectionErrors.Closed)
        assert.equal(client.CloseCode(), RealWsFixture.RetiredCode)
        await client.DisposeAsync()
    }
    finally
    {
        await server.Stop()
    }
})

test('an open client has no close code', async () =>
{
    const server = new ClosingServer(CloseMoment.Never, RealWsFixture.RetiredCode)
    const url = await server.Start()
    try
    {
        const client = await RealWsFixture.Connect(url)
        assert.equal(client.CloseCode(), undefined)
        await client.DisposeAsync()
    }
    finally
    {
        await server.Stop()
    }
})
