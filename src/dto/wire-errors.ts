/** The JSON-RPC error a server returns when a paging cursor is stale, tampered, or belongs to a different query. */
export class CursorStaleError
{
    public static readonly Code = -32032
    public static readonly Message = 'cursor is stale or invalid'
}
