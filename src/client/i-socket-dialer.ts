import type { IMessageSocket } from '../transport/message-socket.js'

export interface ISocketDialer
{
    Dial(): Promise<IMessageSocket>
}

/** Builds a bearer-capable dialer for a URL; supplied by the Node entry so the shared client never imports ws. */
export interface INodeDialerFactory
{
    Create(url: string, options: { bearerToken?: string }): ISocketDialer
}
