import { RequestType, RequestType0 } from 'vscode-jsonrpc'
import type { CypherQueryParams, CypherQueryPageDto, CypherExecuteParams, CypherExecuteResultDto, CypherModelListDto } from '../dto/wire-dtos.js'

/** JSON-RPC contract for running a TODL Cypher query (read) or write statement (execute) against a solution's model. */
export class CypherProtocol
{
    private static readonly QueryMethod = 'cypher/query'
    private static readonly ExecuteMethod = 'cypher/execute'
    private static readonly ModelsMethod = 'cypher/models'

    public static readonly Query = new RequestType<CypherQueryParams, CypherQueryPageDto, void>(CypherProtocol.QueryMethod)
    public static readonly Execute = new RequestType<CypherExecuteParams, CypherExecuteResultDto, void>(CypherProtocol.ExecuteMethod)
    /** The tenant's queryable model shard ids (development tenants; model-scoped queries are not available on runtime tenants). */
    public static readonly Models = new RequestType0<CypherModelListDto, void>(CypherProtocol.ModelsMethod)
}
