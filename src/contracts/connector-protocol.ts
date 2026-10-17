import { RequestType, RequestType0 } from 'vscode-jsonrpc'
import type { ConnectorModelDto, ConnectorPrepareParams, ConnectorReadParams, ConnectorWriteBackParams, ConnectorTestParams, EntityDto, Page, FlushOutcomeDto, ConnectionProbeDto } from '../dto/wire-dtos.js'

/** JSON-RPC contracts for the connector surface: list/prepare/refresh/read/writeBack/test over a solution's
 *  external-datasource connectors. Each method string lives only in its declaration. */
export class ConnectorProtocol
{
    public static readonly List = new RequestType0<ConnectorModelDto[], void>('connector/list')
    public static readonly Prepare = new RequestType<ConnectorPrepareParams, void, void>('connector/prepare')
    public static readonly Refresh = new RequestType0<void, void>('connector/refresh')
    public static readonly Read = new RequestType<ConnectorReadParams, Page<EntityDto>, void>('connector/read')
    public static readonly WriteBack = new RequestType<ConnectorWriteBackParams, FlushOutcomeDto, void>('connector/writeBack')
    public static readonly Test = new RequestType<ConnectorTestParams, ConnectionProbeDto, void>('connector/test')
}
