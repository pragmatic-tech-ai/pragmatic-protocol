import { RequestType, RequestType0 } from 'vscode-jsonrpc'
import type { PragmaticAppSummaryDto, OpenPragmaticAppParams } from '../dto/wire-dtos.js'

/** JSON-RPC contract for listing and binding a runtime tenant's published applications. */
export class PragmaticAppProtocol
{
    private static readonly ListMethod = 'application/list'
    private static readonly OpenMethod = 'application/open'

    public static readonly List = new RequestType0<PragmaticAppSummaryDto[], void>(PragmaticAppProtocol.ListMethod)
    public static readonly Open = new RequestType<OpenPragmaticAppParams, PragmaticAppSummaryDto, void>(PragmaticAppProtocol.OpenMethod)
}
