/** WebSocket close codes this transport sends deliberately. */
export enum TransportCloseCode
{
    GoingAway = 1001,
    TryAgainLater = 1013,
}

/** Rejects a client's in-flight requests when its socket drops. Carries no payload beyond name/message. */
export class ConnectionLostError extends Error
{
    private static readonly DefaultMessage = 'connection lost'
    private static readonly Name = 'ConnectionLostError'

    public constructor(message: string = ConnectionLostError.DefaultMessage)
    {
        super(message)
        this.name = ConnectionLostError.Name
    }
}

/** The JSON-RPC error a draining server returns for requests that arrive after drain begins. */
export class DrainingError
{
    public static readonly Code = -32031
    public static readonly Message = 'server is draining'
}
