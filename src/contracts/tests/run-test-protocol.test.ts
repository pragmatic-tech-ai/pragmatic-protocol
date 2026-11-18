import { test } from 'node:test'
import assert from 'node:assert/strict'
import { RequestType } from 'vscode-jsonrpc'
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
