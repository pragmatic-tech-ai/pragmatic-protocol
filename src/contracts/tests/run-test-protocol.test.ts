import { test } from 'node:test'
import assert from 'node:assert/strict'
import { RequestType, createMessageConnection, NullLogger } from 'vscode-jsonrpc'
import { InMemoryMessageSocket } from '../../transport/in-memory-message-socket.js'
import { WebSocketMessageReader } from '../../transport/web-socket-message-reader.js'
import { WebSocketMessageWriter } from '../../transport/web-socket-message-writer.js'
import { PragmaticClient } from '../../client/pragmatic-client.js'
import { AppWriteStatus } from '../../dto/wire-dtos.js'
import { RunTestProtocol } from '../run-test-protocol.js'
import { ApplicationDeployProtocol } from '../pragmatic-app-deploy-protocol.js'
import type { AppDeployResultDto, CypherAppDeployParamsDto } from '../../dto/wire-dtos.js'

test('run-test contract exposes the runtime/run-test method, distinct from application/deploy', () =>
{
    assert.equal(RunTestProtocol.Load.method, 'runtime/run-test')
    assert.notEqual(RunTestProtocol.Load.method, ApplicationDeployProtocol.Deploy.method)
})

test('run-test Load is typed over the deploy params and result DTOs', () =>
{
    const load: RequestType<CypherAppDeployParamsDto, AppDeployResultDto, void> = RunTestProtocol.Load
    assert.ok(load instanceof RequestType)
})

test('client LoadRunTest sends runtime/run-test with the given params', async () =>
{
    const [serverSocket, clientSocket] = InMemoryMessageSocket.Pair()
    const server = createMessageConnection(new WebSocketMessageReader(serverSocket), new WebSocketMessageWriter(serverSocket), NullLogger)
    const params: CypherAppDeployParamsDto = {
        appName: 'orders', appVersion: '1.0.0', packages: [], uiBundle: [],
        manifest: { name: 'orders', version: '1.0.0', packages: [], ui: { entry: 'index.html', assets: ['index.html'] } },
    }
    let seen: CypherAppDeployParamsDto | undefined
    server.onRequest(RunTestProtocol.Load, p =>
    {
        seen = p
        return { status: AppWriteStatus.Applied, appName: p.appName, appVersion: p.appVersion }
    })
    server.listen()
    const client = PragmaticClient.CreateOverSocket(clientSocket)
    try
    {
        const result = await client.LoadRunTest(params)
        assert.deepEqual(seen, params)
        assert.equal(result.status, AppWriteStatus.Applied)
        assert.equal(result.appName, 'orders')
    }
    finally
    {
        await client.DisposeAsync()
        server.dispose()
    }
})
