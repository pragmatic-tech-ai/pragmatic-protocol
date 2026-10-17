import { WebSocket } from 'ws'
import type { IMessageSocket } from '../transport/message-socket.js'
import { WsMessageSocket } from '../transport/ws-message-socket.js'

export interface ISocketDialer
{
    Dial(): Promise<IMessageSocket>
}

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
        await new Promise<void>((resolve, reject) =>
        {
            const onOpen = () => { ws.off('error', onError); resolve() }
            const onError = (error: Error) => { ws.off('open', onOpen); ws.close(); reject(error) }
            ws.once('open', onOpen)
            ws.once('error', onError)
        })
        return new WsMessageSocket(ws)
    }
}
