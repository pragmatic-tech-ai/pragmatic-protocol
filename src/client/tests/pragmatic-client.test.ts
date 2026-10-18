import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createMessageConnection, NullLogger } from 'vscode-jsonrpc'
import { InMemoryMessageSocket } from '../../transport/in-memory-message-socket.js'
import { WebSocketMessageReader } from '../../transport/web-socket-message-reader.js'
import { WebSocketMessageWriter } from '../../transport/web-socket-message-writer.js'
import { LanguageProtocol } from '../../contracts/language-protocol.js'
import { SolutionProtocol } from '../../contracts/solution-protocol.js'
import { CypherProtocol } from '../../contracts/cypher-protocol.js'
import { AppWriteStatus, BuildState } from '../../dto/wire-dtos.js'
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
