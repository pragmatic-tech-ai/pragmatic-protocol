import { RequestType, RequestType0, NotificationType } from 'vscode-jsonrpc'
import type { ActiveSolutionSummary, OpenSolutionParams, SolutionGraphChangePayload } from '../dto/wire-dtos.js'

/** JSON-RPC contracts for solution lifecycle + the graph-changed push notification. */
export class SolutionProtocol
{
    public static readonly OpenSolution = new RequestType<OpenSolutionParams, ActiveSolutionSummary, void>('solution/open')
    public static readonly ActiveSolution = new RequestType0<ActiveSolutionSummary | null, void>('solution/active')
    public static readonly GraphChanged = new NotificationType<SolutionGraphChangePayload>('solution/graphChanged')
}
