import type { IMessageSocket } from './message-socket.js'

/** Structural slice of the DOM WebSocket this adapter needs, so no DOM lib or Node ws is required. */
export interface IBrowserWebSocket
{
    readonly readyState: number
    send(data: string): void
    close(code?: number): void
    addEventListener(type: string, listener: (event: any) => void): void
}

/** Adapts a browser (global) WebSocket to IMessageSocket: text frames in/out, readyState-guarded sends. */
export class BrowserWebSocketMessageSocket implements IMessageSocket
{
    public static readonly OpenState = 1

    private static readonly NotOpenError = 'web socket is not open'
    private static readonly SendFailedError = 'web socket send failed'
    private static readonly SocketError = 'web socket error'
    private static readonly MessageEvent = 'message'
    private static readonly ErrorEvent = 'error'
    private static readonly CloseEvent = 'close'

    private readonly ws: IBrowserWebSocket

    public constructor(ws: IBrowserWebSocket)
    {
        this.ws = ws
    }

    public Send(json: string): Promise<void>
    {
        if (this.ws.readyState !== BrowserWebSocketMessageSocket.OpenState)
        {
            return Promise.reject(new Error(BrowserWebSocketMessageSocket.NotOpenError))
        }
        try
        {
            this.ws.send(json)
            return Promise.resolve()
        }
        catch
        {
            return Promise.reject(new Error(BrowserWebSocketMessageSocket.SendFailedError))
        }
    }

    public OnMessage(handler: (json: string) => void): void
    {
        this.ws.addEventListener(BrowserWebSocketMessageSocket.MessageEvent, event =>
        {
            if (typeof event.data === 'string')
            {
                handler(event.data)
            }
        })
    }

    public OnError(handler: (error: Error) => void): void
    {
        this.ws.addEventListener(BrowserWebSocketMessageSocket.ErrorEvent, () => handler(new Error(BrowserWebSocketMessageSocket.SocketError)))
    }

    public OnClose(handler: () => void): void
    {
        this.ws.addEventListener(BrowserWebSocketMessageSocket.CloseEvent, () => handler())
    }

    public Close(): void
    {
        this.ws.close()
    }
}
