import type { IMessageSocket } from './message-socket.js'

/** Wraps an IMessageSocket so several listeners (JSON-RPC reader + client bookkeeping) can share its message/close events. */
export class MultiplexMessageSocket implements IMessageSocket
{
    private readonly inner: IMessageSocket
    private readonly messageHandlers: Array<(json: string) => void> = []
    private readonly closeHandlers: Array<() => void> = []

    public constructor(inner: IMessageSocket)
    {
        this.inner = inner
        inner.OnMessage(json =>
        {
            for (const handler of [...this.messageHandlers])
            {
                handler(json)
            }
        })
        inner.OnClose(() =>
        {
            for (const handler of [...this.closeHandlers])
            {
                handler()
            }
        })
    }

    public Send(json: string): Promise<void>
    {
        return this.inner.Send(json)
    }

    public OnMessage(handler: (json: string) => void): void
    {
        this.messageHandlers.push(handler)
    }

    public OnError(handler: (error: Error) => void): void
    {
        this.inner.OnError(handler)
    }

    public OnClose(handler: () => void): void
    {
        this.closeHandlers.push(handler)
    }

    public Close(): void
    {
        this.inner.Close()
    }
}
