import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createMessageConnection, NullLogger, RequestType } from 'vscode-jsonrpc'
import { InMemoryMessageSocket } from '../in-memory-message-socket.js'
import { WebSocketMessageReader } from '../web-socket-message-reader.js'
import { WebSocketMessageWriter } from '../web-socket-message-writer.js'

const Echo = new RequestType<{ value: string }, string, void>('test/echo')

test('a request round-trips over the reader/writer pair', async () =>
{
    const [serverSocket, clientSocket] = InMemoryMessageSocket.Pair()
    const server = createMessageConnection(new WebSocketMessageReader(serverSocket), new WebSocketMessageWriter(serverSocket), NullLogger)
    const client = createMessageConnection(new WebSocketMessageReader(clientSocket), new WebSocketMessageWriter(clientSocket), NullLogger)
    server.onRequest(Echo, params => params.value.toUpperCase())
    server.listen()
    client.listen()
    const result = await client.sendRequest(Echo, { value: 'hello' })
    assert.equal(result, 'HELLO')
    server.dispose()
    client.dispose()
})

test('a malformed frame surfaces as onError, not a throw', async () =>
{
    const [a] = InMemoryMessageSocket.Pair()
    const reader = new WebSocketMessageReader(a)
    let errored = false
    reader.onError(() => { errored = true })
    reader.listen(() => { throw new Error('should not be called for a bad frame') })
    // deliver a non-JSON frame directly to the reader's message handler
    ;(a as unknown as { messageHandler?: (json: string) => void }).messageHandler?.('not json{')
    assert.equal(errored, true)
})
