import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BackpressurePolicy, BackpressureAction } from '../backpressure-policy.js'

test('under the soft mark is no action', () =>
{
    const policy = new BackpressurePolicy(1000, 8000, 5000)
    const result = policy.Assess(500, undefined, 0)
    assert.equal(result.action, BackpressureAction.None)
    assert.equal(result.overHardSince, undefined)
})

test('between soft and hard warns but does not start the grace clock', () =>
{
    const policy = new BackpressurePolicy(1000, 8000, 5000)
    const result = policy.Assess(2000, undefined, 10)
    assert.equal(result.action, BackpressureAction.Warn)
    assert.equal(result.overHardSince, undefined)
})

test('over hard starts the grace clock but does not shed within the grace window', () =>
{
    const policy = new BackpressurePolicy(1000, 8000, 5000)
    const first = policy.Assess(9000, undefined, 100)
    assert.equal(first.action, BackpressureAction.Warn)
    assert.equal(first.overHardSince, 100)
    const within = policy.Assess(9000, first.overHardSince, 100 + 4999)
    assert.equal(within.action, BackpressureAction.Warn)
})

test('recovery under the hard limit before grace elapses clears the clock and never sheds', () =>
{
    const policy = new BackpressurePolicy(1000, 8000, 5000)
    const over = policy.Assess(9000, undefined, 0)
    const recovered = policy.Assess(500, over.overHardSince, 1000)
    assert.equal(recovered.action, BackpressureAction.None)
    assert.equal(recovered.overHardSince, undefined)
})

test('over hard continuously past the grace window sheds', () =>
{
    const policy = new BackpressurePolicy(1000, 8000, 5000)
    const over = policy.Assess(9000, undefined, 0)
    const shed = policy.Assess(9000, over.overHardSince, 5001)
    assert.equal(shed.action, BackpressureAction.Shed)
})

test('exactly at the hard limit counts as over and starts the grace clock', () =>
{
    const policy = new BackpressurePolicy(1000, 8000, 5000)
    const result = policy.Assess(8000, undefined, 0)
    assert.equal(result.action, BackpressureAction.Warn)
    assert.equal(result.overHardSince, 0)
})

test('exactly at the grace boundary sheds', () =>
{
    const policy = new BackpressurePolicy(1000, 8000, 5000)
    const result = policy.Assess(9000, 0, 5000)
    assert.equal(result.action, BackpressureAction.Shed)
})
