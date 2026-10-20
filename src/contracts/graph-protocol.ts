import { RequestType, RequestType0 } from 'vscode-jsonrpc'
import type { GraphContributeParamsDto, GraphCreateParamsDto, GraphDetailDto, GraphExportDto, GraphLoadParamsDto, GraphLoadedDto, GraphRefParamsDto, GraphSummaryDto } from '../dto/wire-dtos.js'

/** JSON-RPC contract for managing named graphs (create / list / get / delete / contribute) in a development environment. */
export class GraphProtocol
{
    private static readonly CreateMethod = 'graph/create'
    private static readonly ListMethod = 'graph/list'
    private static readonly GetMethod = 'graph/get'
    private static readonly DeleteMethod = 'graph/delete'
    private static readonly ContributeMethod = 'graph/contribute'
    private static readonly ExportMethod = 'graph/export'
    private static readonly LoadMethod = 'graph/load'
    private static readonly LoadedMethod = 'graph/loaded'

    public static readonly Create = new RequestType<GraphCreateParamsDto, GraphSummaryDto, void>(GraphProtocol.CreateMethod)

    public static readonly List = new RequestType0<GraphSummaryDto[], void>(GraphProtocol.ListMethod)

    public static readonly Get = new RequestType<GraphRefParamsDto, GraphDetailDto, void>(GraphProtocol.GetMethod)

    public static readonly Delete = new RequestType<GraphRefParamsDto, void, void>(GraphProtocol.DeleteMethod)

    public static readonly Contribute = new RequestType<GraphContributeParamsDto, GraphDetailDto, void>(GraphProtocol.ContributeMethod)

    public static readonly Export = new RequestType<GraphRefParamsDto, GraphExportDto, void>(GraphProtocol.ExportMethod)

    public static readonly Load = new RequestType<GraphLoadParamsDto, GraphLoadedDto, void>(GraphProtocol.LoadMethod)

    public static readonly Loaded = new RequestType0<GraphLoadedDto | null, void>(GraphProtocol.LoadedMethod)
}
