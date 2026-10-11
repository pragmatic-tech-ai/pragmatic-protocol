import { test } from 'node:test'
import assert from 'node:assert/strict'
import { WebSocket } from 'ws'
import { WsMessageSocket } from '../ws-message-socket.js'

class FakeWs
{
    public readyState = WebSocket.OPEN
    public lastSent: string | undefined
    private messageListener: ((data: unknown, isBinary: boolean) => void) | undefined

    public on(event: string, listener: (...args: unknown[]) => void): this
    {
        if (event === 'message')
        {
            this.messageListener = listener as (data: unknown, isBinary: boolean) => void
        }
        return this
    }

    public send(data: string, cb?: (err?: Error) => void): void
    {
        this.lastSent = data
        cb?.()
    }

    public close(): void { /* no-op */ }

    public Deliver(data: unknown): void
    {
        this.messageListener?.(data, false)
    }
}

test('normalises Buffer, Buffer[] and ArrayBuffer frames to text', () =>
{
    const fake = new FakeWs()
    const socket = new WsMessageSocket(fake as unknown as WebSocket)
    const seen: string[] = []
    socket.OnMessage(json => seen.push(json))
    fake.Deliver(Buffer.from('a', 'utf8'))
    fake.Deliver([Buffer.from('b', 'utf8'), Buffer.from('c', 'utf8')])
    fake.Deliver(new TextEncoder().encode('d').buffer)
    assert.deepEqual(seen, ['a', 'bc', 'd'])
})

test('send rejects when the socket is not open', async () =>
{
    const fake = new FakeWs()
    fake.readyState = WebSocket.CONNECTING
    const socket = new WsMessageSocket(fake as unknown as WebSocket)
    await assert.rejects(socket.Send('x'))
})

test('send forwards the text when the socket is open', async () =>
{
    const fake = new FakeWs()
    const socket = new WsMessageSocket(fake as unknown as WebSocket)
    await socket.Send('payload')
    assert.equal(fake.lastSent, 'payload')
})
