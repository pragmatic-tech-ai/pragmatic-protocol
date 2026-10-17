import { test } from 'node:test'
import assert from 'node:assert/strict'
import { WebSocket } from 'ws'
import { WsMessageSocket } from '../ws-message-socket.js'
import { BackpressurePolicy } from '../backpressure-policy.js'

class FakeWs
{
    public readyState = WebSocket.OPEN
    public lastSent: string | undefined
    public bufferedAmount = 0
    public closedCode: number | undefined
    public terminated = false
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

    public close(code?: number): void { this.closedCode = code }

    public terminate(): void { this.terminated = true }

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
    assert.equal(fake.lastSent, undefined)
})

test('send forwards the text when the socket is open', async () =>
{
    const fake = new FakeWs()
    const socket = new WsMessageSocket(fake as unknown as WebSocket)
    await socket.Send('payload')
    assert.equal(fake.lastSent, 'payload')
})

test('passes a string frame through unchanged', () =>
{
    const fake = new FakeWs()
    const socket = new WsMessageSocket(fake as unknown as WebSocket)
    const seen: string[] = []
    socket.OnMessage(json => seen.push(json))
    fake.Deliver('hello')
    assert.deepEqual(seen, ['hello'])
})

test('sheds (close TryAgainLater + terminate) only after the buffer stays over hard past the grace window', async () =>
{
    const fake = new FakeWs()
    let clock = 0
    const socket = new WsMessageSocket(fake as unknown as WebSocket, { policy: new BackpressurePolicy(1000, 8000, 5000), now: () => clock })
    fake.bufferedAmount = 9000
    await socket.Send('a')
    assert.equal(fake.closedCode, undefined)
    fake.bufferedAmount = 500
    clock = 10000
    await socket.Send('b')
    assert.equal(fake.closedCode, undefined)
    fake.bufferedAmount = 9000
    clock = 20000
    await socket.Send('c')
    clock = 26000
    await assert.rejects(socket.Send('d'))
    assert.equal(fake.closedCode, 1013)
    assert.equal(fake.terminated, true)
})
