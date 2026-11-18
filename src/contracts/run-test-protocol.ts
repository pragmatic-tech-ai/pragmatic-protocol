import { RequestType } from 'vscode-jsonrpc'
import type { AppDeployResultDto, CypherAppDeployParamsDto } from '../dto/wire-dtos.js'

/** JSON-RPC contract for loading a build into an environment's run/test runtime (distinct from a deploy). */
export class RunTestProtocol
{
    private static readonly LoadMethod = 'runtime/run-test'

    public static readonly Load = new RequestType<CypherAppDeployParamsDto, AppDeployResultDto, void>(RunTestProtocol.LoadMethod)
}
