import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createMessageConnection, NullLogger } from 'vscode-jsonrpc'
import { InMemoryMessageSocket } from '../../transport/in-memory-message-socket.js'
import { WebSocketMessageReader } from '../../transport/web-socket-message-reader.js'
import { WebSocketMessageWriter } from '../../transport/web-socket-message-writer.js'
import { LanguageProtocol } from '../../contracts/language-protocol.js'
import { SolutionProtocol } from '../../contracts/solution-protocol.js'
import { PragmaticClient } from '../pragmatic-client.js'

test('client sends a typed request and receives the typed result', async () =>
{
    const [serverSocket, clientSocket] = InMemoryMessageSocket.Pair()
    const server = createMessageConnection(new WebSocketMessageReader(serverSocket), new WebSocketMessageWriter(serverSocket), NullLogger)
    server.onRequest(SolutionProtocol.OpenSolution, params => ({ name: params.location, members: [] }))
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
    client.OnDiagnostics(params => received.push(params.uri))
    await server.sendNotification(LanguageProtocol.PublishDiagnostics, { uri: 'file:///a.todl', diagnostics: [] })
    await new Promise(resolve => setImmediate(resolve))
    assert.deepEqual(received, ['file:///a.todl'])
    await client.DisposeAsync()
    server.dispose()
})
