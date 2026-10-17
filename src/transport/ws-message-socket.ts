import { WebSocket } from 'ws'
import type { RawData } from 'ws'
import type { IMessageSocket } from './message-socket.js'
import { BackpressurePolicy, BackpressureAction } from './backpressure-policy.js'
import { TransportCloseCode } from './transport-signals.js'

export interface WsMessageSocketOptions
{
    policy?: BackpressurePolicy
    now?: () => number
    onShed?: () => void
    onSoft?: () => void
}

/** Adapts a ws WebSocket to IMessageSocket: text frames in/out, readyState-guarded sends, optional shed backpressure. */
export class WsMessageSocket implements IMessageSocket
{
    private static readonly NotOpenError = 'web socket is not open'
    private static readonly ShedError = 'web socket shed: outbound buffer over the hard limit'

    private readonly ws: WebSocket
    private readonly policy: BackpressurePolicy | undefined
    private readonly now: () => number
    private readonly onShed: (() => void) | undefined
    private readonly onSoft: (() => void) | undefined
    private overHardSince: number | undefined
    private shed = false

    public constructor(ws: WebSocket, options: WsMessageSocketOptions = {})
    {
        this.ws = ws
        this.policy = options.policy
        this.now = options.now ?? (() => Date.now())
        this.onShed = options.onShed
        this.onSoft = options.onSoft
    }

    public Send(json: string): Promise<void>
    {
        if (this.ws.readyState !== WebSocket.OPEN)
        {
            return Promise.reject(new Error(WsMessageSocket.NotOpenError))
        }
        if (this.policy !== undefined)
        {
            const assessment = this.policy.Assess(this.ws.bufferedAmount, this.overHardSince, this.now())
            this.overHardSince = assessment.overHardSince
            if (assessment.action === BackpressureAction.Warn)
            {
                this.onSoft?.()
            }
            if (assessment.action === BackpressureAction.Shed)
            {
                this.Shed()
                return Promise.reject(new Error(WsMessageSocket.ShedError))
            }
        }
        return new Promise((resolve, reject) =>
        {
            this.ws.send(json, error => (error ? reject(error) : resolve()))
        })
    }

    private Shed(): void
    {
        if (this.shed)
        {
            return
        }
        this.shed = true
        try
        {
            this.ws.close(TransportCloseCode.TryAgainLater)
        }
        catch
        {
            // a close that throws must not stop the terminate/onShed path, and must not escape Send synchronously
        }
        this.ws.terminate()
        this.onShed?.()
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
}
