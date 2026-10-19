import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { BrowserSocketDialer } from '../../client/browser-socket-dialer.js'
import { BrowserWebSocketMessageSocket } from '../browser-websocket-message-socket.js'
import { PragmaticClient } from '../../client/pragmatic-client.js'
import { ConnectionLostError } from '../transport-signals.js'

class FakeBrowserWebSocket
{
    public static Instances: FakeBrowserWebSocket[] = []
    public static FailOpen = false
    public readyState = 0
    public closeCalls = 0
    public sent: string[] = []
    public constructorArgs: unknown[]
    private readonly listeners = new Map<string, Array<(event: { data?: unknown }) => void>>()

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

    public addEventListener(type: string, listener: (event: { data?: unknown }) => void): void
    {
        const list = this.listeners.get(type) ?? []
        list.push(listener)
        this.listeners.set(type, list)
    }

    public send(data: string): void { this.sent.push(data) }

    public close(): void
    {
        this.closeCalls++
        this.readyState = 3
    }

    public Emit(type: string, event: unknown): void
    {
        for (const listener of this.listeners.get(type) ?? [])
        {
            listener(event as { data?: unknown })
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
        FakeBrowserWebSocket.FailOpen = false
        this.Assign(FakeBrowserWebSocket)
    }

    public Restore(): void
    {
        this.Assign(this.original)
    }

    public Assign(value: unknown): void
    {
        const holder = globalThis as { WebSocket?: unknown }
        holder.WebSocket = value
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
        assert.ok(FakeBrowserWebSocket.Instances[0].closeCalls >= 1)
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
        await new Promise(resolve => setImmediate(resolve))
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

test('dial without a global WebSocket rejects with a clear unavailable error', async () =>
{
    const scope = new GlobalWebSocketScope()
    scope.Install()
    scope.Assign(undefined)
    try
    {
        await assert.rejects(new BrowserSocketDialer('wss://t/ws').Dial(), /WebSocket is not available/)
    }
    finally { scope.Restore() }
})

test('OnError and OnClose forward socket events', () =>
{
    const fake = new FakeBrowserWebSocket()
    const socket = new BrowserWebSocketMessageSocket(fake)
    const errors: Error[] = []
    let closed = 0
    socket.OnError(error => errors.push(error))
    socket.OnClose(() => { closed++ })
    fake.Emit('error', {})
    fake.Emit('close', {})
    assert.equal(errors.length, 1)
    assert.ok(errors[0] instanceof Error && errors[0].message.length > 0)
    assert.equal(closed, 1)
})

test('non-text frames are dropped, text frames delivered', () =>
{
    const fake = new FakeBrowserWebSocket()
    const socket = new BrowserWebSocketMessageSocket(fake)
    const received: string[] = []
    socket.OnMessage(json => received.push(json))
    fake.Emit('message', { data: new ArrayBuffer(4) })
    fake.Emit('message', { data: 'ok' })
    assert.deepEqual(received, ['ok'])
})

test('ConnectAsync without an installed Node dialer fails with a clear Node-only error', async () =>
{
    const client = PragmaticClient as unknown as { nodeDialerFactory: unknown }
    const saved = client.nodeDialerFactory
    client.nodeDialerFactory = undefined
    try
    {
        await assert.rejects(PragmaticClient.ConnectAsync('ws://x'), /Node-only connect/)
    }
    finally { client.nodeDialerFactory = saved }
})

class BrowserGraphScanner
{
    private static readonly ImportPattern = /(?:\bfrom\s*|\bimport\s*\(?\s*)(['"])([^'"]+)\1/g
    private static readonly BufferPattern = /\bBuffer\b/
    private static readonly JsSuffix = /\.js$/

    public readonly Files = new Set<string>()
    public readonly Specifiers: string[] = []
    public readonly BufferFiles: string[] = []

    public static Extract(text: string): string[]
    {
        return [...text.matchAll(BrowserGraphScanner.ImportPattern)].map(match => match[2])
    }

    public Scan(entry: string): void
    {
        const queue = [entry]
        while (queue.length > 0)
        {
            const file = queue.pop()!
            if (this.Files.has(file))
            {
                continue
            }
            this.Files.add(file)
            const text = readFileSync(file, 'utf8')
            if (BrowserGraphScanner.BufferPattern.test(text))
            {
                this.BufferFiles.push(file)
            }
            for (const specifier of BrowserGraphScanner.Extract(text))
            {
                this.Specifiers.push(specifier)
                if (specifier.startsWith('.'))
                {
                    const target = resolve(dirname(file), specifier.replace(BrowserGraphScanner.JsSuffix, '.ts'))
                    assert.ok(existsSync(target), target)
                    queue.push(target)
                }
            }
        }
    }
}

test('the browser entry reaches no ws, no Buffer, and includes the browser classes', () =>
{
    const srcRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
    const scanner = new BrowserGraphScanner()
    scanner.Scan(resolve(srcRoot, 'browser.ts'))
    assert.ok(!scanner.Specifiers.includes('ws'))
    assert.ok(!scanner.Specifiers.some(specifier => specifier.startsWith('node:')))
    assert.deepEqual(scanner.BufferFiles, [])
    const names = [...scanner.Files].map(file => file.split('\\').join('/'))
    assert.ok(names.some(name => name.endsWith('/client/browser-socket-dialer.ts')))
    assert.ok(names.some(name => name.endsWith('/transport/browser-websocket-message-socket.ts')))
    assert.ok(names.some(name => name.endsWith('/client/pragmatic-client.ts')))
    assert.ok(!names.some(name => name.endsWith('/client/socket-dialer.ts')))
    assert.ok(!names.some(name => name.endsWith('/client/node-client-wiring.ts')))
})

test('the scanner catches dynamic literal and double-quoted ws imports', () =>
{
    const found = BrowserGraphScanner.Extract(["await import('ws')", 'import("ws")', 'from "ws"', "import('ws')"].join('\n'))
    assert.deepEqual(found, ['ws', 'ws', 'ws', 'ws'])
})
