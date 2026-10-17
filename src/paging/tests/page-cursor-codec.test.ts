import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PageCursorCodec } from '../page-cursor-codec.js'
import { CursorStaleError } from '../../dto/wire-errors.js'

class CodecFixtures
{
    private static readonly Fingerprint = 'abc/+=fp'
    private static readonly SymbolHeavy = '???>>>~~~'

    public static Fp(): string
    {
        return CodecFixtures.Fingerprint
    }

    public static Symbols(): string
    {
        return CodecFixtures.SymbolHeavy
    }

    public static B64(text: string): string
    {
        return Buffer.from(text).toString('base64url')
    }
}

test('round-trips offset and fingerprint', () =>
{
    const cursor = { offset: 1500, fingerprint: CodecFixtures.Fp() }
    assert.deepEqual(PageCursorCodec.Decode(PageCursorCodec.Encode(cursor)), cursor)
})

test('encodes as base64url (no + / =)', () =>
{
    const text = PageCursorCodec.Encode({ offset: 3, fingerprint: CodecFixtures.Symbols() })
    assert.match(text, /^[A-Za-z0-9_-]+$/)
})

test('decodes garbage to undefined', () =>
{
    const garbage = [
        '%%%',
        '',
        CodecFixtures.B64('not json'),
        CodecFixtures.B64('{"offset":"x","fingerprint":"f"}'),
        CodecFixtures.B64('{"offset":-1,"fingerprint":"f"}'),
        CodecFixtures.B64('{"offset":1.5,"fingerprint":"f"}'),
        CodecFixtures.B64('{"offset":1}'),
        CodecFixtures.B64('null')
    ]
    for (const g of garbage)
    {
        assert.equal(PageCursorCodec.Decode(g), undefined, g)
    }
})

test('Code and Message of CursorStaleError', () =>
{
    assert.equal(CursorStaleError.Code, -32032)
    assert.equal(CursorStaleError.Message, 'cursor is stale or invalid')
})
