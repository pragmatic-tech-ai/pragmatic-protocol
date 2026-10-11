import { AbstractMessageWriter } from 'vscode-jsonrpc'
import type { Message, MessageWriter } from 'vscode-jsonrpc'
import type { IMessageSocket } from './message-socket.js'

/** Writes JSON-RPC messages to an IMessageSocket as JSON text frames. */
export class WebSocketMessageWriter extends AbstractMessageWriter implements MessageWriter
{
    private readonly socket: IMessageSocket

    public constructor(socket: IMessageSocket)
    {
        super()
        this.socket = socket
    }

    public async write(msg: Message): Promise<void>
    {
        try
        {
            await this.socket.Send(JSON.stringify(msg))
        }
        catch (error)
        {
            this.fireError(error, msg, undefined)
            throw error
        }
    }

    public end(): void
    {
        // no batching; nothing to flush
    }

    public override dispose(): void
    {
        super.dispose()
    }
}
