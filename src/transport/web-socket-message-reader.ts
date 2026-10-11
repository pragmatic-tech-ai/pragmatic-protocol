import { AbstractMessageReader } from 'vscode-jsonrpc'
import type { DataCallback, Disposable, Message, MessageReader } from 'vscode-jsonrpc'
import type { IMessageSocket } from './message-socket.js'

/** Reads JSON-RPC messages off an IMessageSocket; one text frame = one Message. */
export class WebSocketMessageReader extends AbstractMessageReader implements MessageReader
{
    private readonly socket: IMessageSocket

    public constructor(socket: IMessageSocket)
    {
        super()
        this.socket = socket
    }

    public listen(callback: DataCallback): Disposable
    {
        this.socket.OnError(error => this.fireError(error))
        this.socket.OnClose(() => this.fireClose())
        this.socket.OnMessage(json =>
        {
            let message: Message
            try
            {
                message = JSON.parse(json) as Message
            }
            catch (error)
            {
                this.fireError(error)
                return
            }
            callback(message)
        })
        return { dispose: () => { /* socket lifetime is owned by its creator */ } }
    }
}
