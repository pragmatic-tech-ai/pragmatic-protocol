import { RequestType } from 'vscode-jsonrpc'
import type { AppWriteParams, AppWriteResultDto } from '../dto/wire-dtos.js'

/** JSON-RPC contract for applying a batch of writes to a bound runtime application's graph. */
export class AppDataProtocol
{
    private static readonly WriteMethod = 'data/write'

    public static readonly Write = new RequestType<AppWriteParams, AppWriteResultDto, void>(AppDataProtocol.WriteMethod)
}
