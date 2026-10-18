import { RequestType } from 'vscode-jsonrpc'
import type { CypherQueryParams, CypherQueryPageDto, CypherExecuteParams, CypherExecuteResultDto } from '../dto/wire-dtos.js'

/** JSON-RPC contract for running a TODL Cypher query (read) or write statement (execute) against a solution's model. */
export class CypherProtocol
{
    private static readonly QueryMethod = 'cypher/query'
    private static readonly ExecuteMethod = 'cypher/execute'

    public static readonly Query = new RequestType<CypherQueryParams, CypherQueryPageDto, void>(CypherProtocol.QueryMethod)
    public static readonly Execute = new RequestType<CypherExecuteParams, CypherExecuteResultDto, void>(CypherProtocol.ExecuteMethod)
}
