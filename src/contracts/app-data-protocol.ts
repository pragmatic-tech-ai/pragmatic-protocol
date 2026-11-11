import { NotificationType, RequestType } from 'vscode-jsonrpc'
import type { AppWriteParams, AppWriteResultDto, DataChangedPayload } from '../dto/wire-dtos.js'

/** JSON-RPC contract for applying a batch of writes to a bound runtime application's graph, and the data-changed push. */
export class AppDataProtocol
{
    private static readonly WriteMethod = 'data/write'
    private static readonly ChangedMethod = 'data/changed'

    public static readonly Write = new RequestType<AppWriteParams, AppWriteResultDto, void>(AppDataProtocol.WriteMethod)
    public static readonly Changed = new NotificationType<DataChangedPayload>(AppDataProtocol.ChangedMethod)
}
