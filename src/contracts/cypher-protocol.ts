import { RequestType } from 'vscode-jsonrpc'
import type { CypherQueryParams, CypherQueryResultDto } from '../dto/wire-dtos.js'

/** JSON-RPC contract for running a TODL Cypher query against a solution's model. */
export class CypherProtocol
{
    private static readonly QueryMethod = 'cypher/query'

    public static readonly Query = new RequestType<CypherQueryParams, CypherQueryResultDto, void>(CypherProtocol.QueryMethod)
}
