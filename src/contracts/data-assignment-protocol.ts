import { RequestType } from 'vscode-jsonrpc'
import type { AssignParams, AssignResultDto } from '../dto/wire-dtos.js'

/** JSON-RPC contract for reassigning a record's owner on a bound runtime application. */
export class DataAssignmentProtocol
{
    private static readonly AssignMethod = 'data/assign'

    public static readonly Assign = new RequestType<AssignParams, AssignResultDto, void>(DataAssignmentProtocol.AssignMethod)
}
