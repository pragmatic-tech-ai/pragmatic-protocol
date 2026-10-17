export interface IHeartbeatSocket
{
    ping(): void
    terminate(): void
    on(event: string, listener: () => void): void
}

/** Pings watched sockets each interval and terminates any that missed the previous interval's pong. */
export class HeartbeatMonitor
{
    private static readonly PongEvent = 'pong'
    private static readonly CloseEvent = 'close'

    private readonly intervalMs: number
    private readonly alive = new Map<IHeartbeatSocket, boolean>()
    private timer: NodeJS.Timeout | undefined

    public constructor(intervalMs: number)
    {
        this.intervalMs = intervalMs
    }

    public Watch(socket: IHeartbeatSocket): void
    {
        this.alive.set(socket, true)
        socket.on(HeartbeatMonitor.PongEvent, () =>
        {
            if (this.alive.has(socket))
            {
                this.alive.set(socket, true)
            }
        })
        socket.on(HeartbeatMonitor.CloseEvent, () => this.alive.delete(socket))
    }

    public Start(): void
    {
        if (this.timer !== undefined)
        {
            return
        }
        this.timer = setInterval(() => this.TickForTest(), this.intervalMs)
        this.timer.unref()
    }

    public Stop(): void
    {
        if (this.timer !== undefined)
        {
            clearInterval(this.timer)
            this.timer = undefined
        }
        this.alive.clear()
    }

    public TickForTest(): void
    {
        for (const [socket, wasAlive] of [...this.alive])
        {
            if (!wasAlive)
            {
                this.Drop(socket)
                continue
            }
            this.alive.set(socket, false)
            try
            {
                socket.ping()
            }
            catch
            {
                this.Drop(socket)
            }
        }
    }

    private Drop(socket: IHeartbeatSocket): void
    {
        this.alive.delete(socket)
        try
        {
            socket.terminate()
        }
        catch
        {
            // terminating an already-dead socket is harmless
        }
    }

    public WatchedCountForTest(): number
    {
        return this.alive.size
    }
}
