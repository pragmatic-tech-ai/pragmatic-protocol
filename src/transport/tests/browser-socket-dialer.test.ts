import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { BrowserSocketDialer } from '../browser-socket-dialer.js'
import { BrowserWebSocketMessageSocket } from '../browser-websocket-message-socket.js'
import { PragmaticClient } from '../../client/pragmatic-client.js'
import { ConnectionLostError } from '../transport-signals.js'

class FakeBrowserWebSocket
{
    public static Instances: FakeBrowserWebSocket[] = []
    public static FailOpen = false
    public readyState = 0
    public sent: string[] = []
    public constructorArgs: unknown[]
    private readonly listeners = new Map<string, Array<(event: unknown) => void>>()

    public constructor(...args: unknown[])
    {
        this.constructorArgs = args
        FakeBrowserWebSocket.Instances.push(this)
        queueMicrotask(() =>
        {
            if (FakeBrowserWebSocket.FailOpen)
            {
                this.readyState = 3
                this.Emit('error', {})
                this.Emit('close', {})
                return
            }
            this.readyState = 1
            this.Emit('open', {})
        })
    }

    public addEventListener(type: string, listener: (event: unknown) => void): void
    {
        const list = this.listeners.get(type) ?? []
        list.push(listener)
        this.listeners.set(type, list)
    }

    public send(data: string): void { this.sent.push(data) }

    public close(): void
    {
        this.readyState = 3
    }

    public Emit(type: string, event: unknown): void
    {
        for (const listener of this.listeners.get(type) ?? [])
        {
            listener(event)
        }
    }
}

class GlobalWebSocketScope
{
    private original: unknown

    public Install(): void
    {
        this.original = (globalThis as { WebSocket?: unknown }).WebSocket
        FakeBrowserWebSocket.Instances = []
        FakeBrowserWebSocket.FailOpen = false;
        (globalThis as { WebSocket?: unknown }).WebSocket = FakeBrowserWebSocket
    }

    public Restore(): void
    {
        (globalThis as { WebSocket?: unknown }).WebSocket = this.original
    }
}

const SecretMarker = 'S3CR3T-TOKEN'

test('dialer opens over the global WebSocket with the bare URL and no auth material', async () =>
{
    const scope = new GlobalWebSocketScope()
    scope.Install()
    try
    {
        const socket = await new BrowserSocketDialer('wss://tenant.example/ws').Dial()
        assert.ok(socket instanceof BrowserWebSocketMessageSocket)
        assert.deepEqual(FakeBrowserWebSocket.Instances[0].constructorArgs, ['wss://tenant.example/ws'])
    }
    finally { scope.Restore() }
})

test('socket sends a frame and receives a reply', async () =>
{
    const scope = new GlobalWebSocketScope()
    scope.Install()
    try
    {
        const socket = await new BrowserSocketDialer('wss://t/ws').Dial()
        const fake = FakeBrowserWebSocket.Instances[0]
        const received: string[] = []
        socket.OnMessage(json => received.push(json))
        await socket.Send('{"a":1}')
        assert.deepEqual(fake.sent, ['{"a":1}'])
        fake.Emit('message', { data: '{"reply":true}' })
        assert.deepEqual(received, ['{"reply":true}'])
    }
    finally { scope.Restore() }
})

test('open failure rejects with a clear error free of the URL/secret', async () =>
{
    const scope = new GlobalWebSocketScope()
    scope.Install()
    FakeBrowserWebSocket.FailOpen = true
    try
    {
        await assert.rejects(
            new BrowserSocketDialer('wss://t/ws?token=' + SecretMarker).Dial(),
            (error: Error) => error.message.length > 0 && !error.message.includes(SecretMarker) && /failed to open/.test(error.message))
    }
    finally { scope.Restore() }
})

test('a mid-stream close rejects a pending call instead of hanging', async () =>
{
    const scope = new GlobalWebSocketScope()
    scope.Install()
    try
    {
        const client = await PragmaticClient.ConnectReconnecting(new BrowserSocketDialer('wss://t/ws'), { schedule: () => {} })
        const fake = FakeBrowserWebSocket.Instances[0]
        const pending = client.ListApplications()
        await new Promise(resolve => setTimeout(resolve, 5))
        assert.equal(fake.sent.length, 1)
        fake.readyState = 3
        fake.Emit('close', {})
        await assert.rejects(pending, (error: Error) => error instanceof ConnectionLostError && error.message.length > 0 && !error.message.includes(SecretMarker))
    }
    finally { scope.Restore() }
})

test('Send on a closed socket rejects with a clear error', async () =>
{
    const fake = new FakeBrowserWebSocket()
    fake.readyState = 3
    await assert.rejects(new BrowserWebSocketMessageSocket(fake).Send('x'), /not open/)
})

test('the browser entry has no static import path to ws', () =>
{
    const srcRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
    const seen = new Set<string>()
    const queue = [resolve(srcRoot, 'browser.ts')]
    while (queue.length > 0)
    {
        const file = queue.pop()!
        if (seen.has(file))
        {
            continue
        }
        seen.add(file)
        const text = readFileSync(file, 'utf8')
        const specifiers = [...text.matchAll(/(?:from|import)\s+'([^']+)'/g)].map(match => match[1])
        for (const specifier of specifiers)
        {
            assert.notEqual(specifier, 'ws', file)
            if (specifier.startsWith('.'))
            {
                const target = resolve(dirname(file), specifier.replace(/\.js$/, '.ts'))
                assert.ok(existsSync(target), target)
                queue.push(target)
            }
        }
    }
    assert.ok(seen.size > 10)
})
