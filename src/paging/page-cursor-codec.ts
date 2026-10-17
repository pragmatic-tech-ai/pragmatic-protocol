/** The decoded content of an opaque paging cursor. */
export interface PageCursor
{
    offset: number
    fingerprint: string
}

/** Encodes and decodes the opaque cursor strings carried by paged requests. */
export class PageCursorCodec
{
    private static readonly Encoding = 'base64url'
    private static readonly TextEncoding = 'utf8'

    public static Encode(cursor: PageCursor): string
    {
        const payload: PageCursor = { offset: cursor.offset, fingerprint: cursor.fingerprint }
        return Buffer.from(JSON.stringify(payload)).toString(PageCursorCodec.Encoding)
    }

    /** Returns undefined for anything that is not a well-formed cursor; never throws. */
    public static Decode(text: string): PageCursor | undefined
    {
        try
        {
            if (typeof text !== 'string' || text.length === 0)
            {
                return undefined
            }
            const parsed: unknown = JSON.parse(Buffer.from(text, PageCursorCodec.Encoding).toString(PageCursorCodec.TextEncoding))
            if (typeof parsed !== 'object' || parsed === null)
            {
                return undefined
            }
            const candidate = parsed as { offset?: unknown, fingerprint?: unknown }
            if (typeof candidate.offset !== 'number' || !Number.isInteger(candidate.offset) || candidate.offset < 0)
            {
                return undefined
            }
            if (typeof candidate.fingerprint !== 'string')
            {
                return undefined
            }
            return { offset: candidate.offset, fingerprint: candidate.fingerprint }
        }
        catch
        {
            return undefined
        }
    }
}
