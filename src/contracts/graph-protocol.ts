import { RequestType, RequestType0 } from 'vscode-jsonrpc'
import type { GraphCreateParamsDto, GraphDetailDto, GraphRefParamsDto, GraphSummaryDto } from '../dto/wire-dtos.js'

/** JSON-RPC contract for managing named graphs (create / list / get / delete) in a development environment. */
export class GraphProtocol
{
    private static readonly CreateMethod = 'graph/create'
    private static readonly ListMethod = 'graph/list'
    private static readonly GetMethod = 'graph/get'
    private static readonly DeleteMethod = 'graph/delete'

    public static readonly Create = new RequestType<GraphCreateParamsDto, GraphSummaryDto, void>(GraphProtocol.CreateMethod)

    public static readonly List = new RequestType0<GraphSummaryDto[], void>(GraphProtocol.ListMethod)

    public static readonly Get = new RequestType<GraphRefParamsDto, GraphDetailDto, void>(GraphProtocol.GetMethod)

    public static readonly Delete = new RequestType<GraphRefParamsDto, void, void>(GraphProtocol.DeleteMethod)
}
