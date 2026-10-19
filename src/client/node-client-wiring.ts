import { PragmaticClient } from './pragmatic-client.js'
import type { INodeDialerFactory, ISocketDialer } from './i-socket-dialer.js'
import { WsSocketDialer } from './socket-dialer.js'

/** Node-only: wires the ws-backed dialer into PragmaticClient.ConnectAsync (static import, so bundlers see ws). */
export class NodeClientWiring implements INodeDialerFactory
{
    public static Install(): void
    {
        PragmaticClient.UseNodeDialerFactory(new NodeClientWiring())
    }

    public Create(url: string, options: { bearerToken?: string }): ISocketDialer
    {
        return new WsSocketDialer(url, options)
    }
}
