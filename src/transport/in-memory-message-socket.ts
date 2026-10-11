import type { IMessageSocket } from './message-socket.js'

/** An in-process IMessageSocket; Pair() cross-wires two for offline transport tests. */
export class InMemoryMessageSocket implements IMessageSocket
{
    private messageHandler: ((json: string) => void) | undefined
    private closeHandler: (() => void) | undefined
    private peer: InMemoryMessageSocket | undefined
    private closed = false

    public static Pair(): [IMessageSocket, IMessageSocket]
    {
        const a = new InMemoryMessageSocket()
        const b = new InMemoryMessageSocket()
        a.peer = b
        b.peer = a
        return [a, b]
    }

    public Send(json: string): Promise<void>
    {
        if (this.closed)
        {
            return Promise.reject(new Error(InMemoryMessageSocket.ClosedError))
        }
        const peer = this.peer
        setImmediate(() =>
        {
            peer?.messageHandler?.(json)
        })
        return Promise.resolve()
    }

    public OnMessage(handler: (json: string) => void): void
    {
        this.messageHandler = handler
    }

    public OnError(_handler: (error: Error) => void): void
    {
        // in-memory transport raises no asynchronous errors
    }

    public OnClose(handler: () => void): void
    {
        this.closeHandler = handler
    }

    public Close(): void
    {
        if (this.closed)
        {
            return
        }
        this.closed = true
        this.closeHandler?.()
        const peer = this.peer
        if (peer !== undefined && !peer.closed)
        {
            peer.Close()
        }
    }

    private static readonly ClosedError = 'socket is closed'
}
