import { RequestType, RequestType0, NotificationType } from 'vscode-jsonrpc'
import type { ActiveSolutionSummary, BuildStateChangedPayload, OpenSolutionParams, SelectAuthoringParams, SolutionGraphChangePayload, SolutionSummaryDto } from '../dto/wire-dtos.js'

/** JSON-RPC contracts for solution lifecycle + the graph-changed push notification. */
export class SolutionProtocol
{
    public static readonly OpenSolution = new RequestType<OpenSolutionParams, ActiveSolutionSummary, void>('solution/open')
    public static readonly ActiveSolution = new RequestType0<ActiveSolutionSummary | null, void>('solution/active')
    public static readonly ListSolutions = new RequestType0<SolutionSummaryDto[], void>('solution/list')
    public static readonly SelectAuthoring = new RequestType<SelectAuthoringParams, ActiveSolutionSummary, void>('solution/selectAuthoring')
    public static readonly GraphChanged = new NotificationType<SolutionGraphChangePayload>('solution/graphChanged')
    public static readonly BuildStateChanged = new NotificationType<BuildStateChangedPayload>('solution/buildStateChanged')
}
