import { RequestType } from 'vscode-jsonrpc'
import type { AppDeployResultDto, CypherAppDeployParamsDto } from '../dto/wire-dtos.js'

/** JSON-RPC contract for uploading a built application (packages + UI bundle + manifest) to a tenant. */
export class ApplicationDeployProtocol
{
    private static readonly DeployMethod = 'application/deploy'

    public static readonly Deploy = new RequestType<CypherAppDeployParamsDto, AppDeployResultDto, void>(ApplicationDeployProtocol.DeployMethod)
}
