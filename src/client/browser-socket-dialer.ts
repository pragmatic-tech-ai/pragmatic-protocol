import type { IMessageSocket } from '../transport/message-socket.js'
import { BrowserWebSocketMessageSocket } from '../transport/browser-websocket-message-socket.js'
import type { IBrowserWebSocket } from '../transport/browser-websocket-message-socket.js'
import type { ISocketDialer } from './i-socket-dialer.js'

type BrowserWebSocketConstructor = new (url: string) => IBrowserWebSocket

/** Dials a ws(s) URL over the global browser WebSocket. Auth is by same-origin cookie; no header or token is ever attached. */
export class BrowserSocketDialer implements ISocketDialer
{
    private static readonly UnavailableError = 'global WebSocket is not available in this environment'
    private static readonly OpenFailedError = 'browser web socket failed to open'

    private readonly url: string

    public constructor(url: string)
    {
        this.url = url
    }

    // deferred: backpressure — see Project Feature
    public async Dial(): Promise<IMessageSocket>
    {
        const ctor = (globalThis as { WebSocket?: BrowserWebSocketConstructor }).WebSocket
        if (ctor === undefined)
        {
            throw new Error(BrowserSocketDialer.UnavailableError)
        }
        const ws = new ctor(this.url)
        await new Promise<void>((resolve, reject) =>
        {
            let settled = false
            ws.addEventListener(BrowserWebSocketMessageSocket.OpenEvent, () =>
            {
                settled = true
                resolve()
            })
            const fail = () =>
            {
                if (settled)
                {
                    return
                }
                settled = true
                try
                {
                    ws.close()
                }
                catch
                {
                    // the socket may already be closed
                }
                reject(new Error(BrowserSocketDialer.OpenFailedError))
            }
            ws.addEventListener(BrowserWebSocketMessageSocket.ErrorEvent, fail)
            ws.addEventListener(BrowserWebSocketMessageSocket.CloseEvent, fail)
        })
        return new BrowserWebSocketMessageSocket(ws)
    }
}
