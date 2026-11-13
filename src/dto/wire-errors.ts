import { ResponseError } from 'vscode-jsonrpc'

/** The JSON-RPC error a server returns when a paging cursor is stale, tampered, or belongs to a different query. */
export class CursorStaleError
{
    public static readonly Code = -32032
    public static readonly Message = 'cursor is stale or invalid'
}

/** The wire data of a DataSourceUnavailableError: the qualified TODL name (`<namespace>.<name>`) of the data source. */
export interface DataSourceUnavailableData
{
    dataSource: string
}

/**
 * The JSON-RPC error a server returns when a read needed an external data source that did not answer (e.g. its
 * database host does not resolve). The message and data name the source; the cause never reaches the wire.
 */
export class DataSourceUnavailableError
{
    public static readonly Code = -32034
    public static readonly MessageStart = 'data source unavailable: '

    /** The response error naming `dataSource`. */
    public static Create(dataSource: string): ResponseError<DataSourceUnavailableData>
    {
        return new ResponseError<DataSourceUnavailableData>(DataSourceUnavailableError.Code, DataSourceUnavailableError.MessageStart + dataSource, { dataSource })
    }

    /** The data source a DataSourceUnavailableError names (by its wire code and data); undefined for any other error. */
    public static DataSourceOf(error: unknown): string | undefined
    {
        if (typeof error !== 'object' || error === null)
        {
            return undefined
        }
        const wire = error as { code?: unknown, data?: unknown }
        if (wire.code !== DataSourceUnavailableError.Code || typeof wire.data !== 'object' || wire.data === null)
        {
            return undefined
        }
        const name = (wire.data as { dataSource?: unknown }).dataSource
        return typeof name === 'string' && name !== '' ? name : undefined
    }
}
