import { WebSocket } from 'ws'
import type { RawData } from 'ws'
import type { IMessageSocket } from './message-socket.js'

/** Adapts a ws WebSocket to IMessageSocket: text frames in/out, readyState-guarded sends. */
export class WsMessageSocket implements IMessageSocket
{
    private readonly ws: WebSocket

    public constructor(ws: WebSocket)
    {
        this.ws = ws
    }

    public Send(json: string): Promise<void>
    {
        if (this.ws.readyState !== WebSocket.OPEN)
        {
            return Promise.reject(new Error(WsMessageSocket.NotOpenError))
        }
        return new Promise((resolve, reject) =>
        {
            this.ws.send(json, error => (error ? reject(error) : resolve()))
        })
    }

    public OnMessage(handler: (json: string) => void): void
    {
        this.ws.on('message', (data: RawData) => handler(WsMessageSocket.ToText(data)))
    }

    public OnError(handler: (error: Error) => void): void
    {
        this.ws.on('error', handler)
    }

    public OnClose(handler: () => void): void
    {
        this.ws.on('close', handler)
    }

    public Close(): void
    {
        this.ws.close()
    }

    private static ToText(data: RawData): string
    {
        if (typeof data === 'string')
        {
            return data
        }
        if (Array.isArray(data))
        {
            return Buffer.concat(data).toString('utf8')
        }
        if (data instanceof ArrayBuffer)
        {
            return Buffer.from(data).toString('utf8')
        }
        return (data as Buffer).toString('utf8')
    }

    private static readonly NotOpenError = 'web socket is not open'
}
