import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createMessageConnection, NullLogger } from 'vscode-jsonrpc'
import { InMemoryMessageSocket } from '../../transport/in-memory-message-socket.js'
import { WebSocketMessageReader } from '../../transport/web-socket-message-reader.js'
import { WebSocketMessageWriter } from '../../transport/web-socket-message-writer.js'
import { ApplicationDeployProtocol } from '../pragmatic-app-deploy-protocol.js'
import { AppWriteStatus } from '../../dto/wire-dtos.js'
import type { AppDeployResultDto, CypherAppDeployParamsDto, ServableAppManifestDto } from '../../dto/wire-dtos.js'
import { PragmaticClient } from '../../client/pragmatic-client.js'

class DeployFixtures
{
    public static readonly AppName = 'orders'
    public static readonly AppVersion = '1.2.3'

    public static Manifest(): ServableAppManifestDto
    {
        return {
            name: DeployFixtures.AppName,
            version: DeployFixtures.AppVersion,
            packages: [{ id: 'pkg.orders', version: '1.0.0' }],
            ui: { entry: 'index.html', assets: ['app.js'] },
        }
    }

    public static Params(): CypherAppDeployParamsDto
    {
        return {
            appName: DeployFixtures.AppName,
            appVersion: DeployFixtures.AppVersion,
            packages: [{ id: 'pkg.orders', version: '1.0.0', modelJson: '{}' }],
            uiBundle: [{ path: 'index.html', contentBase64: 'PGh0bWw+' }],
            manifest: DeployFixtures.Manifest(),
        }
    }
}

test('deploy contract exposes the application/deploy method', () =>
{
    assert.equal(ApplicationDeployProtocol.Deploy.method, 'application/deploy')
})

test('deploy DTOs round-trip their fields', () =>
{
    const params = DeployFixtures.Params()
    const result: AppDeployResultDto = { status: AppWriteStatus.Applied, appName: params.appName, appVersion: params.appVersion }
    const copy = JSON.parse(JSON.stringify({ params, result })) as { params: CypherAppDeployParamsDto; result: AppDeployResultDto }
    assert.deepEqual(copy.params, params)
    assert.deepEqual(copy.result, result)
    assert.equal(copy.params.manifest.ui.entry, 'index.html')
})

test('client DeployApplication sends application/deploy with the given params', async () =>
{
    const [serverSocket, clientSocket] = InMemoryMessageSocket.Pair()
    const server = createMessageConnection(new WebSocketMessageReader(serverSocket), new WebSocketMessageWriter(serverSocket), NullLogger)
    let seen: CypherAppDeployParamsDto | undefined
    server.onRequest(ApplicationDeployProtocol.Deploy, params =>
    {
        seen = params
        return { status: AppWriteStatus.Applied, appName: params.appName, appVersion: params.appVersion }
    })
    server.listen()
    const client = PragmaticClient.CreateOverSocket(clientSocket)
    try
    {
        const result = await client.DeployApplication(DeployFixtures.Params())
        assert.deepEqual(seen, DeployFixtures.Params())
        assert.equal(result.status, AppWriteStatus.Applied)
        assert.equal(result.appName, DeployFixtures.AppName)
    }
    finally
    {
        await client.DisposeAsync()
        server.dispose()
    }
})
