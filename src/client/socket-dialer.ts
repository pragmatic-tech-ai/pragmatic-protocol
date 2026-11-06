import type { ClientRequest, IncomingMessage } from 'node:http'
import { WebSocket } from 'ws'
import type { IMessageSocket } from '../transport/message-socket.js'
import type { ISocketDialer } from './i-socket-dialer.js'
import { WsMessageSocket } from '../transport/ws-message-socket.js'
import { UpgradeRefusedError } from '../transport/transport-signals.js'

export type { ISocketDialer } from './i-socket-dialer.js'

/** Dials a ws URL (optional bearer) and resolves a WsMessageSocket once the socket opens. */
export class WsSocketDialer implements ISocketDialer
{
    private static readonly AuthorizationHeader = 'Authorization'
    private static readonly BearerPrefix = 'Bearer '

    private readonly url: string
    private readonly bearerToken: string | undefined

    public constructor(url: string, options: { bearerToken?: string } = {})
    {
        this.url = url
        this.bearerToken = options.bearerToken
    }

    public async Dial(): Promise<IMessageSocket>
    {
        const socketOptions = this.bearerToken === undefined
            ? undefined
            : { headers: { [WsSocketDialer.AuthorizationHeader]: WsSocketDialer.BearerPrefix + this.bearerToken } }
        const ws = new WebSocket(this.url, socketOptions)
        await new WsHandshake(ws).Await()
        return new WsMessageSocket(ws)
    }
}

/**
 * One client handshake: resolves once the socket opens; rejects once on a transport error, or with
 * UpgradeRefusedError (status + at most BodyCap received bytes of the answer, decoded as UTF-8) when the server answers a non-101.
 */
class WsHandshake
{
    private static readonly BodyCap = 4096
    private static readonly OpenEvent = 'open'
    private static readonly ErrorEvent = 'error'
    private static readonly UnexpectedResponseEvent = 'unexpected-response'
    private static readonly DataEvent = 'data'
    private static readonly EndEvent = 'end'
    private static readonly CloseEvent = 'close'

    private readonly ws: WebSocket
    private readonly chunks: Buffer[] = []
    private size = 0
    private settled = false
    private resolve: () => void = () => {}
    private reject: (error: Error) => void = () => {}
    private readonly onOpen = (): void => this.Opened()
    private readonly onError = (error: Error): void => this.Failed(error)
    private readonly onRefused = (_request: ClientRequest, response: IncomingMessage): void => this.Refused(response)

    public constructor(ws: WebSocket)
    {
        this.ws = ws
    }

    public Await(): Promise<void>
    {
        return new Promise<void>((resolve, reject) =>
        {
            this.resolve = resolve
            this.reject = reject
            this.ws.once(WsHandshake.OpenEvent, this.onOpen)
            // `on`, not `once`: it stays attached after a refusal so the terminate's abort error is never unhandled
            this.ws.on(WsHandshake.ErrorEvent, this.onError)
            this.ws.once(WsHandshake.UnexpectedResponseEvent, this.onRefused)
        })
    }

    private Opened(): void
    {
        if (this.settled)
        {
            return
        }
        this.settled = true
        this.ws.off(WsHandshake.ErrorEvent, this.onError)
        this.ws.off(WsHandshake.UnexpectedResponseEvent, this.onRefused)
        this.resolve()
    }

    private Failed(error: Error): void
    {
        if (this.settled)
        {
            return
        }
        this.settled = true
        this.ws.off(WsHandshake.OpenEvent, this.onOpen)
        this.ws.off(WsHandshake.UnexpectedResponseEvent, this.onRefused)
        this.ws.close()
        this.reject(error)
    }

    /** With this listener attached ws emits no generic error for a non-101 answer: this is its only reject path. */
    private Refused(response: IncomingMessage): void
    {
        this.ws.off(WsHandshake.OpenEvent, this.onOpen)
        const status = response.statusCode ?? 0
        response.on(WsHandshake.DataEvent, (chunk: Buffer) => this.Collect(response, status, chunk))
        response.once(WsHandshake.EndEvent, () => this.Refuse(status))
        // an error or a close before `end` refuses with the partial body; after settling both are no-ops
        response.on(WsHandshake.ErrorEvent, () => this.Refuse(status))
        response.once(WsHandshake.CloseEvent, () => this.Refuse(status))
    }

    private Collect(response: IncomingMessage, status: number, chunk: Buffer): void
    {
        if (this.settled)
        {
            return
        }
        const room = WsHandshake.BodyCap - this.size
        const kept = chunk.length > room ? chunk.subarray(0, room) : chunk
        this.chunks.push(kept)
        this.size += kept.length
        if (this.size >= WsHandshake.BodyCap)
        {
            response.destroy()
            this.Refuse(status)
        }
    }

    private Refuse(status: number): void
    {
        if (this.settled)
        {
            return
        }
        this.settled = true
        this.ws.off(WsHandshake.OpenEvent, this.onOpen)
        this.reject(new UpgradeRefusedError(status, this.Body()))
        this.ws.terminate()
    }

    /**
     * Decodes the kept bytes (at most BodyCap received bytes) as UTF-8, so the Body is at most BodyCap characters.
     * A multi-byte character cut at the cap is an incomplete tail, which a streaming decode holds back and never emits.
     */
    private Body(): string
    {
        return new TextDecoder().decode(Buffer.concat(this.chunks, this.size), { stream: true })
    }
}
