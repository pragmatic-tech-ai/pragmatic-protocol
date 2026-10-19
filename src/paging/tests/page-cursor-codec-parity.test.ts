import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PageCursorCodec } from '../page-cursor-codec.js'

test('Encode matches the legacy Buffer base64url output for non-ASCII input, unpadded with url-safe chars', () =>
{
    const cursor = { offset: 7, fingerprint: 'пример~~??>>日本語' }
    const legacy = Buffer.from(JSON.stringify({ offset: cursor.offset, fingerprint: cursor.fingerprint })).toString('base64url')
    const encoded = PageCursorCodec.Encode(cursor)
    assert.equal(encoded, legacy)
    assert.ok(!encoded.includes('='))
    assert.ok(/[-_]/.test(encoded))
    assert.deepEqual(PageCursorCodec.Decode(encoded), cursor)
})

test('Decode returns undefined (never throws) for malformed input', () =>
{
    const malformed = [
        '',
        '!!!',
        'a',
        '%%%%',
        'e30',
        Buffer.from('not json').toString('base64url'),
        Buffer.from('[1]').toString('base64url'),
        Buffer.from('{"offset":-1,"fingerprint":"x"}').toString('base64url'),
    ]
    for (const bad of malformed)
    {
        assert.equal(PageCursorCodec.Decode(bad), undefined, bad)
    }
})
