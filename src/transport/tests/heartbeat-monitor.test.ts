import { test } from 'node:test'
import assert from 'node:assert/strict'
import { HeartbeatMonitor } from '../heartbeat-monitor.js'

class FakeSocket
{
    public pings = 0
    public terminated = false
    private pong: (() => void) | undefined
    private closeHandler: (() => void) | undefined

    public ping(): void { this.pings++ }
    public terminate(): void { this.terminated = true }

    public on(event: string, listener: () => void): void
    {
        if (event === 'pong') { this.pong = listener }
        if (event === 'close') { this.closeHandler = listener }
    }

    public Pong(): void { this.pong?.() }
    public Close(): void { this.closeHandler?.() }
}

test('a non-ponging socket is terminated on the second tick; a ponging one survives', () =>
{
    const monitor = new HeartbeatMonitor(30000)
    const alive = new FakeSocket()
    const dead = new FakeSocket()
    monitor.Watch(alive)
    monitor.Watch(dead)

    monitor.TickForTest()
    assert.equal(alive.pings, 1)
    assert.equal(dead.pings, 1)
    alive.Pong()

    monitor.TickForTest()
    assert.equal(dead.terminated, true)
    assert.equal(alive.terminated, false)
    assert.equal(monitor.WatchedCountForTest(), 1)
})

test('a closed socket is dropped and never pinged again', () =>
{
    const monitor = new HeartbeatMonitor(30000)
    const socket = new FakeSocket()
    monitor.Watch(socket)
    socket.Close()
    assert.equal(monitor.WatchedCountForTest(), 0)
    monitor.TickForTest()
    assert.equal(socket.pings, 0)
})
