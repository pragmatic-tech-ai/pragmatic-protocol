import type { IMessageSocket } from './message-socket.js'
import { BrowserWebSocketMessageSocket } from '../transport/browser-websocket-message-socket.js'
import type { IBrowserWebSocket } from '../transport/browser-websocket-message-socket.js'
import type { ISocketDialer } from '../client/i-socket-dialer.js'

type BrowserWebSocketConstructor = new (url: string) => IBrowserWebSocket

/** Dials a ws(s) URL over the global browser WebSocket. Auth is by same-origin cookie; no header or token is ever attached. */
export class BrowserSocketDialer implements ISocketDialer
{
    private static readonly UnavailableError = 'global WebSocket is not available in this environment'
    private static readonly OpenFailedError = 'browser web socket failed to open'
    private static readonly OpenEvent = 'open'
    private static readonly ErrorEvent = 'error'
    private static readonly CloseEvent = 'close'

    private readonly url: string

    public constructor(url: string)
    {
        this.url = url
    }

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
            ws.addEventListener(BrowserSocketDialer.OpenEvent, () =>
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
            ws.addEventListener(BrowserSocketDialer.ErrorEvent, fail)
            ws.addEventListener(BrowserSocketDialer.CloseEvent, fail)
        })
        return new BrowserWebSocketMessageSocket(ws)
    }
}
